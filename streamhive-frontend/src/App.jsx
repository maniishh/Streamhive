
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';

import Home           from './pages/Home.jsx';
import Login          from './pages/Login.jsx';
import Register       from './pages/Register.jsx';
import VideoPage      from './pages/VideoPage.jsx';
import ChannelProfile from './pages/ChannelProfile.jsx';
import WatchHistory   from './pages/WatchHistory.jsx';
import UploadVideo    from './pages/UploadVideo.jsx';
import Playlists      from './pages/Playlists.jsx';
import Dashboard      from './pages/Dashboard.jsx';
import LikedVideos    from './pages/LikedVideos.jsx';
import Settings       from './pages/Settings.jsx';
import SearchResults  from './pages/SearchResults.jsx'; // NEW

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      {/* Guest-only */}
      <Route path="/login"    element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

      {/* Public with layout */}
      <Route path="/"                   element={<Layout><Home /></Layout>} />
      <Route path="/watch/:videoId"     element={<Layout><VideoPage /></Layout>} />
      <Route path="/channel/:username"  element={<Layout><ChannelProfile /></Layout>} />

      {/* NEW: Global search results page (public) */}
      <Route path="/search" element={<Layout><SearchResults /></Layout>} />

      {/* Protected */}
      <Route path="/history"   element={<Protected><Layout><WatchHistory /></Layout></Protected>} />
      <Route path="/liked"     element={<Protected><Layout><LikedVideos /></Layout></Protected>} />
      <Route path="/playlists" element={<Protected><Layout><Playlists /></Layout></Protected>} />
      <Route path="/upload"    element={<Protected><Layout><UploadVideo /></Layout></Protected>} />
      <Route path="/dashboard" element={<Protected><Layout><Dashboard /></Layout></Protected>} />
      <Route path="/settings"  element={<Protected><Layout><Settings /></Layout></Protected>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

