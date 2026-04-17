# Privcord

A minimal real-time chat app: username-only auth, DMs, and group chats. No friend system — all users are visible to each other.

## Stack
- **Backend:** Node.js, Express, Socket.IO, SQLite (better-sqlite3), JWT, bcryptjs
- **Frontend:** React 18, Vite, TailwindCSS, Iconify, socket.io-client

## Setup

```bash
# Install everything
cd server && npm install
cd ../client && npm install
```

## Run (two terminals)

```bash
# Terminal 1 — backend on :4000
cd server && npm run dev

# Terminal 2 — frontend on :5173
cd client && npm run dev
```

Open http://localhost:5173, sign up with any username/password, and start chatting. Open a second browser (or incognito) to test real-time messaging.

## Features
- Username + password signup/login (no email)
- All registered users visible in a "People" list
- Click anyone to start a DM (auto-creates conversation)
- Create group chats with any subset of users
- Real-time delivery via WebSocket
- Persistent history in SQLite
