import { useEffect, useRef, useState } from 'react';
import { conversationTitle } from '../util.js';

export default function MessageInput({ conversation, currentUserId, onSend }) {
  const [value, setValue] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    setValue('');
    ref.current?.focus();
  }, [conversation?.id]);

  function submit() {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue('');
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const placeholder = `Message ${conversationTitle(conversation, currentUserId)}…`;

  return (
    <div className="px-4 md:px-6 lg:px-8 pb-5 pt-3 bg-[#0a0a0a] shrink-0">
      <div className="max-w-4xl mx-auto flex items-end gap-2 bg-neutral-900/70 border border-neutral-800/70 rounded-2xl px-4 py-2.5 focus-within:border-neutral-700 focus-within:bg-neutral-900 transition-all shadow-sm">
        <textarea
          ref={ref}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-neutral-200 placeholder:text-neutral-600 resize-none max-h-36 py-2 outline-none no-scrollbar leading-relaxed"
          style={{ minHeight: 36 }}
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          aria-label="Send"
          className="mb-0.5 p-2 bg-neutral-200 text-[#0a0a0a] hover:bg-white transition-colors rounded-xl disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          <iconify-icon icon="solar:plain-2-linear" width="17" height="17" style={{ transform: 'rotate(45deg)' }}></iconify-icon>
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-neutral-700">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
