# 💘 Sparq — Dating App

A full-stack, production-ready dating application built with Expo SDK 54, Node.js, MongoDB, and Socket.io.

## 🏗 Project Structure

```
sparq/
├── mobile/          # Expo React Native app (SDK 54)
├── server/          # Node.js + Express backend
├── .env.example     # Environment variable templates
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Cloudinary account
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`

---

### 1. Backend Setup

```bash
cd server
npm install
cp ../.env.example .env   # Fill in your values
npm run dev
```

### 2. Mobile App Setup

```bash
cd mobile
npm install
cp ../.env.example .env
npx expo start
```

---

## 🔐 Auth Flow
- Email/password registration with JWT
- Persistent login via SecureStore
- Auto token refresh
- Profile completion gate after registration

## 🧩 Features
| Feature | Status |
|---|---|
| Swipe Matchmaking | ✅ |
| Real-time Chat | ✅ |
| Reels Feed | ✅ |
| Audio/Video Call UI | ✅ |
| Rent a Buddy | ✅ |
| Blind Date | ✅ |
| Travel Mate | ✅ |
| Premium Subscriptions | ✅ |
| Push Notifications | ✅ |
| Report/Block System | ✅ |

## 🛠 Tech Stack

### Mobile
- Expo SDK 54 + Expo Router (file-based routing)
- TypeScript
- Zustand (auth/user state)
- @tanstack/react-query (server state)
- Socket.io-client (real-time)
- Expo Notifications
- Expo AV (video/reels)

### Backend
- Node.js + Express
- MongoDB Atlas + Mongoose (MVC)
- JWT Authentication
- Socket.io
- Cloudinary (media)
- Razorpay (payments)

## 📱 Screens
- Login / Register / Forgot Password
- Home (Swipe deck)
- Matches & Chat
- Reels Feed
- Profile & Edit
- Rent a Buddy / Blind Date / Travel Mate
- Call (Audio + Video UI)
- Premium / Subscriptions
- Settings & Safety

## 🔒 Security
- JWT with refresh tokens
- Password hashing (bcrypt)
- Rate limiting
- Input sanitization
- Report & block system
