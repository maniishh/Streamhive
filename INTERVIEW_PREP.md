# StreamHive — Interview Preparation Notes

## 30-second project explanation

StreamHive is a full-stack, YouTube-inspired video platform. Users can register, upload videos and thumbnails, watch videos, comment and reply, like content, subscribe to creators, manage playlists, and use a creator dashboard. I built the client with React and Vite, and the REST API with Node.js, Express, MongoDB/Mongoose. Media files are uploaded through Multer to Cloudinary. I used JWT access and refresh tokens for authentication, Redis for feed caching and high-write view counting, node-cron to batch-persist views to MongoDB, and Socket.IO for real-time notifications.

## Architecture

```text
React pages/components
  -> Axios API layer (Bearer access token + credentials)
  -> Express routes -> auth/upload middleware -> controllers
  -> Mongoose models -> MongoDB

Media path: browser -> Multer temporary disk file -> Cloudinary -> URL in MongoDB
View path: watch request -> Redis INCR -> cron every 5 min -> MongoDB $inc
Notification path: comment/reply -> MongoDB notification -> Socket.IO if recipient connected
```

## What each backend layer does

- `src/index.js`: process entry point. Connects MongoDB, starts Redis, Socket.IO and the cron job, then handles graceful shutdown.
- `src/app.js`: Express configuration: CORS, JSON/body parsing, cookies, and API route mounting under `/api/v1`.
- `routes/`: maps HTTP verb and path to controllers; applies `verifyJWT` and Multer where required.
- `middlewares/auth.middleware.js`: reads access token from the HTTP-only cookie or `Authorization: Bearer ...`, verifies it, and places the user on `req.user`.
- `middlewares/multer.middleware.js`: writes multipart uploads temporarily to `public/temp`; has a 500 MB per-file limit and collision-resistant filename.
- `controllers/`: request validation, authorization, application logic, MongoDB queries and response construction.
- `models/`: Mongoose document shapes and indexes.
- `utils/`: Cloudinary, Redis cache helpers, Socket.IO helpers, cron/view counter, async/error response wrappers.

## Frontend structure

- `src/main.jsx`: mounts Router, authentication context, notification context and toast provider.
- `src/App.jsx`: page routes plus `Protected` and `GuestOnly` guards.
- `src/api/index.js`: the single Axios client and API functions. It adds the access token and retries one failed request after a shared refresh-token request.
- `src/context/AuthContext.jsx`: global logged-in user, loading state, login/logout actions.
- `src/context/NotificationContext.jsx`: fetches notifications and opens Socket.IO after login; REST stays as fallback.
- `src/pages/`: screen-level composition and local UI state.
- `src/components/`: reusable layout/navigation/cards/toasts.

## Core flows you should be able to narrate

### Login and token refresh

1. User submits email/username and password.
2. Server compares the password with bcrypt.
3. Server creates a short-lived JWT access token and a longer refresh token; the refresh token is stored in the user record so it can be revoked/rotated.
4. Server sets secure, HTTP-only cookies and also returns the access token.
5. Axios stores the access token and sends it in the Authorization header.
6. On a 401, Axios creates only one refresh request (`refreshPromise`); concurrent failed requests wait for it, then retry with the new token. If it fails, it clears auth state.

Why two tokens? The access token limits exposure time; the refresh token lets the user remain signed in without repeatedly entering credentials. Rotation reduces the value of a stolen old refresh token.

### Video upload

1. React sends `FormData` containing title, description, video file and thumbnail, and displays Axios upload progress.
2. Multer saves files to temporary disk storage.
3. The controller checks inputs and authenticated creator identity.
4. Cloudinary uploads the assets. Large files use `upload_large` with 6 MB chunks to avoid a huge one-shot upload.
5. MongoDB stores Cloudinary URLs, duration, metadata, owner and publish state.
6. The server invalidates cached feed and trending keys.

### Video feed and cache

`getAllVideos` filters to published videos, optionally filters by owner/query, joins the owner using `$lookup`, sorts and paginates with `$skip`/`$limit`. Results are cached in Redis for five minutes, or ten minutes for view-sorted trending results. Upload/update/delete/publish-toggle invalidates feed and trending cache keys using Redis `SCAN`, avoiding blocking `KEYS`.

### Scalable view counting

A naive approach would issue one MongoDB write per watch. Instead, each watch asynchronously calls Redis `INCR` on `views:<videoId>`; increment is atomic and fast. A cron job runs every five minutes, scans view keys, uses MongoDB `$inc` to add the batch, then deletes each successfully persisted Redis key. Shutdown stops the cron job and forces a final sync.

Trade-off: displayed views can lag by up to about five minutes because the watch endpoint returns MongoDB's already-synced count. This buys much lower database write load. For production, I would use a durable queue/stream or a managed Redis with persistence and idempotency safeguards to reduce loss/duplication risk during failures.

### Comments and notifications

