import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { conversationTitle, formatDateLabel, formatFullTime, initials, otherMember } from '../util.js';
import MessageInput from './MessageInput.jsx';

export default function ChatWindow({ user, conversation, socket, onNewChat }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (!conversation) { setMessages([]); return; }
    let cancelled = false;
    setLoading(true);
    api.messages(conversation.id)
      .then(({ messages }) => { if (!cancelled) setMessages(messages); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [conversation?.id]);

  useEffect(() => {
    if (!socket || !conversation) return;
    const handler = (msg) => {
      if (msg.conversation_id !== conversation.id) return;
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    };
    socket.on('message:new', handler);
    return () => socket.off('message:new', handler);
  }, [socket, conversation?.id]);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, conversation?.id]);

  function send(content) {
    if (!conversation || !socket) return;
    socket.emit('message:send', { conversation_id: conversation.id, content });
  }

  if (!conversation) {
    return (
      <main className="flex-1 flex flex-col h-full bg-[#0a0a0a] relative pt-14 md:pt-0 items-center justify-center">
        <div className="text-center max-w-xs px-6">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-neutral-900 border border-neutral-800/60 flex items-center justify-center">
            <iconify-icon icon="solar:chat-round-line-linear" width="26" height="26" class="text-neutral-500"></iconify-icon>
          </div>
          <h2 className="text-base font-semibold text-neutral-200 mb-2 tracking-tight">No conversation open</h2>
          <p className="text-sm text-neutral-500 mb-5 leading-relaxed">
            Pick a conversation from the sidebar, or start a new one.
          </p>
          <button
            onClick={onNewChat}
            className="text-sm px-4 py-2.5 rounded-xl bg-neutral-200 text-[#0a0a0a] hover:bg-white transition-colors font-semibold"
          >
            New chat
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-full bg-[#0a0a0a] relative pt-14 md:pt-0 min-w-0">
      <Header user={user} conversation={conversation} />

      <div ref={scrollerRef} className="flex-1 overflow-y-auto no-scrollbar px-4 md:px-6 lg:px-8 py-6 flex flex-col gap-1">
        {loading && (
          <div className="text-center text-xs text-neutral-600 py-6">Loading…</div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-neutral-600">No messages yet. Say something.</p>
          </div>
        )}
        <RenderedMessages messages={messages} currentUserId={user.id} />
        <div className="h-4 shrink-0" />
      </div>

      <MessageInput conversation={conversation} currentUserId={user.id} onSend={send} />
    </main>
  );
}

function Header({ user, conversation }) {
  const isGroup = conversation.type === 'group';
  const title   = conversationTitle(conversation, user.id);
  const other   = otherMember(conversation, user.id);
  const subtitle = isGroup
    ? `${conversation.members?.length ?? 0} members`
    : (other ? `@${other.username}` : '');

  return (
    <header className="h-16 flex items-center justify-between px-5 md:px-6 border-b border-neutral-800/50 bg-[#0a0a0a]/90 backdrop-blur-md z-10 shrink-0">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="hidden md:flex w-9 h-9 rounded-full bg-neutral-900 items-center justify-center border border-neutral-800/60 shrink-0">
          {isGroup
            ? <iconify-icon icon="solar:hashtag-linear" width="16" height="16" class="text-neutral-400"></iconify-icon>
            : <span className="text-xs font-semibold text-neutral-300">{initials(title)}</span>
          }
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-neutral-100 truncate">{title}</h2>
          <p className="text-xs text-neutral-500 truncate">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}

function RenderedMessages({ messages, currentUserId }) {
  const blocks = useMemo(() => groupMessages(messages), [messages]);

  return (
    <>
      {blocks.map(block => {
        if (block.kind === 'date') {
          return (
            <div key={'d-' + block.key} className="flex items-center justify-center my-6">
              <div className="px-3.5 py-1 rounded-full bg-neutral-900/60 border border-neutral-800/50 text-xs text-neutral-500 font-medium">
                {block.label}
              </div>
            </div>
          );
        }

        const isMe = block.user_id === currentUserId;
        return (
          <div
            key={'b-' + block.key}
            className={'flex gap-3 mt-5 max-w-3xl w-full ' + (isMe ? 'self-end flex-row-reverse' : 'self-start')}
          >
            {!isMe && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 border border-neutral-800/50 flex items-center justify-center shrink-0 mt-1">
                <span className="text-xs font-semibold text-neutral-300">{initials(block.username)}</span>
              </div>
            )}
            <div className={'flex flex-col gap-1 min-w-0 ' + (isMe ? 'items-end' : 'items-start')}>
              <div className={'flex items-baseline gap-2 ' + (isMe ? 'flex-row-reverse' : '')}>
                <span className="text-xs font-semibold text-neutral-400">{isMe ? 'You' : block.username}</span>
                <span className="text-[11px] text-neutral-600">{formatFullTime(block.messages[0].created_at)}</span>
              </div>
              <div className={'flex flex-col gap-1 ' + (isMe ? 'items-end' : 'items-start')}>
                {block.messages.map((m, i) => (
                  <div
                    key={m.id}
                    className={
                      'px-4 py-2.5 text-sm leading-relaxed border max-w-[min(72ch,80vw)] whitespace-pre-wrap break-words ' +
                      (isMe
                        ? 'bg-neutral-800/60 border-neutral-700/50 text-neutral-100 rounded-2xl ' + (i === 0 ? 'rounded-tr-sm' : '')
                        : 'bg-neutral-900/80 border-neutral-800/50 text-neutral-200 rounded-2xl ' + (i === 0 ? 'rounded-tl-sm' : ''))
                    }
                  >
                    {m.content}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function groupMessages(messages) {
  const blocks = [];
  let lastDay = null;
  let current = null;
  const FIVE_MIN = 5 * 60 * 1000;

  for (const m of messages) {
    const day = new Date(m.created_at).toDateString();
    if (day !== lastDay) {
      blocks.push({ kind: 'date', key: day, label: formatDateLabel(m.created_at) });
      lastDay = day;
      current = null;
    }
    const last = current?.messages.at(-1);
    if (current && current.user_id === m.user_id && m.created_at - last.created_at < FIVE_MIN) {
      current.messages.push(m);
    } else {
      current = { kind: 'msg', key: m.id, user_id: m.user_id, username: m.username, messages: [m] };
      blocks.push(current);
    }
  }
  return blocks;
}
