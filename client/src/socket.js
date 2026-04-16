import { io } from 'socket.io-client';
import { getToken } from './api.js';

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();
  // Connect directly to the backend — Vite's WS proxy doesn't handle Socket.IO upgrades reliably.
  const url = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  socket = io(url, {
    auth: { token: getToken() },
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
