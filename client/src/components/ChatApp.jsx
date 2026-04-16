import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { connectSocket } from '../socket.js';
import Sidebar from './Sidebar.jsx';
import ChatWindow from './ChatWindow.jsx';
import NewChatModal from './NewChatModal.jsx';

export default function ChatApp({ user, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const socketRef = useRef(null);

  const refreshConversations = useCallback(async () => {
    const { conversations } = await api.conversations();
    setConversations(conversations);
  }, []);

  const refreshUsers = useCallback(async () => {
    const { users } = await api.users();
    setUsers(users);
  }, []);

  useEffect(() => {
    refreshConversations().catch(console.error);
    refreshUsers().catch(console.error);
  }, [refreshConversations, refreshUsers]);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const onConvNew = (conv) => {
      setConversations(prev =>
        prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]
      );
    };
    const onMessage = (msg) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === msg.conversation_id);
        if (idx === -1) return prev;
        const updated = {
          ...prev[idx],
          last_message: { content: msg.content, created_at: msg.created_at, username: msg.username },
        };
        const next = [...prev];
        next.splice(idx, 1);
        return [updated, ...next];
      });
    };

    socket.on('conversation:new', onConvNew);
    socket.on('message:new', onMessage);
    return () => {
      socket.off('conversation:new', onConvNew);
      socket.off('message:new', onMessage);
    };
  }, []);

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeId) || null,
    [conversations, activeId]
  );

  async function startDm(userId) {
    const { conversation } = await api.openDm(userId);
    setConversations(prev =>
      prev.some(c => c.id === conversation.id) ? prev : [conversation, ...prev]
    );
    setActiveId(conversation.id);
    setNewChatOpen(false);
    setMobileSidebarOpen(false);
  }

  async function createGroup(name, memberIds) {
    const { conversation } = await api.createGroup(name, memberIds);
    setConversations(prev =>
      prev.some(c => c.id === conversation.id) ? prev : [conversation, ...prev]
    );
    setActiveId(conversation.id);
    setNewChatOpen(false);
    setMobileSidebarOpen(false);
  }

  function selectConversation(id) {
    setActiveId(id);
    setMobileSidebarOpen(false);
  }

  return (
    <div className="bg-[#0a0a0a] text-neutral-200 h-screen w-screen overflow-hidden flex antialiased selection:bg-neutral-800" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>

      {/* Mobile header */}
      <div className="md:hidden absolute top-0 left-0 w-full h-14 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-neutral-800/50 flex items-center justify-between px-5 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-all"
          >
            <iconify-icon icon="solar:hamburger-menu-linear" width="22" height="22"></iconify-icon>
          </button>
          <div className="flex items-center gap-2">
            <iconify-icon icon="solar:shield-keyhole-linear" width="16" height="16" class="text-neutral-400"></iconify-icon>
            <span className="text-base font-semibold tracking-tight">Privcord</span>
          </div>
        </div>
        <button
          onClick={() => setNewChatOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-all"
        >
          <iconify-icon icon="solar:pen-new-square-linear" width="22" height="22"></iconify-icon>
        </button>
      </div>

      <Sidebar
        user={user}
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNewChat={() => setNewChatOpen(true)}
        onLogout={onLogout}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <ChatWindow
        key={activeConversation?.id ?? 'empty'}
        user={user}
        conversation={activeConversation}
        socket={socketRef.current}
        onNewChat={() => setNewChatOpen(true)}
      />

      {newChatOpen && (
        <NewChatModal
          users={users}
          onClose={() => setNewChatOpen(false)}
          onStartDm={startDm}
          onCreateGroup={createGroup}
        />
      )}
    </div>
  );
}
