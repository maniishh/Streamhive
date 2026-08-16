import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { notificationAPI } from '../api/index.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const socketRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await notificationAPI.getAll();
      setNotifications(data.data.notifications ?? []);
      setUnreadCount(data.data.unreadCount ?? 0);
    } catch { /* not critical */ }
  }, [user]);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    // Lazy import so missing package never crashes the app
    let cancelled = false;
    import('socket.io-client')
      .then(({ io }) => {
        if (cancelled) return;
        const SOCKET_URL = import.meta.env.VITE_API_URL;
        if (!SOCKET_URL) return;

        const socket = io(SOCKET_URL, {
          withCredentials: true,
          auth: { userId: user._id },
          transports: ['polling', 'websocket'], // polling first — avoids 404 on WebSocket
          reconnectionAttempts: 5,              // stop after 5 tries, not infinite
          reconnectionDelay: 3000,
          reconnectionDelayMax: 15000,
          timeout: 10000,
        });

        socketRef.current = socket;

        socket.on('connect', () =>
          console.log('[socket] connected via', socket.io.engine.transport.name)
        );

        socket.on('notification:new', (notif) => {
          setNotifications(prev => [notif, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);

          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification(notif.sender?.fullname ?? 'StreamHive', {
                body: notif.message,
                icon: notif.sender?.avatar ?? '/favicon.ico',
                tag:  notif._id,
              });
            } catch { /* ignore */ }
          }
        });

        socket.on('connect_error', (err) =>
          console.warn('[socket] connect_error:', err.message)
        );
        socket.on('reconnect_failed', () =>
          console.warn('[socket] gave up after 5 attempts — REST fallback active')
        );
      })
      .catch(err => console.warn('[socket] socket.io-client unavailable:', err.message));

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user, fetchNotifications]);

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

  useEffect(() => {
    if (user && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
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

// Safe fallback — never throws, so Navbar stays alive even if provider is missing
const SAFE_DEFAULT = {
  notifications: [], unreadCount: 0,
  markAsRead: async () => {}, markAllRead: async () => {},
  deleteNotification: async () => {}, fetchNotifications: async () => {},
};

export function useNotifications() {
  return useContext(NotificationContext) ?? SAFE_DEFAULT;
}
