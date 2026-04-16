import { useMemo, useState } from 'react';
import { formatTime, initials, otherMember } from '../util.js';

export default function Sidebar({
  user, conversations, activeId,
  onSelect, onNewChat, onLogout,
  mobileOpen, onMobileClose,
}) {
  const [query, setQuery] = useState('');

  const { groups, dms } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (conv) => {
      if (!q) return true;
      if (conv.type === 'group') return (conv.name || '').toLowerCase().includes(q);
      return (otherMember(conv, user.id)?.username || '').toLowerCase().includes(q);
    };
    return {
      groups: conversations.filter(c => c.type === 'group' && match(c)),
      dms:    conversations.filter(c => c.type === 'dm'    && match(c)),
    };
  }, [conversations, query, user.id]);

  const inner = (
    <aside className="flex flex-col w-72 bg-[#0c0c0c] border-r border-neutral-800/50 h-full shrink-0">

      {/* Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-neutral-800/50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700/50 flex items-center justify-center">
            <iconify-icon icon="solar:shield-keyhole-linear" width="15" height="15" class="text-neutral-300"></iconify-icon>
          </div>
          <span className="text-base font-semibold tracking-tight">Privcord</span>
        </div>
        <button
          onClick={onNewChat}
          title="New chat"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/60 transition-all"
        >
          <iconify-icon icon="solar:pen-new-square-linear" width="18" height="18"></iconify-icon>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 shrink-0">
        <div className="relative flex items-center">
          <iconify-icon icon="solar:magnifer-linear" width="15" height="15" class="absolute left-3 text-neutral-500 pointer-events-none"></iconify-icon>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            type="text"
            placeholder="Search conversations…"
            className="w-full bg-neutral-900/60 border border-neutral-800/60 rounded-xl pl-9 pr-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 focus:bg-neutral-900/80 transition-all"
          />
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-4">

        {groups.length > 0 && (
          <div className="mt-3">
            <div className="px-5 mb-2">
              <span className="text-[10px] font-semibold text-neutral-500 tracking-widest uppercase">Groups</span>
            </div>
            <div className="space-y-0.5 px-2">
              {groups.map(c => (
                <ConvRow key={c.id} conv={c} active={c.id === activeId} onClick={() => onSelect(c.id)} currentUserId={user.id} />
              ))}
            </div>
          </div>
        )}

        {dms.length > 0 && (
          <div className="mt-5">
            <div className="px-5 mb-2">
              <span className="text-[10px] font-semibold text-neutral-500 tracking-widest uppercase">Direct Messages</span>
            </div>
            <div className="space-y-0.5 px-2">
              {dms.map(c => (
                <ConvRow key={c.id} conv={c} active={c.id === activeId} onClick={() => onSelect(c.id)} currentUserId={user.id} />
              ))}
            </div>
          </div>
        )}

        {groups.length === 0 && dms.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-neutral-900 border border-neutral-800/60 flex items-center justify-center">
              <iconify-icon icon="solar:chat-round-line-linear" width="18" height="18" class="text-neutral-500"></iconify-icon>
            </div>
            <p className="text-sm text-neutral-500 mb-3">No conversations yet.</p>
            <button onClick={onNewChat} className="text-sm text-neutral-300 hover:text-white transition-colors font-medium">
              Start a new chat →
            </button>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="px-3 pb-3 pt-2 border-t border-neutral-800/50 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-900/60 transition-all group">
          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700/50 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-neutral-300">{initials(user.username)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-neutral-200 truncate">{user.username}</span>
            <span className="block text-xs text-neutral-500">Online</span>
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800/60 transition-all opacity-0 group-hover:opacity-100"
          >
            <iconify-icon icon="solar:logout-2-linear" width="16" height="16"></iconify-icon>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden md:flex h-full">{inner}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="shrink-0 shadow-2xl">{inner}</div>
          <button
            aria-label="Close sidebar"
            onClick={onMobileClose}
            className="flex-1 bg-black/60 backdrop-blur-sm"
          />
        </div>
      )}
    </>
  );
}

function ConvRow({ conv, active, onClick, currentUserId }) {
  const isGroup = conv.type === 'group';
  const other   = !isGroup ? otherMember(conv, currentUserId) : null;
  const title   = isGroup ? (conv.name || 'Group') : (other?.username || 'Direct Message');
  const subtitle = conv.last_message
    ? `${isGroup ? conv.last_message.username + ': ' : ''}${conv.last_message.content}`
    : (isGroup ? 'No messages yet' : 'Say hello');
  const time = formatTime(conv.last_message?.created_at ?? conv.created_at);

  return (
    <button
      onClick={onClick}
      className={
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ' +
        (active ? 'bg-neutral-800/70' : 'hover:bg-neutral-900/70')
      }
    >
      <div className={
        'w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-all ' +
        (active
          ? 'bg-neutral-700/60 border-neutral-600/50'
          : 'bg-neutral-900/80 border-neutral-800/60')
      }>
        {isGroup
          ? <iconify-icon icon="solar:hashtag-linear" width="15" height="15" class={active ? 'text-neutral-300' : 'text-neutral-500'}></iconify-icon>
          : <span className="text-xs font-semibold text-neutral-300">{initials(title)}</span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5 gap-2">
          <span className={'text-sm truncate ' + (active ? 'font-medium text-neutral-100' : 'font-normal text-neutral-300')}>
            {title}
          </span>
          <span className="text-[11px] text-neutral-600 shrink-0">{time}</span>
        </div>
        <p className="text-xs text-neutral-500 truncate leading-relaxed">{subtitle}</p>
      </div>
    </button>
  );
}
