# Quick Start Guide - Firestore Integration

## ✅ Setup Complete!

Your chatroom code has been updated to use Firestore. Here's what you need to do to get it running:

## 🚀 3-Step Quick Start

### Step 1: Get Firebase Config (5 minutes)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your Firestore project
3. Click ⚙️ Settings → Project Settings
4. Scroll to "Your apps" → Click web icon `</>`
5. Copy the config values

### Step 2: Set Environment Variables (2 minutes)
Create a `.env` file in your project root:

```env
VITE_FIREBASE_API_KEY=your_actual_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 3: Set Firestore Rules (2 minutes)
In Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**⚠️ This is for testing only! See FIRESTORE_SETUP.md for production rules.**

## 🧪 Test It

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Open in two browser tabs
3. Send a message in one tab
4. Watch it appear instantly in the other tab! 🎉

## 📄 What Changed

### Files Modified:
- ✅ `src/chatroom/App.jsx` - Now uses Firestore for messages
- ✅ `src/chatroom/Chat.jsx` - Now uses Firestore for messages
- ✅ `src/chatroom/App.css` - Added delete button and loading styles

### New Features:
- ✅ Real-time messaging - see messages instantly
- ✅ Delete your own messages (click the × button)
- ✅ Messages persist across page refreshes
- ✅ Messages sync across all users
- ✅ Multiple chatrooms/committees supported
- ✅ Server-side timestamps

### Login & Profile Files:
- ✅ NOT modified (as requested)
- ✅ Authentication still works the same way
- ✅ Only chatroom messaging uses Firestore

## 🔍 Verify It's Working

**Good signs:**
- ✅ No console errors about Firebase
- ✅ Messages appear when sent
- ✅ Messages sync between tabs
- ✅ Timestamps show correctly

**If you see errors:**
- Check `.env` file exists and has correct values
- Verify Firestore rules are published
- Check browser console for specific error messages
- See FIRESTORE_SETUP.md troubleshooting section

## 📚 Full Documentation

- **FIRESTORE_INTEGRATION.md** - Complete list of changes made
- **FIRESTORE_SETUP.md** - Detailed setup and usage guide
- **FIRESTORE_CHECKLIST.md** - Step-by-step checklist

## 💡 Tips

1. **Real-time Updates**: Messages appear automatically - no refresh needed!
2. **Committee Chats**: Each committee has its own message thread
3. **Delete Messages**: Hover over your messages to see the × button
4. **Offline Mode**: Messages queue when offline, sync when back online
5. **Time Zones**: Server timestamps work across all time zones

## 🆘 Need Help?

If something's not working:
1. Check the browser console for errors
2. Verify your `.env` file is set up correctly
3. Make sure Firestore database is created in Firebase Console
4. Review the troubleshooting section in FIRESTORE_SETUP.md

---

**You're all set!** Just add your Firebase credentials and start chatting in real-time! 🚀
