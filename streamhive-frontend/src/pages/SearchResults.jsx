
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Film, Users, User, Search, AlertCircle } from 'lucide-react';
import { searchAPI, formatViews, timeAgo, formatDuration } from '../api/index.js';
import VideoCard from '../components/VideoCard.jsx';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function Skeleton({ w = '100%', h = 20, radius = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'var(--bg-elevated)',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  );
}

/* ─── Tab button ───────────────────────────────────────────────────────────── */
function Tab({ label, icon, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 20px', borderRadius: 999,
        fontFamily: 'DM Sans', fontSize: 14, fontWeight: active ? 600 : 400,
        background: active ? 'var(--accent)' : 'var(--bg-elevated)',
        color: active ? '#07070f' : 'var(--text-secondary)',
        border: active ? 'none' : '1px solid var(--border)',
        cursor: 'pointer', transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
    >
      {icon}
      {label}
      {count > 0 && (
        <span style={{
          background: active ? 'rgba(0,0,0,0.2)' : 'var(--bg-hover)',
          color: active ? '#07070f' : 'var(--text-muted)',
          borderRadius: 999, padding: '1px 8px', fontSize: 12, fontWeight: 600,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── Channel card ─────────────────────────────────────────────────────────── */
function ChannelCard({ channel }) {
  return (
    <Link to={`/channel/${channel.username}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '16px 20px', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        transition: 'all 0.2s', cursor: 'pointer',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Avatar */}
        {channel.avatar
          ? <img src={channel.avatar} alt={channel.fullname}
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 24, color: '#07070f', flexShrink: 0,
            }}>{channel.fullname?.[0]?.toUpperCase() ?? '?'}</div>
        }
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
            {channel.fullname}
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            @{channel.username}
          </p>
          {channel.subscriberCount != null && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {formatViews(channel.subscriberCount)} subscribers
            </p>
          )}
        </div>
        {/* Visit label */}
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--accent)',
          padding: '4px 12px', borderRadius: 999,
          border: '1px solid var(--accent-dim)', background: 'var(--accent-dim)',
          flexShrink: 0,
        }}>Visit</span>
      </div>
    </Link>
  );
}

/* ─── User card ─────────────────────────────────────────────────────────────── */
function UserCard({ user }) {
  return (
    <Link to={`/channel/${user.username}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
        transition: 'all 0.2s', cursor: 'pointer',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--border-light)';
          e.currentTarget.style.background = 'var(--bg-elevated)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.background = 'var(--bg-card)';
        }}
      >
        {user.avatar
          ? <img src={user.avatar} alt={user.fullname}
              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--accent2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 18, color: '#fff', flexShrink: 0,
            }}>{user.fullname?.[0]?.toUpperCase() ?? '?'}</div>
        }
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{user.fullname}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{user.username}</p>
        </div>
      </div>
    </Link>
  );
}

/* ─── Empty state ──────────────────────────────────────────────────────────── */
function EmptyState({ query, tab }) {
  const messages = {
    videos:   { emoji: '🎬', text: 'No videos found' },
    channels: { emoji: '📺', text: 'No channels found' },
    users:    { emoji: '👤', text: 'No users found' },
  };
  const { emoji, text } = messages[tab] ?? { emoji: '🔍', text: 'Nothing found' };
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>{emoji}</div>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        {text}
      </h3>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 320 }}>
        We couldn't find any {tab} matching <strong>"{query}"</strong>.
        Try different keywords or check the other tabs.
      </p>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────────── */
export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [activeTab, setActiveTab] = useState('videos');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [results,   setResults]   = useState({ videos: [], channels: [], users: [] });

  /* Fetch whenever query changes */
  useEffect(() => {
    if (!query.trim()) {
      setResults({ videos: [], channels: [], users: [] });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchAPI.global(query, 20)
      .then(({ data }) => {
        if (!cancelled) {
          setResults(data?.data?.results ?? { videos: [], channels: [], users: [] });
          // Auto-switch to first tab that has results
          const r = data?.data?.results ?? {};
          if ((r.videos?.length ?? 0) > 0)        setActiveTab('videos');
          else if ((r.channels?.length ?? 0) > 0) setActiveTab('channels');
          else if ((r.users?.length ?? 0) > 0)    setActiveTab('users');
        }
      })
      .catch(err => {
        if (!cancelled) setError(err?.response?.data?.message ?? 'Search failed. Please try again.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [query]);

  /* ── Skeleton loaders ── */
  if (loading) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Skeleton h={28} w={280} />
        <div style={{ display: 'flex', gap: 10, margin: '24px 0' }}>
          {[1,2,3].map(i => <Skeleton key={i} w={110} h={40} radius={999} />)}
        </div>
        <div style={{
          display: 'grid', gap: 20,
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 18, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Skeleton h={160} radius={0} />
              <div style={{ padding: 14, display: 'flex', gap: 10 }}>
                <Skeleton w={34} h={34} radius={999} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Skeleton h={14} />
                  <Skeleton h={12} w="60%" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes shimmer {
            0%   { opacity: 0.5; }
            50%  { opacity: 1; }
            100% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 24px', textAlign: 'center',
      }}>
        <AlertCircle size={48} style={{ color: 'var(--error)', marginBottom: 16 }} />
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Search error</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: 320 }}>{error}</p>
      </div>
    );
  }

  /* ── No query ── */
  if (!query.trim()) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 24px', textAlign: 'center',
      }}>
        <Search size={56} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
        <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Start searching
        </h3>
        <p style={{ color: 'var(--text-muted)' }}>
          Type something in the search bar above to find videos, channels, and users.
        </p>
      </div>
    );
  }

  const totalResults =
    results.videos.length + results.channels.length + results.users.length;

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Results for{' '}
          <span style={{ color: 'var(--accent)' }}>"{query}"</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {totalResults === 0
            ? 'No results found'
            : `${totalResults} result${totalResults !== 1 ? 's' : ''} across videos, channels, and users`}
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 28,
        flexWrap: 'wrap',
      }}>
        <Tab
          label="Videos"
          icon={<Film size={15} />}
          count={results.videos.length}
          active={activeTab === 'videos'}
          onClick={() => setActiveTab('videos')}
        />
        <Tab
          label="Channels"
          icon={<Users size={15} />}
          count={results.channels.length}
          active={activeTab === 'channels'}
          onClick={() => setActiveTab('channels')}
        />
        <Tab
          label="Users"
          icon={<User size={15} />}
          count={results.users.length}
          active={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
        />
      </div>

      {/* ── Videos tab ── */}
      {activeTab === 'videos' && (
        results.videos.length === 0
          ? <EmptyState query={query} tab="videos" />
          : (
            <div style={{
              display: 'grid', gap: 20,
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}>
              {results.videos.map(video => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>
          )
      )}

      {/* ── Channels tab ── */}
      {activeTab === 'channels' && (
        results.channels.length === 0
          ? <EmptyState query={query} tab="channels" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {results.channels.map(channel => (
                <ChannelCard key={channel._id} channel={channel} />
              ))}
            </div>
          )
      )}

      {/* ── Users tab ── */}
      {activeTab === 'users' && (
        results.users.length === 0
          ? <EmptyState query={query} tab="users" />
          : (
            <div style={{
              display: 'grid', gap: 12,
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            }}>
              {results.users.map(user => (
                <UserCard key={user._id} user={user} />
              ))}
            </div>
          )
      )}
    </div>
  );
}
