import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Clock, ThumbsUp, ListVideo, LayoutDashboard, Upload, Settings, Tv2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const GUEST_LINKS = [
  { to: '/', icon: <Home size={18}/>, label: 'Home' },
];

const AUTH_LINKS = [
  { to: '/',          icon: <Home size={18}/>,           label: 'Home' },
  { to: '/history',   icon: <Clock size={18}/>,           label: 'Watch History' },
  { to: '/liked',     icon: <ThumbsUp size={18}/>,        label: 'Liked Videos' },
  { to: '/playlists', icon: <ListVideo size={18}/>,       label: 'Playlists' },
  { label: 'Creator', divider: true },
  { to: '/upload',    icon: <Upload size={18}/>,          label: 'Upload Video' },
  { to: '/dashboard', icon: <LayoutDashboard size={18}/>, label: 'Dashboard' },
  { label: 'Account', divider: true },
  { to: '/settings',  icon: <Settings size={18}/>,        label: 'Settings' },
];

const BREAKPOINT = 900;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= BREAKPOINT : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export default function Sidebar({ open, onClose }) {
  const { user }  = useAuth();
  const isMobile  = useIsMobile();
  const links     = user ? AUTH_LINKS : GUEST_LINKS;

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = (isMobile && open) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, open]);

  // On mobile:  hidden off-screen by default, slides in when open=true
  // On desktop: always visible, ignores the open prop entirely
  const sidebarTranslate = isMobile
    ? (open ? 'translateX(0)' : 'translateX(-100%)')
    : 'translateX(0)';

  return (
    <>
      {/* ── Overlay: only when mobile + open ── */}
      {isMobile && open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.80)',
            zIndex: 94,
          }}
        />
      )}

      {/* ── Sidebar panel ── */}
      <aside style={{
        position:   'fixed',
        top:        'var(--navbar-h)',
        left:       0,
        bottom:     0,
        width:      'var(--sidebar-w)',
        background: 'var(--bg-base)',
        borderRight: '1px solid var(--border)',
        overflowY:  'auto',
        overflowX:  'hidden',
        padding:    '16px 12px 80px',
        zIndex:     95,
        transform:  sidebarTranslate,
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              position: 'absolute', top: 12, right: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 8, cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={16}/>
          </button>
        )}

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: isMobile ? 44 : 0 }}>
          {links.map((item, i) => {
            if (item.divider) return (
              <div key={i} style={{ margin: '16px 0 8px', paddingLeft: 12 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {item.label}
                </span>
              </div>
            );
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px',
                  borderRadius: 'var(--radius-md)',
                  color:      isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  fontSize: 14, fontWeight: isActive ? 600 : 400,
                  transition: 'background 0.15s, color 0.15s',
                  textDecoration: 'none',
                })}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Branding strip */}
        <div style={{
          position: 'absolute', bottom: 20, left: 12, right: 12,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 14px',
          background: 'var(--accent-dim)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid #f5a62333',
        }}>
          <Tv2 size={16} style={{ color: 'var(--accent)', flexShrink: 0 }}/>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Syne' }}>StreamHive</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}

