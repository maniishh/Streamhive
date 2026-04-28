import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, MessageSquare, Heart, UserPlus, Reply, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';

const TYPE_ICON = {
  comment:     <MessageSquare size={14} />,
  reply:       <Reply size={14} />,
  like_video:  <Heart size={14} />,
  subscribe:   <UserPlus size={14} />,
};

const TYPE_COLOR = {
  comment:     '#6c63ff',
  reply:       '#f5a623',
  like_video:  '#ef4444',
  subscribe:   '#22c55e',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = diff / 1000;
  if (s < 60)    return `${Math.floor(s)}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef();
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = async (notif) => {
    if (!notif.isRead) await markAsRead(notif._id);
    setOpen(false);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'relative',
          width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%',
          background: open ? 'var(--bg-elevated)' : 'transparent',
          border: '1px solid ' + (open ? 'var(--border-light)' : 'transparent'),
          color: open ? 'var(--accent)' : 'var(--text-secondary)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.background = 'var(--bg-elevated)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: unreadCount > 9 ? 18 : 14,
            height: 14,
            background: 'var(--accent)',
            borderRadius: 999,
            fontSize: 9, fontWeight: 700,
            color: '#07070f',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-base)',
            lineHeight: 1,
            animation: 'notifPop 0.3s cubic-bezier(.34,1.56,.64,1)',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: 370,
          maxHeight: 520,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'notifSlideDown 0.2s cubic-bezier(.16,1,.3,1)',
          zIndex: 300,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Syne' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  background: 'var(--accent-dim)', color: 'var(--accent)',
                  fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 8,
                  background: 'var(--accent-dim)', color: 'var(--accent)',
                  border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  fontFamily: 'DM Sans', transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f5a62340'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-dim)'}
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}>
                <Bell size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>No notifications yet</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>We'll let you know when something happens</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    background: notif.isRead ? 'transparent' : 'rgba(245,166,35,0.04)',
                    borderLeft: notif.isRead ? '3px solid transparent' : '3px solid var(--accent)',
                    transition: 'background 0.15s',
                    position: 'relative',
                  }}
                  onClick={() => handleClick(notif)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(245,166,35,0.04)'}
                >
                  {/* Avatar + type icon */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {notif.sender?.avatar ? (
                      <img
                        src={notif.sender.avatar}
                        alt={notif.sender.fullName}
                        style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: 'var(--bg-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700, color: 'var(--accent)',
                      }}>
                        {notif.sender?.fullName?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    {/* Type badge */}
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 18, height: 18,
                      background: TYPE_COLOR[notif.type] ?? 'var(--accent)',
                      borderRadius: '50%',
                      border: '2px solid var(--bg-elevated)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff',
                    }}>
                      {TYPE_ICON[notif.type]}
                    </div>
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                      <strong>{notif.sender?.fullName ?? 'Someone'}</strong>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{notif.message}</span>
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>

                  {/* Unread dot + delete */}
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8, flexShrink: 0,
                  }}>
                    {!notif.isRead && (
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'var(--accent)', flexShrink: 0,
                      }} />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                      style={{
                        width: 22, height: 22,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 6, background: 'transparent',
                        border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', transition: 'all 0.15s',
                        opacity: 0.6,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#ef444422';
                        e.currentTarget.style.color = 'var(--error)';
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.opacity = '0.6';
                      }}
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
              textAlign: 'center',
            }}>
              <button
                onClick={async () => { for (const n of notifications) await deleteNotification(n._id); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto',
                  padding: '4px 8px', borderRadius: 6, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.background = '#ef444415'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
              >
                <Trash2 size={12} /> Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
