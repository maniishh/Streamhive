import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL + '/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const { data } = await axios.post(`${BASE_URL}/users/refresh-token`, {}, { withCredentials: true });
        const newToken = data?.data?.accessToken;
        if (newToken) {
          localStorage.setItem('accessToken', newToken);
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api(error.config);
        }
      } catch {
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

/* ── AUTH ── */
export const authAPI = {
  register: (formData) => api.post('/users/register', formData),
  login:    (data)     => api.post('/users/login', data),
  logout:   ()         => api.post('/users/logout'),
  refreshToken: ()     => api.post('/users/refresh-token'),
  getCurrentUser: ()   => api.get('/users/current-user'),
  changePassword: (data) => api.post('/users/change-password', data),
  updateAccount:  (data) => api.patch('/users/update-account', data),
  updateAvatar:   (formData) => api.patch('/users/avatar', formData),
  updateCoverImage: (formData) => api.patch('/users/cover-image', formData),
  getChannelProfile: (username) => api.get(`/users/c/${username}`),
  getWatchHistory: () => api.get('/users/history'),
};

/* ── VIDEOS ── */
export const videoAPI = {
  getAll: (params) => api.get('/videos', { params }),
  getById: (videoId) => api.get(`/videos/${videoId}`),
  publish: (formData) => api.post('/videos', formData),
  update:  (videoId, formData) => api.patch(`/videos/${videoId}`, formData),
  delete:  (videoId) => api.delete(`/videos/${videoId}`),
  togglePublish: (videoId) => api.patch(`/videos/toggle/publish/${videoId}`),
};

/* ── COMMENTS ── */
export const commentAPI = {
  getVideoComments: (videoId, params) => api.get(`/comments/${videoId}`, { params }),
  addComment:    (videoId, data) => api.post(`/comments/${videoId}`, data),
  updateComment: (commentId, data) => api.patch(`/comments/c/${commentId}`, data),
  deleteComment: (commentId) => api.delete(`/comments/c/${commentId}`),
};

/* ── LIKES ── */
export const likeAPI = {
  toggleVideoLike:   (videoId)   => api.post(`/likes/toggle/v/${videoId}`),
  toggleCommentLike: (commentId) => api.post(`/likes/toggle/c/${commentId}`),
  toggleTweetLike:   (tweetId)   => api.post(`/likes/toggle/t/${tweetId}`),
  getLikedVideos:    ()          => api.get('/likes/videos'),
};

/* ── SUBSCRIPTIONS ── */
export const subscriptionAPI = {
  toggleSubscription:    (channelId)    => api.post(`/subscriptions/c/${channelId}`),
  getSubscribedChannels: (channelId)    => api.get(`/subscriptions/c/${channelId}`),
  getChannelSubscribers: (subscriberId) => api.get(`/subscriptions/u/${subscriberId}`),
};

/* ── TWEETS ── */
export const tweetAPI = {
  create:     (data)    => api.post('/tweets', data),
  getUserTweets: (userId) => api.get(`/tweets/user/${userId}`),
  update:     (tweetId, data) => api.patch(`/tweets/${tweetId}`, data),
  delete:     (tweetId) => api.delete(`/tweets/${tweetId}`),
};

/* ── PLAYLISTS ── */
export const playlistAPI = {
  create:      (data)       => api.post('/playlists', data),
  getById:     (playlistId) => api.get(`/playlists/${playlistId}`),
  update:      (playlistId, data) => api.patch(`/playlists/${playlistId}`, data),
  delete:      (playlistId) => api.delete(`/playlists/${playlistId}`),
  addVideo:    (videoId, playlistId) => api.patch(`/playlists/add/${videoId}/${playlistId}`),
  removeVideo: (videoId, playlistId) => api.patch(`/playlists/remove/${videoId}/${playlistId}`),
  getUserPlaylists: (userId) => api.get(`/playlists/user/${userId}`),
};

/* ── DASHBOARD ── */
export const dashboardAPI = {
  getStats:  () => api.get('/dashboard/stats'),
  getVideos: () => api.get('/dashboard/videos'),
};

/* ── HELPERS ── */
export function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

export function formatViews(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = diff / 1000;
  if (s < 60)    return `${Math.floor(s)}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s/86400)}d ago`;
  if (s < 31536000) return `${Math.floor(s/2592000)}mo ago`;
  return `${Math.floor(s/31536000)}y ago`;
}
