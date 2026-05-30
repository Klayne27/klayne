# Klayne Architecture

## Folder Structure

```text
.
|-- backend
|   |-- config            Firebase Admin SDK setup
|   |-- controllers       Route handlers and business logic
|   |-- cron              Scheduled post publishing and study/Wordle reset jobs
|   |-- data/wordle       Wordle solution and valid guess CSV files
|   |-- db                MongoDB connection setup
|   |-- lib
|   |   |-- socket.js     Socket.io server, online state, realtime event helpers
|   |   `-- utils         Tokens, push notifications, hashtags, unlocks, Wordle, helpers
|   |-- middleware        JWT route protection and admin authorization
|   |-- models            Mongoose schemas
|   `-- routes            Express route registration by resource
|-- frontend
|   |-- src
|   |   |-- api           Fetch wrappers for backend endpoints
|   |   |-- components    Shared common UI, skeletons, and SVGs
|   |   |-- constants     Themes, quotes, numbers, Pomodoro presets, modal config, Wordle words
|   |   |-- context       Socket and theme providers
|   |   |-- features      Feature modules with components and React Query hooks
|   |   |-- hooks         Reusable custom hooks, image hooks, global socket hooks
|   |   |-- pages         Route-level page components
|   |   |-- services      Firebase client initialization
|   |   |-- store         Zustand stores for UI and feature state
|   |   |-- styles        Global, ring, and nameplate CSS
|   |   |-- utils         Formatting, text rendering, push, Cloudinary, badges, dates
|   |   `-- sw.js         Service worker for PWA push notifications
|   |-- vite.config.js    React/Vite/PWA config and dev proxy
|   |-- tailwind.config.js
|   `-- eslint.config.js
|-- package.json          Backend scripts and shared production build/start scripts
`-- frontend/package.json Frontend dependencies and Vite scripts
```

## Runtime Request Flow

```text
Browser
  |
  | React route or user action
  v
Frontend component/page
  |
  | TanStack Query hook or direct API helper in frontend/src/api
  v
fetch("/api/...")
  |
  | Development: Vite proxy to http://localhost:5000
  | Production: same Express origin serves API and frontend
  v
Express route in backend/routes
  |
  | protectRoute reads jwt cookie, verifies JWT_SECRET, loads User
  | isAdmin checks req.user.isAdmin where needed
  v
Controller in backend/controllers
  |
  | Reads/writes Mongoose models
  | Uploads/deletes Cloudinary media when needed
  | Emits Socket.io events or sends Web Push notifications when needed
  v
MongoDB / Cloudinary / Firebase Admin / Web Push
  |
  v
JSON response
  |
  v
React Query cache update, Zustand state update, or component render
```

## Production Serving Flow

```text
Render service
  |
  | npm run build
  v
frontend/dist generated
  |
  | npm start
  v
Express serves /api routes and static frontend/dist
  |
  | app.get("/*splat")
  v
frontend/dist/index.html for client-side routes
```

## Authentication Flow

Email/password auth:

```text
POST /api/auth/signup or /api/auth/login
  -> validate user input
  -> hash or compare password with bcryptjs
  -> generate JWT using JWT_SECRET
  -> set httpOnly cookie named jwt
  -> frontend uses GET /api/auth/me to hydrate auth state
```

Google auth:

```text
GoogleSignInButton
  -> Firebase signInWithPopup
  -> frontend sends Firebase idToken to POST /api/auth/google
  -> backend Firebase Admin verifies token
  -> backend links or creates User by email/googleId
  -> backend sets jwt cookie
