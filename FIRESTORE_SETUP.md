# Firestore Setup and Usage Guide

## Setup Steps

### 1. Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click on the gear icon ⚙️ > Project Settings
4. Scroll down to "Your apps" section
5. Click on the web app icon (</>)
6. Copy the `firebaseConfig` values

### 2. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

### 3. Set Up Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Choose **Start in test mode** (for development) or **production mode**
4. Select a location for your database
5. Click **Enable**

### 4. Configure Security Rules (Important!)

Go to **Firestore Database > Rules** and set appropriate security rules:

**For Development (Test Mode):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

**For Production (Recommended):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Messages collection
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                      request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
                              resource.data.userId == request.auth.uid;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && 
                              request.auth.uid == userId;
      allow delete: if request.auth != null && 
                      request.auth.uid == userId;
    }
    
    // Chatrooms collection
    match /chatrooms/{chatroomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
                              resource.data.createdBy == request.auth.uid;
    }
  }
}
```

## Usage Examples

### Example 1: Sending a Message

```jsx
import { createMessage } from '../firebase/firestoreService';

const handleSendMessage = async (text) => {
  try {
    const messageId = await createMessage({
      userId: currentUser.id,
      userName: currentUser.name,
      text: text,
      chatroomId: 'default', // or specific chatroom ID
      attachment: null, // or attachment object if exists
    });
    console.log('Message sent with ID:', messageId);
  } catch (error) {
    console.error('Failed to send message:', error);
  }
};
```

### Example 2: Using Real-time Messages Hook

```jsx
import { useMessages } from '../firebase/hooks';
import { createMessage } from '../firebase/firestoreService';

function ChatComponent() {
  const { messages, loading, error } = useMessages('default', 100);
  const [inputText, setInputText] = useState('');

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    await createMessage({
      userId: currentUser.id,
      userName: currentUser.name,
      text: inputText,
      chatroomId: 'default',
    });
    
    setInputText('');
  };

  if (loading) return <div>Loading messages...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.userName}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <input 
        value={inputText} 
        onChange={(e) => setInputText(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

### Example 3: Manual Message Subscription

```jsx
import { subscribeToMessages, formatTimestamp } from '../firebase/firestoreService';

useEffect(() => {
  const unsubscribe = subscribeToMessages('default', (messages) => {
    console.log('New messages:', messages);
    setMessages(messages);
  });

  return () => unsubscribe(); // Cleanup on unmount
}, []);
```

### Example 4: Update/Delete Message

```jsx
import { updateMessage, deleteMessage } from '../firebase/firestoreService';

// Update a message
await updateMessage(messageId, {
  text: 'Updated message text',
  isEdited: true,
});

// Delete a message
await deleteMessage(messageId);
```

### Example 5: User Operations

```jsx
import { setUser, getUser, getUsers } from '../firebase/firestoreService';

// Create/update user
await setUser(userId, {
  name: 'John Doe',
  email: 'john@example.com',
  avatar: 'https://example.com/avatar.jpg',
});

// Get single user
const user = await getUser(userId);

// Get all users
const allUsers = await getUsers();
```

### Example 6: Chatroom Operations

```jsx
import { createChatroom, getChatrooms } from '../firebase/firestoreService';

// Create a new chatroom
const chatroomId = await createChatroom({
  name: 'General',
  description: 'General discussion',
  createdBy: currentUser.id,
});

// Get all chatrooms
const chatrooms = await getChatrooms();
```

## Data Structure

### Messages Collection
```javascript
{
  id: "auto-generated-id",
  userId: "user-123",
  userName: "John Doe",
  text: "Hello, world!",
  chatroomId: "default",
  attachment: {
    type: "image",
    url: "...",
    width: 800,
    height: 600
  } || null,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Users Collection
```javascript
{
  id: "auto-generated-id",
  userId: "user-123",
  name: "John Doe",
  email: "john@example.com",
  avatar: "https://...",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Chatrooms Collection
```javascript
{
  id: "auto-generated-id",
  name: "General",
  description: "General discussion",
  createdBy: "user-123",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Important Notes

1. **Environment Variables**: Never commit your `.env` file to Git. Keep it in `.gitignore`.

2. **Security**: Always set up proper Firestore security rules before deploying to production.

3. **Real-time Updates**: The `useMessages` hook provides real-time updates. Messages will automatically appear when other users send them.

4. **Error Handling**: Always wrap Firestore operations in try-catch blocks.

5. **Timestamps**: Firestore uses `serverTimestamp()` for consistency across clients. Convert to JavaScript Date using `timestampToDate()` utility.

6. **Offline Support**: Firestore has built-in offline support. Messages will be queued when offline and sent when back online.

## Testing

Before using in production:

1. Test with Firestore emulator for local development
2. Verify security rules work correctly
3. Test real-time updates with multiple browser tabs
4. Check error handling for network failures
5. Test with different user permissions

## Troubleshooting

### "Missing or insufficient permissions" error
- Check your Firestore security rules
- Ensure user is authenticated if rules require it
- Verify the user has permission for the operation

### "Firebase: Error (auth/configuration-not-found)" 
- Verify all environment variables are set correctly
- Check that Firebase is initialized before use
- Ensure `.env` file is in the project root

### Messages not updating in real-time
- Check that you're using `subscribeToMessages` or `useMessages` hook
- Verify the unsubscribe function is called on cleanup
- Check browser console for errors
