import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server as IOServer } from 'socket.io';
import bcrypt from 'bcryptjs';
import pool, { initDb } from './db.js';
import { signToken, verifyToken, authMiddleware } from './auth.js';

const app = express();
app.use(cors());
app.use(express.json());

// ---- helpers ----------------------------------------------------------------
const q  = (text, params) => pool.query(text, params).then(r => r.rows);
const q1 = (text, params) => pool.query(text, params).then(r => r.rows[0] || null);

async function listConversationsForUser(userId) {
  return q(`
    SELECT
      c.id, c.type, c.name, c.created_at,
      json_agg(
        json_build_object('id', u.id, 'username', u.username)
        ORDER BY LOWER(u.username)
      ) AS members,
      (
        SELECT row_to_json(lm)
        FROM (
          SELECT m.content, m.created_at, mu.username
          FROM messages m
          JOIN users mu ON mu.id = m.user_id
          WHERE m.conversation_id = c.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) lm
      ) AS last_message
    FROM conversations c
    JOIN conversation_members my_m ON my_m.conversation_id = c.id AND my_m.user_id = $1
    JOIN conversation_members cm   ON cm.conversation_id   = c.id
    JOIN users u ON u.id = cm.user_id
    GROUP BY c.id
    ORDER BY COALESCE(
      (SELECT MAX(created_at) FROM messages WHERE conversation_id = c.id),
      c.created_at
    ) DESC
  `, [userId]);
}

async function getConvById(convId, userId) {
  const rows = await listConversationsForUser(userId);
  return rows.find(c => c.id === convId) || null;
}

