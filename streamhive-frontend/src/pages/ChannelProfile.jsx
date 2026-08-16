import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Bell, BellOff, Users, Video, ListVideo, MessageSquare, Edit2, Trash2 } from 'lucide-react';
import { authAPI, videoAPI, tweetAPI, playlistAPI, subscriptionAPI, formatViews, timeAgo } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { toast } from '../components/Toast.jsx';
import VideoCard from '../components/VideoCard.jsx';

export default function ChannelProfile() {
  const { username }  = useParams();
  const { user }      = useAuth();
  const [channel, setChannel]     = useState(null);
  const [videos, setVideos]       = useState([]);
  const [tweets, setTweets]       = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [subscribed, setSubscribed] = useState(false);
  const [tab, setTab]             = useState('videos');
  const [loading, setLoading]     = useState(true);
  const [newTweet, setNewTweet]   = useState('');
  const [editTweetId, setEditTweetId] = useState(null);
  const [editTweetText, setEditTweetText] = useState('');

  const isOwn = user?.username === username;

  useEffect(() => {
    loadChannel();
  }, [username]);

  const loadChannel = async () => {
    setLoading(true);
    try {
      const { data } = await authAPI.getChannelProfile(username);
      const ch = data.data;
      setChannel(ch);
      setSubscribed(ch.isSubscribed);
      // Load videos
      const vRes = await videoAPI.getAll({ userId: ch._id });
      setVideos(vRes.data.data || []);
      // Load tweets
      try {
        const tRes = await tweetAPI.getUserTweets(ch._id);
        setTweets(tRes.data.data || []);
      } catch {}
      // Load playlists
      try {
        const pRes = await playlistAPI.getUserPlaylists(ch._id);
        setPlaylists(pRes.data.data || []);
      } catch {}
    } catch {
      toast.error('Channel not found');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) { toast.warning('Sign in to subscribe'); return; }
    try {
      await subscriptionAPI.toggleSubscription(channel._id);
      setSubscribed(v => !v);
      setChannel(c => ({ ...c, subscriberCount: subscribed ? c.subscriberCount - 1 : c.subscriberCount + 1 }));
      toast.success(subscribed ? 'Unsubscribed' : 'Subscribed!');
    } catch { toast.error('Failed to update subscription'); }
  };

  const postTweet = async (e) => {
    e.preventDefault();
    if (!newTweet.trim()) return;
    try {
      await tweetAPI.create({ content: newTweet });
      setNewTweet('');
      const tRes = await tweetAPI.getUserTweets(channel._id);
      setTweets(tRes.data.data || []);
      toast.success('Tweet posted!');
    } catch { toast.error('Failed to post tweet'); }
  };

  const saveTweet = async (id) => {
    if (!editTweetText.trim()) return;
    try {
      await tweetAPI.update(id, { content: editTweetText });
      setEditTweetId(null);
      const tRes = await tweetAPI.getUserTweets(channel._id);
      setTweets(tRes.data.data || []);
      toast.success('Tweet updated');
    } catch { toast.error('Failed to update'); }
  };

  const deleteTweet = async (id) => {
    if (!confirm('Delete this tweet?')) return;
    try {
      await tweetAPI.delete(id);
      setTweets(prev => prev.filter(t => t._id !== id));
      toast.success('Tweet deleted');
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="spinner-wrap"><div className="spinner"/></div>;
  if (!channel) return <div className="empty-state"><h3>Channel not found</h3></div>;

  return (
    <div>
      {/* Cover + Avatar */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <div style={{
          height: 200, borderRadius: 'var(--radius-xl)', overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--bg-elevated), #1a1a3e)',
        }}>
          {channel.coverImage && (
            <img src={channel.coverImage} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>

        {/* Channel info row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid var(--bg-base)', background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 800, color: '#07070f', flexShrink: 0,
            }}>
              {channel.avatar
                ? <img src={channel.avatar} alt={channel.fullname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : channel.fullname?.[0]?.toUpperCase()
              }
            </div>
            <div>
              <h1 style={{ fontFamily: 'Syne', fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800 }}>
                {channel.fullname}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>@{channel.username}</p>
              <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
                <Stat icon={<Users size={14}/>} value={formatViews(channel.subscriberCount)} label="subscribers" />
                <Stat icon={<Video size={14}/>} value={videos.length} label="videos" />
              </div>
            </div>
          </div>

          {!isOwn && (
            <button onClick={handleSubscribe} className={`btn ${subscribed ? 'btn-secondary' : 'btn-primary'}`}>
              {subscribed ? <><BellOff size={15}/> Subscribed</> : <><Bell size={15}/> Subscribe</>}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-nav">
        {[
          { key: 'videos',    label: 'Videos',    icon: <Video size={15}/> },
          { key: 'playlists', label: 'Playlists', icon: <ListVideo size={15}/> },
          { key: 'tweets',    label: 'Community', icon: <MessageSquare size={15}/> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'videos' && (
        videos.length === 0
          ? <div className="empty-state"><Video size={64} /><h3>No videos yet</h3><p>This channel hasn't uploaded any videos.</p></div>
          : <div className="video-grid">{videos.map(v => <VideoCard key={v._id} video={v}/>)}</div>
      )}

      {tab === 'playlists' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {playlists.length === 0
            ? <div className="empty-state" style={{ gridColumn: '1/-1' }}><ListVideo size={64}/><h3>No playlists</h3></div>
            : playlists.map(p => <PlaylistCard key={p._id} playlist={p}/>)
          }
        </div>
      )}

      {tab === 'tweets' && (
        <div style={{ maxWidth: 680 }}>
          {isOwn && (
            <form onSubmit={postTweet} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="avatar" style={{
                  width: 40, height: 40, background: 'var(--accent)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 16, color: '#07070f', overflow: 'hidden',
                }}>
                  {user.avatar ? <img src={user.avatar} style={{ width:'100%',height:'100%',objectFit:'cover' }}/> : user.fullname?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea value={newTweet} onChange={e => setNewTweet(e.target.value)}
                    placeholder="Share something with your community…"
                    rows={3} className="input-field" style={{ resize: 'vertical', marginBottom: 10 }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={!newTweet.trim()} className="btn btn-primary btn-sm">
                      Post Tweet
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tweets.length === 0
              ? <div className="empty-state"><MessageSquare size={64}/><h3>No posts yet</h3></div>
              : tweets.map(t => {
                  const isMine = user && (user._id === t.owner?._id || user._id === t.owner);
                  return (
                    <div key={t._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ width: 36, height: 36, background: 'var(--bg-elevated)', overflow: 'hidden', display:'flex',alignItems:'center',justifyContent:'center' }}>
                            {channel.avatar ? <img src={channel.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{color:'var(--accent)',fontWeight:700}}>{channel.fullname?.[0]}</span>}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 14 }}>{channel.fullname}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(t.createdAt)}</p>
                          </div>
                        </div>
                        {isMine && editTweetId !== t._id && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditTweetId(t._id); setEditTweetText(t.content); }} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}><Edit2 size={13}/></button>
                            <button onClick={() => deleteTweet(t._id)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: 'var(--error)' }}><Trash2 size={13}/></button>
                          </div>
                        )}
                      </div>
                      {editTweetId === t._id
                        ? <div>
                            <textarea value={editTweetText} onChange={e => setEditTweetText(e.target.value)} rows={3} className="input-field" style={{ marginBottom: 8, resize: 'vertical' }}/>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => saveTweet(t._id)} className="btn btn-primary btn-sm">Save</button>
                              <button onClick={() => setEditTweetId(null)} className="btn btn-ghost btn-sm">Cancel</button>
                            </div>
                          </div>
                        : <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{t.content}</p>
                      }
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-muted)' }}>
      {icon} <strong style={{ color: 'var(--text-primary)' }}>{value}</strong> {label}
    </span>
  );
}

function PlaylistCard({ playlist }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ aspectRatio: '16/9', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ListVideo size={32} style={{ color: 'var(--text-muted)' }}/>
      </div>
      <div style={{ padding: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{playlist.name}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{playlist.description}</p>
      </div>
    </div>
  );
}