```

## Realtime Event Map

### Connection and Presence

| Event | Direction | Purpose |
| --- | --- | --- |
| `getOnlineUsers` | server to client | Broadcasts currently online users, excluding users who chose offline status. |
| `heartbeat` | client to server | Refreshes last-active timestamp for online presence cleanup. |
| `changeOnlineStatus` | client to server | Switches a user between online and offline presence modes. |

### Private and Group Chat

| Event | Direction | Purpose |
| --- | --- | --- |
| `joinConversation` | client to server | Joins a Socket.io room for a DM or group conversation. |
| `leaveConversation` | client to server | Leaves a conversation room. |
| `typing` / `stopTyping` | client to server | Tracks typing state per conversation. |
| `typing_update` | server to client | Sends current typing users to conversation recipients. |
| `userActiveInChat` | client to server | Marks which conversation a user is actively viewing for unread calculations. |
| `markMessagesAsSeen` | client to server | Marks DM/group messages as seen and broadcasts read receipts. |
| `newMessage` | server to client | Delivers new DM/group messages. |
| `messageDeleted` | server to client | Removes a deleted message from clients. |
| `messageEdited` | server to client | Updates edited message text. |
| `messageReacted` | server to client | Updates message reactions. |
| `messagesSeen` | server to client | DM seen indicator for senders. |
| `groupMessagesSeen` | server to client | Per-reader group/DM read receipt payload. |
| `conversationUpdated` | server to client | Refreshes conversation metadata and last message state. |
| `pinnedMessage` | server to client | Updates pinned message state. |

### Group Administration

| Event | Direction | Purpose |
| --- | --- | --- |
| `addedToGroup` | server to client | Notifies users they were added to a group. |
| `removedFromGroup` | server to client | Notifies users they were removed or kicked. |
| `groupDeleted` | server to client | Removes a deleted group from clients. |
| `groupUpdated` | server to client | Refreshes group settings or metadata. |
| `messageDeletedByAdmin` | server to client | Marks group message moderation deletion. |
| `joinRequestRejected` | server to client | Notifies a user that a private group join request was rejected. |

### Public Chat

| Event | Direction | Purpose |
| --- | --- | --- |
| `userEnteredPublicChat` / `userLeftPublicChat` | client to server | Tracks active public-chat readers and unread counts. |
| `public_typing` / `public_stop_typing` | client to server | Tracks public chat typing state. |
| `public_typing_update` | server to client | Broadcasts public chat typing users. |
| `newPublicMessage` | server to client | Delivers a new public chat message. |
| `publicMessageDeleted` | server to client | Broadcasts admin or user deletion. |
| `publicOwnMessageDeleted` | server to client | Confirms deletion for the sender. |
| `publicMessageEdited` | server to client | Updates edited public chat messages. |
| `publicMessageReactionUpdated` | server to client | Updates public chat reactions. |
| `bannedFromPublicChat` | server to client | Tells a connecting user their public chat ban state. |
| `userBanned` / `userUnbanned` | server to client | Broadcasts public chat moderation changes. |

### Notifications and Counters

| Event | Direction | Purpose |
| --- | --- | --- |
| `markNotificationsAsRead` | client to server | Marks all notifications as read for the current user. |
| `newNotification` | server to client | Delivers a realtime notification. |
| `unreadNotificationStatus` | server to client | Sends unread notification count. |
| `unreadMessageStatus` | server to client | Sends unread private/group message count. |
| `unreadPublicChatStatus` | server to client | Sends unread public chat count. |
| `followRequestCount` | server to client | Sends pending follow request count. |
| `newPostCount` | server to client | Sends new standard feed post count. |
| `newICPostCount` | server to client | Sends new study feed post count. |
| `newVentPostCount` | server to client | Sends new vent feed post count. |
| `newICUnreadDot` | server to client | Toggles study feed unread indicator. |
| `newVentUnreadDot` | server to client | Toggles vent feed unread indicator. |
| `newBoardPostCount` | server to client | Sends unread board post count. |
| `inbox_note_updated` / `inbox_note_deleted` | server to client | Updates note bubbles for followers. |

### Pomodoro

| Event | Direction | Purpose |
| --- | --- | --- |
| `join_pomodoro_room` / `leave_pomodoro_room` | client to server | Subscribes or unsubscribes from live Pomodoro dashboard updates. |
| `live_session_started` | server to client | Adds/updates a live study session card. |
| `live_session_stopped` | server to client | Removes a live study session card. |
| `pomodoroSessionStarted` | server to client | Syncs session start across tabs/devices. |
| `pomodoroSessionPaused` | server to client | Syncs pause state across tabs/devices. |
| `pomodoroSessionCompleted` | server to client | Advances UI after a work session ends. |
| `pomodoroBreakEnded` | server to client | Advances UI after a break ends. |
| `pomodoroTaskUpdated` | server to client | Syncs task selection for the active session. |

## Database Entity Relationships

- `User` references `Image` for `profileImg` and `coverImg`, `User` for followers/following/follow requests/blocks/mutes, `Post` for liked and pinned posts, `TodoList` for liked todo lists, and `Conversation` for muted conversations.
- `Post` references `User`, `Image`, parent `Post`, reposted `Post`, mentioned `User` documents, voters in poll options, liked/reposted/bookmarked users.
- `Conversation` references DM participants as `User`, group `members.user`, group avatar `Image`, last message sender `User`, and pinned `Message` documents.
- `Message` references `Conversation`, sender `User`, replied-to `Message`, image/voice `Image`, deleting admin `User`, reaction users, and users in `deletedFor`.
- `PublicChatMessage` references sender `User`, image/voice `Image`, replied-to public message, and reaction users.
- `Notification` references sender/recipient `User`, `Post`, `BoardPost`, and `BoardComment`.
- `BoardPost` references author `User`, sender `User`, attached `Image` documents, and reaction users.
- `BoardComment` references `BoardPost`, author/sender `User`, optional `Image`, parent `BoardComment`, and reaction users.
- `TodoList` references owner `User`, liked users, and todo documents.
- `Todo` references owner `User`, `TodoList`, and stores a snapshot of completed list metadata.
- `TodoActivity` references `User`, `Todo`, and `TodoList`.
- `StudySession` references `User` and optionally a `Todo` task.
- `ActiveSession` references `User` and stores an optional `taskId`.
- `WeeklyWinners` and `MonthlyWinners` reference winning users.
- `WordleAttempt` references `User` and `WordlePuzzle`.
- `Devlog` and `DevlogComment` reference authors and liked/disliked users.
- `Suggestion` references submitting user and stores optional Cloudinary media metadata.
- `PushSubscription` references a user.
- `LevelUp` references a user.

## External Service Integrations

### MongoDB

`backend/db/connectMongoDB.js` connects with `MONGO_URI`. All persistent app state is stored through Mongoose models.

### Cloudinary

Configured in `backend/server.js` with `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Controllers upload base64 media through `cloudinary.uploader.upload` and delete old media through `cloudinary.uploader.destroy`.

