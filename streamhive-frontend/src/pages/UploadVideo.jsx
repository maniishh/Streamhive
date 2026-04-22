import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Film, Image, CheckCircle, CloudUpload } from 'lucide-react';
import { videoAPI } from '../api/index.js';
import { toast } from '../components/Toast.jsx';

export default function UploadVideo() {
  const navigate = useNavigate();
  const videoRef     = useRef();
  const thumbRef     = useRef();

  const [form, setForm] = useState({ title: '', description: '' });
  const [videoFile, setVideoFile]     = useState(null);
  const [thumbnail, setThumbnail]     = useState(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [videoDragOver, setVideoDragOver] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [progress, setProgress]       = useState(0);
  const [uploadPhase, setUploadPhase] = useState('idle'); // 'idle' | 'uploading' | 'processing'
  const [done, setDone]               = useState(false);
  const [uploadedId, setUploadedId]   = useState(null);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleVideoDrop = (e) => {
    e.preventDefault();
    setVideoDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) setVideoFile(file);
    else toast.error('Please drop a valid video file');
  };

  const handleThumb = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setThumbnail(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!videoFile) { toast.error('Please select a video file'); return; }
    if (!thumbnail) { toast.error('Please select a thumbnail'); return; }
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }

    setLoading(true);
    setProgress(0);
    setUploadPhase('uploading');

    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('videoFile', videoFile);
    fd.append('thumbnail', thumbnail);

    try {
      const { data } = await videoAPI.publish(fd, (progressEvent) => {
        if (progressEvent.lengthComputable) {
          // Scale client→server upload to 0–90%
          const pct = Math.round((progressEvent.loaded / progressEvent.total) * 90);
          setProgress(pct);
          if (pct >= 90) setUploadPhase('processing'); // server is now uploading to Cloudinary
        }
      });
      setProgress(100);
      setUploadPhase('idle');
      setDone(true);
      setUploadedId(data.data?._id);
      toast.success('Video published successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
      setLoading(false);
      setProgress(0);
      setUploadPhase('idle');
    }
  };

  if (done) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 20 }}>
      <div style={{
        width: 80, height: 80, background: '#22c55e22', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid var(--success)',
      }}>
        <CheckCircle size={36} style={{ color: 'var(--success)' }}/>
      </div>
      <h2 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800 }}>Upload Successful!</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 16, textAlign: 'center', maxWidth: 400 }}>
        Your video has been published and is now available to viewers.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {uploadedId && (
          <button onClick={() => navigate(`/watch/${uploadedId}`)} className="btn btn-primary btn-lg">
            View Video
          </button>
        )}
        <button onClick={() => { setDone(false); setForm({ title:'', description:'' }); setVideoFile(null); setThumbnail(null); setThumbPreview(''); setProgress(0); setUploadPhase('idle'); }} className="btn btn-secondary btn-lg">
          Upload Another
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, background: 'var(--accent-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={18} style={{ color: 'var(--accent)' }}/>
          </div>
          <h1>Upload Video</h1>
        </div>
        <p>Share your content with the StreamHive community</p>
      </div>

      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Left column */}
          <div>
            {/* Video drop zone */}
            <div className="form-group">
              <label>Video File *</label>
              <div
                style={{
                  border: `2px dashed ${videoDragOver ? 'var(--accent)' : videoFile ? 'var(--success)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)', padding: '40px 24px',
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  background: videoDragOver ? 'var(--accent-dim)' : videoFile ? '#22c55e10' : 'var(--bg-input)',
                }}
                onDragOver={e => { e.preventDefault(); setVideoDragOver(true); }}
                onDragLeave={() => setVideoDragOver(false)}
                onDrop={handleVideoDrop}
                onClick={() => videoRef.current.click()}
              >
                {videoFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={36} style={{ color: 'var(--success)' }}/>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{videoFile.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <span style={{ fontSize: 12, color: 'var(--success)' }}>Ready to upload</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                    <CloudUpload size={40}/>
                    <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>Drop video here</p>
                    <p style={{ fontSize: 13 }}>or click to browse</p>
                    <p style={{ fontSize: 12 }}>MP4, MOV, AVI, MKV supported</p>
                  </div>
                )}
              </div>
              <input ref={videoRef} type="file" accept="video/*" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) setVideoFile(e.target.files[0]); }} />
            </div>

            {/* Thumbnail */}
            <div className="form-group">
              <label>Thumbnail *</label>
              <div style={{
                aspectRatio: '16/9', border: `2px dashed ${thumbnail ? 'var(--success)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer',
                background: 'var(--bg-input)', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
                onClick={() => thumbRef.current.click()}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = thumbnail ? 'var(--success)' : 'var(--border)'}
              >
                {thumbPreview
                  ? <img src={thumbPreview} alt="Thumbnail preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                      <Image size={28}/><span style={{ fontSize: 13 }}>Upload thumbnail</span>
                    </div>
                }
              </div>
              <input ref={thumbRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleThumb}/>
            </div>
          </div>

          {/* Right column */}
          <div>
            <div className="form-group">
              <label>Title *</label>
              <input name="title" value={form.title} onChange={handle}
                placeholder="Give your video a catchy title…" required className="input-field"/>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea name="description" value={form.description} onChange={handle}
                placeholder="Describe what your video is about…"
                rows={10} className="input-field" style={{ resize: 'vertical' }}/>
            </div>

            {/* Tips */}
            <div style={{ background: 'var(--accent-dim)', border: '1px solid #f5a62333', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>💡 Upload Tips</p>
              {['Use a clear, descriptive title', 'Add relevant keywords in the description', 'High-quality thumbnails get more clicks', 'Minimum resolution: 720p recommended'].map(tip => (
                <p key={tip} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>• {tip}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {loading && (
          <div style={{ margin: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {uploadPhase === 'processing'
                  ? 'Processing on server…'
                  : progress >= 100
                  ? 'Done!'
                  : `Uploading… ${progress}%`}
              </span>
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{progress}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`, background: 'var(--accent)',
                borderRadius: 999, transition: 'width 0.5s ease',
              }}/>
            </div>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }}>
          {loading
            ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}/> Uploading…</>
            : <><Film size={18}/> Publish Video</>
          }
        </button>
      </form>

      <style>{`@media (max-width: 700px) { form > div { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
