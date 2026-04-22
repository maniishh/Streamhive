
import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Upload, Menu, LogOut, User, Settings,
  LayoutDashboard, Film, Users,
} from 'lucide-react';
import { useAuth }   from '../context/AuthContext.jsx';
import { searchAPI } from '../api/index.js';

/* ─── tiny debounce hook ──────────────────────────────────────────────────── */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [query,         setQuery]         = useState('');
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [suggestions,   setSuggestions]   = useState(null); // null = hidden
  const [suggestLoading, setSuggestLoading] = useState(false);

  const menuRef    = useRef();
  const searchRef  = useRef();

  const debouncedQuery = useDebounce(query, 300);

  // ── Close user-menu on outside click ────────────────────────────────────
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Close suggestions on outside click ──────────────────────────────────
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSuggestions(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Fetch suggestions whenever debounced query changes ──────────────────
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setSuggestions(null);
      return;
    }
    let cancelled = false;
    setSuggestLoading(true);
    searchAPI.suggest(debouncedQuery, 4)
      .then(({ data }) => {
        if (!cancelled) setSuggestions(data?.data?.suggestions ?? null);
      })
      .catch(() => { if (!cancelled) setSuggestions(null); })
      .finally(() => { if (!cancelled) setSuggestLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // ── Submit search ────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSuggestions(null);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const goToSuggestion = (q) => {
    setQuery(q);
    setSuggestions(null);
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // ── How many suggestions do we have? ────────────────────────────────────
  const hasSuggestions =
    suggestions &&
    ((suggestions.videos?.length ?? 0) + (suggestions.channels?.length ?? 0)) > 0;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 'var(--navbar-h)', background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 20px',
      gap: 16, zIndex: 100, backdropFilter: 'blur(12px)',
    }}>
      {/* ── Left: Logo + hamburger ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-ghost" onClick={onToggleSidebar}
          style={{ padding: 8, borderRadius: 8, display: 'flex' }}>
          <Menu size={22} />
        </button>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{
            width: 32, height: 32, background: 'var(--accent)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: '#07070f',
          }}>S</div>
          <span style={{
            fontFamily: 'Syne', fontWeight: 700, fontSize: 18,
            color: 'var(--text-primary)', letterSpacing: '-0.02em',
          }} className="hide-mobile">StreamHive</span>
        </Link>
      </div>

      {/* ── Center: Search + suggestions ── */}
      <div ref={searchRef} style={{ flex: 1, maxWidth: 560, margin: '0 auto', position: 'relative' }}>
        <form onSubmit={handleSearch}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{
              position: 'absolute', left: 14, color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => {
                if (debouncedQuery.trim().length >= 2) setSuggestions(suggestions);
              }}
              onKeyDown={e => { if (e.key === 'Escape') setSuggestions(null); }}
              placeholder="Search videos, channels, users…"
              style={{
                width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
                borderRadius: suggestions && hasSuggestions ? '12px 12px 0 0' : 999,
                padding: '9px 16px 9px 40px', color: 'var(--text-primary)',
                fontSize: 14, fontFamily: 'DM Sans', transition: 'all 0.2s',
              }}
              onFocusCapture={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        </form>

        {/* Live suggestions dropdown */}
        {hasSuggestions && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'var(--bg-elevated)', border: '1px solid var(--accent)',
            borderTop: 'none', borderRadius: '0 0 14px 14px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            zIndex: 200, overflow: 'hidden',
          }}>
            {/* Video suggestions */}
            {suggestions.videos?.length > 0 && (
              <div>
                <p style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Videos
                </p>
                {suggestions.videos.map(v => (
                  <button
                    key={v._id}
                    onClick={() => goToSuggestion(v.title)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 14px', background: 'transparent', border: 'none',
                      cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
                      fontSize: 13, fontFamily: 'DM Sans', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Film size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{v.title}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Channel suggestions */}
            {suggestions.channels?.length > 0 && (
              <div style={{ borderTop: suggestions.videos?.length ? '1px solid var(--border)' : 'none' }}>
                <p style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Channels
                </p>
                {suggestions.channels.map(c => (
                  <button
                    key={c._id}
                    onClick={() => navigate(`/channel/${c.username}`)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 14px', background: 'transparent', border: 'none',
                      cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
                      fontSize: 13, fontFamily: 'DM Sans', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {c.avatar
                      ? <img src={c.avatar} alt={c.fullname}
                          style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <Users size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    }
                    <span>
                      <span style={{ fontWeight: 500 }}>{c.fullname}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>@{c.username}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* "See all results" footer */}
            <div style={{ borderTop: '1px solid var(--border)', padding: '6px 8px' }}>
              <button
                onClick={handleSearch}
                style={{
                  width: '100%', padding: '8px 14px', background: 'transparent',
                  border: 'none', cursor: 'pointer', color: 'var(--accent)',
                  fontSize: 13, fontFamily: 'DM Sans', textAlign: 'left',
                  borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Search size={13} />
                See all results for <strong style={{ marginLeft: 4 }}>"{query}"</strong>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {user ? (
          <>
            <Link to="/upload" className="btn btn-primary btn-sm hide-mobile">
              <Upload size={15} /> Upload
            </Link>

            {/* User menu */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(v => !v)} style={{
                width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                border: '2px solid var(--border-light)', background: 'var(--bg-elevated)',
                cursor: 'pointer', transition: 'border-color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
              >
                {user.avatar
                  ? <img src={user.avatar} alt={user.fullname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{
                      width: '100%', height: '100%', background: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14, color: '#07070f',
                    }}>{user.fullname?.[0]?.toUpperCase()}</div>
                }
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, minWidth: 200,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)', padding: 8, boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                  animation: 'fadeIn 0.15s ease',
                }}>
                  <div style={{ padding: '10px 14px 14px', borderBottom: '1px solid var(--border)' }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{user.fullname}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{user.username}</p>
                  </div>
                  {[
                    { to: `/channel/${user.username}`, icon: <User size={15}/>, label: 'My Channel' },
                    { to: '/dashboard',                icon: <LayoutDashboard size={15}/>, label: 'Dashboard' },
                    { to: '/settings',                 icon: <Settings size={15}/>, label: 'Settings' },
                  ].map(item => (
                    <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      color: 'var(--text-secondary)', fontSize: 14, borderRadius: 8,
                      transition: 'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      {item.icon} {item.label}
                    </Link>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                    <button onClick={handleLogout} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', color: 'var(--error)', fontSize: 14,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      borderRadius: 8, fontFamily: 'DM Sans', transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = '#ef444420'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login"    className="btn btn-secondary btn-sm">Sign in</Link>
            <Link to="/register" className="btn btn-primary btn-sm hide-mobile">Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}

