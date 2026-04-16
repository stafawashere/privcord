import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';
import Auth from './components/Auth.jsx';
import ChatApp from './components/ChatApp.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then(({ user }) => {
        setUser(user);
        connectSocket();
      })
      .catch((err) => {
        // Only wipe the token when the server explicitly rejects it (expired / invalid).
        // Network errors or server downtime should NOT log the user out.
        if (err.status === 401) setToken(null);
        else setUser(null); // stay on loading→auth but keep token for retry
      })
      .finally(() => setLoading(false));
  }, []);

  function onAuthenticated(nextUser, token) {
    setToken(token);
    setUser(nextUser);
    connectSocket();
  }

  function logout() {
    disconnectSocket();
    setToken(null);
    setUser(null);
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a] text-neutral-500 text-sm">
        Loading…
      </div>
    );
  }

  if (!user) return <Auth onAuthenticated={onAuthenticated} />;
  return <ChatApp user={user} onLogout={logout} />;
}
