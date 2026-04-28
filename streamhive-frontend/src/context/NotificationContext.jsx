import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { notificationAPI } from '../api/index.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
 import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { notificationAPI } from '../api/index.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [socketReady,   setSocketReady]   = useState(false);
  const socketRef = useRef(null);

  // ── Fetch notification history from REST ──────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notificationAPI.getAll();
      setNotifications(data.data.notifications ?? []);
      setUnreadCount(data.data.unreadCount ?? 0);
    } catch { /* not critical — REST endpoint may not be deployed yet */ }
  }, [user]);

  // ── Connect / disconnect socket on auth change ────────────────────────────
  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      setSocketReady(false);
      return;
    }

    fetchNotifications();

    // Lazy-import socket.io-client so a missing package never crashes the app
    let cancelled = false;
    import('socket.io-client')
      .then(({ io }) => {
        if (cancelled) return;

        const SOCKET_URL = import.meta.env.VITE_API_URL;
        if (!SOCKET_URL) return; // env not set → skip silently

        const socket = io(SOCKET_URL, {
          withCredentials: true,
          auth: { userId: user._id },

          // ── KEY FIX: start with polling (always works through proxies),
          //    then upgrade to WebSocket only if the server supports it.
          //    This prevents the WebSocket-failed spam on Render.
          transports: ['polling', 'websocket'],

          // ── Limit reconnect attempts so we don't spam the logs forever
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 3000,
          reconnectionDelayMax: 15000,
          timeout: 10000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('[socket] connected via', socket.io.engine.transport.name);
          setSocketReady(true);
        });

        socket.on('notification:new', (notif) => {
          setNotifications(prev => [notif, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);

          // Native browser notification (only if permission granted)
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification(notif.sender?.fullName ?? 'StreamHive', {
                body: notif.message,
                icon: notif.sender?.avatar ?? '/favicon.ico',
                tag:  notif._id,
              });
            } catch { /* ignore — some browsers block in iframe */ }
          }
        });

        socket.on('connect_error', (err) => {
          // Only log, do NOT crash — the REST polling fallback still works
          console.warn('[socket] connect_error:', err.message);
        });

        socket.on('reconnect_failed', () => {
          console.warn('[socket] gave up reconnecting after 5 attempts. Notifications via REST only.');
          setSocketReady(false);
        });

        socket.on('disconnect', (reason) => {
          console.log('[socket] disconnected:', reason);
          setSocketReady(false);
        });
      })
      .catch((err) => {
        // socket.io-client not installed — gracefully degrade to REST-only
        console.warn('[socket] socket.io-client not available:', err.message);
      });

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketReady(false);
    };
  }, [user, fetchNotifications]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
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

  // ── Request browser permission once ───────────────────────────────────────
  useEffect(() => {
    if (user && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [user]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, socketReady,
      markAsRead, markAllRead, deleteNotification, fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

// Safe hook — returns empty defaults instead of throwing when used
// outside provider (prevents Navbar crash if provider is missing)
const SAFE_DEFAULT = {
  notifications: [],
  unreadCount: 0,
  socketReady: false,
  markAsRead: async () => {},
  markAllRead: async () => {},
  deleteNotification: async () => {},
  fetchNotifications: async () => {},
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  // Graceful fallback instead of throw — Navbar stays alive even if
  // NotificationProvider is missing from the tree
  return ctx ?? SAFE_DEFAULT;
}
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { notificationAPI } from '../api/index.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [socketReady,   setSocketReady]   = useState(false);
  const socketRef = useRef(null);

  // ── Fetch notification history from REST ──────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notificationAPI.getAll();
      setNotifications(data.data.notifications ?? []);
      setUnreadCount(data.data.unreadCount ?? 0);
    } catch { /* not critical — REST endpoint may not be deployed yet */ }
  }, [user]);

  // ── Connect / disconnect socket on auth change ────────────────────────────
  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      setSocketReady(false);
      return;
    }

    fetchNotifications();

    // Lazy-import socket.io-client so a missing package never crashes the app
    let cancelled = false;
    import('socket.io-client')
      .then(({ io }) => {
        if (cancelled) return;

        const SOCKET_URL = import.meta.env.VITE_API_URL;
        if (!SOCKET_URL) return; // env not set → skip silently

        const socket = io(SOCKET_URL, {
          withCredentials: true,
          auth: { userId: user._id },

          // ── KEY FIX: start with polling (always works through proxies),
          //    then upgrade to WebSocket only if the server supports it.
          //    This prevents the WebSocket-failed spam on Render.
          transports: ['polling', 'websocket'],

          // ── Limit reconnect attempts so we don't spam the logs forever
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 3000,
          reconnectionDelayMax: 15000,
          timeout: 10000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('[socket] connected via', socket.io.engine.transport.name);
          setSocketReady(true);
        });

        socket.on('notification:new', (notif) => {
          setNotifications(prev => [notif, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);

          // Native browser notification (only if permission granted)
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification(notif.sender?.fullName ?? 'StreamHive', {
                body: notif.message,
                icon: notif.sender?.avatar ?? '/favicon.ico',
                tag:  notif._id,
              });
            } catch { /* ignore — some browsers block in iframe */ }
          }
        });

        socket.on('connect_error', (err) => {
          // Only log, do NOT crash — the REST polling fallback still works
          console.warn('[socket] connect_error:', err.message);
        });

        socket.on('reconnect_failed', () => {
          console.warn('[socket] gave up reconnecting after 5 attempts. Notifications via REST only.');
          setSocketReady(false);
        });

        socket.on('disconnect', (reason) => {
          console.log('[socket] disconnected:', reason);
          setSocketReady(false);
        });
      })
      .catch((err) => {
        // socket.io-client not installed — gracefully degrade to REST-only
        console.warn('[socket] socket.io-client not available:', err.message);
      });

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocketReady(false);
    };
  }, [user, fetchNotifications]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
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

  // ── Request browser permission once ───────────────────────────────────────
  useEffect(() => {
    if (user && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [user]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, socketReady,
      markAsRead, markAllRead, deleteNotification, fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

// Safe hook — returns empty defaults instead of throwing when used
// outside provider (prevents Navbar crash if provider is missing)
const SAFE_DEFAULT = {
  notifications: [],
  unreadCount: 0,
  socketReady: false,
  markAsRead: async () => {},
  markAllRead: async () => {},
  deleteNotification: async () => {},
  fetchNotifications: async () => {},
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  // Graceful fallback instead of throw — Navbar stays alive even if
  // NotificationProvider is missing from the tree
  return ctx ?? SAFE_DEFAULT;
}
