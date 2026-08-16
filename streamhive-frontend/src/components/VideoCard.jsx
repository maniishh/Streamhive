import { Link } from 'react-router-dom';
import { formatDuration, formatViews, timeAgo } from '../api/index.js';

export default function VideoCard({ video }) {
  const owner = video.owner || {};

  return (
    <Link to={`/watch/${video._id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.borderColor = 'var(--border-light)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Thumbnail */}
        <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--bg-elevated)' }}>
          {video.thumbnail
            ? <img src={video.thumbnail} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--bg-elevated), var(--border))' }} />
          }
          {/* Duration badge */}
          {video.duration > 0 && (
            <span style={{
              position: 'absolute', bottom: 8, right: 8,
              background: 'rgba(7,7,15,0.85)', color: 'var(--text-primary)',
              fontSize: 12, fontWeight: 600, padding: '2px 7px',
              borderRadius: 4, backdropFilter: 'blur(4px)',
            }}>
              {formatDuration(video.duration)}
            </span>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '14px' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to={`/channel/${owner.username}`} onClick={e => e.stopPropagation()}
              style={{ flexShrink: 0, marginTop: 2 }}>
              {owner.avatar
                ? <img src={owner.avatar} alt={owner.fullname} className="avatar"
                    style={{ width: 34, height: 34 }} />
                : <div className="avatar" style={{
                    width: 34, height: 34, background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: '#07070f',
                  }}>{owner.fullname?.[0]?.toUpperCase() || '?'}</div>
              }
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontSize: 14, fontWeight: 600, lineHeight: 1.4,
                color: 'var(--text-primary)',
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                marginBottom: 6,
              }}>{video.title}</h3>
              <Link to={`/channel/${owner.username}`} onClick={e => e.stopPropagation()}
                style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                {owner.fullname || owner.username}
              </Link>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {formatViews(video.views)} views · {timeAgo(video.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