Comments store a `parentComment`, so a top-level comment has `null` and a reply points to its parent. The comments query uses aggregation to join author details and calculate reply count; replies load separately on demand. Creating a comment/reply writes a notification document, skips self-notifications, and emits `notification:new` to the recipient's mapped Socket.IO connection. Notifications remain available through REST if the recipient is offline.

## Data model relationships

| Collection | Key relationships |
| --- | --- |
| User | watchHistory -> Video; refreshToken |
| Video | owner -> User |
| Comment | video -> Video; owner -> User; parentComment -> Comment |
| Like | one of video/comment/tweet; `LikedBy` -> User |
| Subscription | subscriber -> User; channel -> User |
| Playlist | videos -> Video; createdBy -> User |
| Tweet | owner -> User |
| Notification | recipient/sender -> User |

## Good technical decisions to highlight

- Layered route/controller/model separation makes the API easier to maintain and test.
- Passwords are salted/hashed by a Mongoose pre-save bcrypt hook; plaintext passwords are never stored.
- Owner checks prevent non-creators from updating/deleting another creator's video or comment.
- MongoDB indexes support published-video filters, owner filters, newest/trending sorts, and text-search intent.
- `asyncHandler`, `ApiError`, and `ApiResponse` standardize asynchronous errors and response shape.
- Real-time notifications are an enhancement, not a single point of failure, because REST provides a fallback.

## Honest limitations in this snapshot and how to improve them

Do not hide these if an interviewer asks you to review the code.

1. **Public/private route mismatch:** `video.routes.js` applies `verifyJWT` to every video endpoint and `user.routes.js` protects channel profiles, but the frontend labels watch, feed and channel pages public. Fix with optional-auth middleware for read endpoints, and keep uploads/mutations protected.
2. **Field-name mismatch:** the User schema stores `fullname`, while several projections/frontend components request or render `fullName`. Standardize on one field name, add a serializer for API output, and update every projection.
3. **Likes/subscriptions need unique compound indexes:** a rapid double request can create duplicates. Add unique indexes such as `{ video: 1, LikedBy: 1 }` (with partial filters for other target types) and `{ subscriber: 1, channel: 1 }`, then handle duplicate-key errors.
4. **Upload update mismatch:** the update route uses `upload.single('thumbnail')`, but its controller checks `req.files.thumbnail`. Read `req.file` or switch the middleware to `upload.fields`.
5. **Registration assumes cover image exists:** it dereferences `req.files.coverImage[0]`; make cover image genuinely optional or validate it explicitly before accessing it.
6. **Media deletion is incomplete:** deleting a video only deletes MongoDB metadata, not Cloudinary assets or dependent likes/comments/playlists. Store Cloudinary `public_id`, use transactions/outbox-style cleanup, and remove dependencies deliberately.
7. **Token exposure:** the access token is kept in `localStorage` despite cookie support, which increases XSS blast radius. Prefer short-lived access tokens in secure HTTP-only cookies with CSRF protection, or make the trade-off explicit.
8. **Socket identity is client supplied:** the Socket.IO handshake accepts `userId` directly. Authenticate the socket using a verified JWT, not a claimed ID.
9. **Search index vs query mismatch:** schemas define text indexes, but controllers use escaped case-insensitive regex, which may not use those indexes efficiently at scale. Use `$text` for token search or Atlas Search for ranking/autocomplete.

## Likely interviewer questions and compact answers

**Why MongoDB?** The domain is document-oriented and references are simple; Mongoose schemas let me evolve creator/video metadata rapidly. For complex financial-like constraints or multi-entity transactions, I would consider PostgreSQL.

**Why Redis as well as MongoDB?** MongoDB is the source of truth. Redis is the fast, disposable layer for cache reads and atomic high-frequency view increments. The app bypasses cache safely if Redis is disconnected.

**How do you avoid cache stampede?** This version uses TTL and invalidation but does not fully solve it. At higher scale I would add request coalescing/single-flight, stale-while-revalidate, and possibly distributed locks.

**How do you authorize actions?** `verifyJWT` attaches the authenticated user. Controllers compare resource owner IDs to `req.user._id` before mutations. Authentication answers who you are; authorization answers whether you may do this action.

**How would you test it?** Unit-test pure utilities/token behavior, integration-test route/controller flows against an isolated MongoDB, mock Cloudinary/Redis, and add Playwright/Cypress E2E tests for login, upload, watch, comment, and refresh flow.

**How would you deploy it?** Build the Vite static client and serve it from Vercel/CDN; deploy Express separately with environment secrets; use MongoDB Atlas, managed Redis and Cloudinary; set explicit CORS origins, HTTPS cookies and health checks. For Socket.IO, use sticky sessions or a Redis adapter when horizontally scaled.

## A strong closing statement

The project taught me that a media application is not just CRUD. Uploads need storage and cleanup, authentication needs token lifecycle design, read-heavy feeds benefit from caching, high-frequency counters need write batching, and real-time UX needs a durable REST fallback. Given another iteration, my first production hardening work would be endpoint-access consistency, data-integrity indexes, authenticated sockets, media cleanup, and automated tests.