// ---- auth -------------------------------------------------------------------
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const uname = String(username).trim();
    if (uname.length < 2 || uname.length > 24)      return res.status(400).json({ error: 'username must be 2–24 chars' });
    if (!/^[a-zA-Z0-9_.-]+$/.test(uname))           return res.status(400).json({ error: 'username: letters, numbers, _ . - only' });
    if (String(password).length < 4)                 return res.status(400).json({ error: 'password must be at least 4 chars' });

    const existing = await q1('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [uname]);
    if (existing) return res.status(409).json({ error: 'username already taken' });

    const hash = await bcrypt.hash(password, 10);
    const row  = await q1(
      'INSERT INTO users (username, password_hash, created_at) VALUES ($1, $2, $3) RETURNING id, username',
      [uname, hash, Date.now()]
    );
    res.json({ token: signToken(row), user: row });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    const row = await q1('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [String(username).trim()]);
    if (!row) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok)  return res.status(401).json({ error: 'invalid credentials' });
    const user = { id: row.id, username: row.username };
    res.json({ token: signToken(user), user });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const row = await q1('SELECT id, username FROM users WHERE id = $1', [req.user.id]);
    if (!row) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user: row });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// ---- users ------------------------------------------------------------------
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const rows = await q(
      'SELECT id, username FROM users WHERE id != $1 ORDER BY LOWER(username)',
      [req.user.id]
    );
    res.json({ users: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// ---- conversations ----------------------------------------------------------
app.get('/api/conversations', authMiddleware, async (req, res) => {
  try {
    res.json({ conversations: await listConversationsForUser(req.user.id) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

app.post('/api/conversations/dm', authMiddleware, async (req, res) => {
  try {
    const otherId = Number(req.body?.user_id);
    if (!otherId || otherId === req.user.id) return res.status(400).json({ error: 'invalid user_id' });
    const other = await q1('SELECT id FROM users WHERE id = $1', [otherId]);
    if (!other) return res.status(404).json({ error: 'user not found' });

    const existing = await q1(`
      SELECT c.id FROM conversations c
      WHERE c.type = 'dm'
        AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = c.id AND user_id = $1)
        AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = c.id AND user_id = $2)
        AND (SELECT COUNT(*) FROM conversation_members WHERE conversation_id = c.id) = 2
      LIMIT 1
    `, [req.user.id, otherId]);

    let convId = existing?.id;
    let wasCreated = false;

    if (!convId) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `INSERT INTO conversations (type, name, created_by, created_at) VALUES ('dm', NULL, $1, $2) RETURNING id`,
          [req.user.id, Date.now()]
        );
        convId = rows[0].id;
        await client.query(
          'INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
          [convId, req.user.id, otherId]
        );
        await client.query('COMMIT');
        wasCreated = true;
      } catch (e) { await client.query('ROLLBACK'); throw e; }
        finally    { client.release(); }
    }

    const conv = await getConvById(convId, req.user.id);
    if (wasCreated) notifyConversationCreated(conv);
    res.json({ conversation: conv });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

app.post('/api/conversations/group', authMiddleware, async (req, res) => {
  try {
    const name      = String(req.body?.name || '').trim();
    const memberIds = Array.isArray(req.body?.member_ids)
      ? req.body.member_ids.map(Number).filter(Boolean) : [];
    if (!name)              return res.status(400).json({ error: 'name required' });
    if (!memberIds.length)  return res.status(400).json({ error: 'add at least one other member' });

    const uniqueIds = Array.from(new Set([req.user.id, ...memberIds]));
    const found = await q(
      `SELECT id FROM users WHERE id = ANY($1::bigint[])`,
      [uniqueIds]
    );
    if (found.length !== uniqueIds.length) return res.status(400).json({ error: 'one or more members not found' });

    const client = await pool.connect();
    let convId;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO conversations (type, name, created_by, created_at) VALUES ('group', $1, $2, $3) RETURNING id`,
        [name, req.user.id, Date.now()]
      );
      convId = rows[0].id;
      for (const uid of uniqueIds) {
        await client.query(
          'INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)',
          [convId, uid]
        );
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally   { client.release(); }

    const conv = await getConvById(convId, req.user.id);
    notifyConversationCreated(conv);
    res.json({ conversation: conv });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

app.get('/api/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const convId = Number(req.params.id);
    const member = await q1(
      'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [convId, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'not a member' });

    const rows = await q(`
      SELECT m.id, m.conversation_id, m.content, m.created_at,
             u.id AS user_id, u.username
      FROM messages m
      JOIN users u ON u.id = m.user_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [convId]);
    res.json({ messages: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'server error' }); }
});

// ---- Socket.IO --------------------------------------------------------------
const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: '*' } });

function notifyConversationCreated(conversation) {
  if (!conversation) return;
  for (const m of conversation.members) {
    io.to(`user:${m.id}`).emit('conversation:new', conversation);
    for (const [, s] of io.sockets.sockets) {
      if (s.user?.id === m.id) s.join(`conv:${conversation.id}`);
    }
  }
}

io.use((socket, next) => {
  const payload = verifyToken(socket.handshake.auth?.token);
  if (!payload) return next(new Error('unauthorized'));
  socket.user = payload;
  next();
});

io.on('connection', async (socket) => {
  try {
    const rows = await q(
      'SELECT conversation_id FROM conversation_members WHERE user_id = $1',
      [socket.user.id]
    );
    for (const { conversation_id } of rows) socket.join(`conv:${conversation_id}`);
    socket.join(`user:${socket.user.id}`);
    socket.emit('ready'); // rooms joined — client can now safely send/receive
  } catch (e) { console.error('socket join error', e); socket.emit('ready'); }

  socket.on('message:send', async ({ conversation_id, content }, ack) => {
    try {
      const convId = Number(conversation_id);
      const text   = String(content || '').trim();
      if (!convId || !text)    return ack?.({ error: 'invalid' });
      if (text.length > 4000)  return ack?.({ error: 'too long' });

      const member = await q1(
        'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [convId, socket.user.id]
      );
      if (!member) return ack?.({ error: 'not a member' });

      const now = Date.now();
      const row = await q1(
        'INSERT INTO messages (conversation_id, user_id, content, created_at) VALUES ($1, $2, $3, $4) RETURNING id',
        [convId, socket.user.id, text, now]
      );
      const msg = {
        id: row.id,
        conversation_id: convId,
        user_id: socket.user.id,
        username: socket.user.username,
        content: text,
        created_at: now,
      };
      io.to(`conv:${convId}`).emit('message:new', msg);
      ack?.({ ok: true, message: msg });
    } catch (e) {
      console.error('message:send error', e);
      ack?.({ error: 'server error' });
    }
  });
});

// ---- boot -------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 4000;
initDb()
  .then(() => server.listen(PORT, () => console.log(`Privcord server → http://localhost:${PORT}`)))
  .catch(e => { console.error('DB init failed', e); process.exit(1); });