Upload presets:

- `ml_posts` for posts, replies, vent posts, board posts/comments, and suggestion screenshots.
- `ml_messages` for private and public chat images/voice messages.
- `ml_avatars` for user profile images, cover images, and group avatars.
- `pomodoro_backgrounds` for custom Pomodoro backgrounds.

### Firebase and Google Sign-In

Frontend Firebase config lives in `frontend/src/services/firebase.js` and uses `VITE_FIREBASE_*` variables. Google sign-in starts with Firebase `signInWithPopup`. The backend verifies the ID token using Firebase Admin initialized from `FIREBASE_SERVICE_ACCOUNT_KEY`.

### Web Push

`backend/lib/utils/sendPush.js` initializes `web-push` with `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Browser subscriptions are stored in `PushSubscription`. Offline post/chat/board/notification events can send push payloads.

### Render

`RENDER_EXTERNAL_URL` is used for Socket.io CORS, backend base URLs in push notifications, and production deployment assumptions. Express serves the built frontend when `NODE_ENV=production`.

### Google Fonts

Wardrobe font items load Google Fonts dynamically from `frontend/src/features/wardrobe/StyleWrapper.jsx`.

### Spotify

No Spotify code, API calls, or environment variables were found in this repository.

## Scheduled Jobs

- Scheduled posts: `backend/server.js` calls `publishScheduledPosts(io, onlineUsersMap)` every 60 seconds.
- Monthly reset: `0 0 1 * *` UTC archives top monthly study winners and resets monthly stats.
- Weekly reset: `0 0 * * 1` UTC archives top weekly study winners and resets weekly stats.
- Wordle daily reset: `0 0 * * *` UTC ensures the current daily Wordle puzzle exists.
- Active Pomodoro cleanup: `ActiveSession` has a TTL index on `scheduledEndTime` with a five-minute expiry delay.

## Frontend State and Data Flow

- Server state is primarily managed by TanStack Query hooks inside feature folders.
- Local UI state is managed with Zustand stores such as `useAppStore`, `usePostModalStore`, `usePomodoroTimerStore`, `usePublicChatStore`, `usePrivateChatStore`, `useBoardStore`, `useLightboxStore`, and related stores.
- Socket state is centralized in `SocketContext` and feature-level socket hooks.
- PWA install and push notification behavior lives in `usePWAInstall`, `frontend/src/utils/push.js`, and `frontend/src/sw.js`.
