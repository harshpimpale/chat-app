# Chat App with Push Notifications

Full-stack real-time chat application with push notifications support.

## Features

- ✅ User registration and authentication
- ✅ Real-time messaging with Socket.IO
- ✅ Push notifications when user is offline
- ✅ Online/offline status indicators
- ✅ Typing indicators
- ✅ Message timestamps
- ✅ Unread message counts
- ✅ 5-hour session with HTTP-only cookies
- ✅ Responsive design with Tailwind CSS

## Tech Stack

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- Socket.IO (real-time)
- JWT + HTTP-only cookies
- Web Push (notifications)

### Frontend
- React + TypeScript
- Tailwind CSS
- Socket.IO Client
- Axios
- React Router

## Setup Instructions

### 1. MongoDB Setup

Install MongoDB locally or use MongoDB Atlas:
```
# Local MongoDB (macOS)
brew install mongodb-community
brew services start mongodb-community

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Generate VAPID Keys

```
cd server
npm install
npx web-push generate-vapid-keys
```

Copy the keys and add them to `server/.env`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your-super-secret-jwt-key-change-this
VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY_HERE
VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
VAPID_EMAIL=mailto:[email protected]
CLIENT_URL=http://localhost:5173
```

### 3. Install Dependencies

```
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 4. Create Icons

Create a `/client/public/icons/` folder and add:
- `icon-192x192.png` (192x192px)
- `icon-512x512.png` (512x512px)

Or use placeholder images for testing.

### 5. Run the Application

```
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### 6. Test the App

1. Open `http://localhost:5173`
2. Register two users in different browsers/incognito windows
3. Login with both users
4. Send messages between them
5. Close one user's browser tab
6. Send a message from the other user
7. You should receive a push notification!

## Project Structure

```
chat-app/
├── server/          # Backend API
│   ├── src/
│   │   ├── models/  # MongoDB models
│   │   ├── routes/  # API routes
│   │   ├── middleware/ # Auth middleware
│   │   └── server.ts
│   └── .env
└── client/          # Frontend React app
    ├── src/
    │   ├── components/
    │   ├── contexts/
    │   └── utils/
    └── public/sw.js  # Service Worker
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Messages
- `GET /api/messages/users` - Get all users
- `GET /api/messages/conversation/:recipientId` - Get conversation
- `POST /api/messages/send` - Send message
- `GET /api/messages/unread-count` - Get unread count

### Notifications
- `POST /api/notifications/subscribe` - Subscribe to push
- `POST /api/notifications/unsubscribe` - Unsubscribe
- `GET /api/notifications/vapid-public-key` - Get VAPID key

## Socket.IO Events

### Client → Server
- `authenticate` - Authenticate socket connection
- `send-message` - Send real-time message
- `typing` - User is typing
- `stop-typing` - User stopped typing

### Server → Client
- `receive-message` - Receive new message
- `user-typing` - User is typing indicator
- `user-stop-typing` - User stopped typing
- `user-status` - User online/offline status

## Troubleshooting

1. **Push notifications not working on iOS?**
   - Ensure PWA is installed to home screen
   - iOS 16.4+ required
   - Must use HTTPS in production

2. **MongoDB connection error?**
   - Check if MongoDB is running
   - Verify `MONGODB_URI` in `.env`

3. **Socket.IO not connecting?**
   - Check CORS settings
   - Verify `CLIENT_URL` in `.env`
