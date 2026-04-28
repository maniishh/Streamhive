import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { notificationAPI } from '../api/index.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const socketRef = useRef(null);

  // ── Fetch notification history from REST ─────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notificationAPI.getAll();
      setNotifications(data.data.notifications);
      setUnreadCount(data.data.unreadCount);
    } catch { /* not critical */ }
  }, [user]);

  // ── Connect / disconnect socket on auth change ───────────────────────────
  useEffect(() => {
    if (!user) {
      // Logged out → tear down socket + clear state
      socketRef.current?.disconnect();
      socketRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    const SOCKET_URL = import.meta.env.VITE_API_URL;
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      auth: { userId: user._id },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[socket] connected:', socket.id);
    });

    // ── Real-time notification push ──────────────────────────────────────
    socket.on('notification:new', (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 50)); // keep latest 50
      setUnreadCount(prev => prev + 1);

      // Optional: browser native notification
      if (Notification.permission === 'granted') {
        new Notification(notif.message, {
          body: notif.sender?.fullName ?? 'Someone',
          icon: notif.sender?.avatar ?? '/favicon.ico',
          tag:  notif._id,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('[socket] disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, fetchNotifications]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  const deleteNotification = useCallback(async (id) => {
    const notif = notifications.find(n => n._id === id);
    try {
      await notificationAPI.delete(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      if (notif && !notif.isRead) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }, [notifications]);

  // ── Ask for browser permission once ──────────────────────────────────────
  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount,
      markAsRead, markAllRead, deleteNotification, fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
