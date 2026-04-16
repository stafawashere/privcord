import { useMemo, useState } from 'react';
import { initials } from '../util.js';

export default function NewChatModal({ users, onClose, onStartDm, onCreateGroup }) {
  const [tab, setTab] = useState('dm');
  const [query, setQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter(u => u.username.toLowerCase().includes(q)) : users;
  }, [users, query]);

  function toggle(userId) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  }

  async function startDm(userId) {
    setError('');
    setBusy(true);
    try { await onStartDm(userId); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function submitGroup() {
    setError('');
    const name = groupName.trim();
    if (!name)           return setError('Group name required');
    if (selected.size < 1) return setError('Pick at least one member');
    setBusy(true);
    try { await onCreateGroup(name, Array.from(selected)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0e0e0e] border border-neutral-800/70 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/50">
          <h2 className="text-base font-semibold tracking-tight text-neutral-100">New conversation</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60 transition-all"
          >
            <iconify-icon icon="solar:close-circle-linear" width="18" height="18"></iconify-icon>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-neutral-900/60 border border-neutral-800/60 rounded-xl p-1 text-sm">
            {['dm', 'group'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  'flex-1 py-2 rounded-lg font-medium transition-all ' +
                  (tab === t ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500 hover:text-neutral-300')
                }
              >
                {t === 'dm' ? 'Direct message' : 'Group chat'}
              </button>
            ))}
          </div>

          {/* Group name */}
          {tab === 'group' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-500 tracking-wide uppercase">Group name</label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. Design Team"
                className="w-full bg-neutral-900/60 border border-neutral-800/70 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 focus:bg-neutral-900 transition-all"
              />
            </div>
          )}

          {/* User list */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-500 tracking-wide uppercase">
              {tab === 'dm' ? 'Select a person' : 'Add members'}
            </label>
            <div className="relative flex items-center">
              <iconify-icon icon="solar:magnifer-linear" width="15" height="15" class="absolute left-3 text-neutral-500 pointer-events-none"></iconify-icon>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search people…"
                className="w-full bg-neutral-900/50 border border-neutral-800/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 transition-all"
              />
            </div>

            <div className="max-h-60 overflow-y-auto no-scrollbar border border-neutral-800/50 rounded-xl overflow-hidden">
              {filtered.length === 0 && (
                <div className="p-5 text-center text-sm text-neutral-600">No users found.</div>
              )}
              {filtered.map((u, i) => {
                const isSel = selected.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => tab === 'dm' ? startDm(u.id) : toggle(u.id)}
                    disabled={busy}
                    className={
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-all ' +
                      (i > 0 ? 'border-t border-neutral-800/40 ' : '') +
                      (tab === 'group' && isSel ? 'bg-neutral-800/50' : 'hover:bg-neutral-900/60')
                    }
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 border border-neutral-800/50 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-neutral-300">{initials(u.username)}</span>
                    </div>
                    <span className="flex-1 text-sm text-neutral-200 truncate">{u.username}</span>
                    {tab === 'group' && (
                      <span className={
                        'w-4 h-4 rounded border-2 flex items-center justify-center transition-all ' +
                        (isSel ? 'bg-neutral-200 border-neutral-200' : 'border-neutral-600')
                      }>
                        {isSel && (
                          <iconify-icon icon="solar:check-read-linear" width="10" height="10" class="text-[#0a0a0a]"></iconify-icon>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {tab === 'group' && (
            <button
              onClick={submitGroup}
              disabled={busy || !groupName.trim() || selected.size < 1}
              className="w-full py-3 rounded-xl bg-neutral-200 text-[#0a0a0a] text-sm font-semibold hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Creating…' : `Create group${selected.size ? ` (${selected.size} members)` : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
