import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useMessages } from '../firebase/hooks';
import { createMessage, formatTimestamp } from '../firebase/firestoreService';

export default function Chat() {
  const [input, setInput] = useState('');
  const navigate = useNavigate();
  const { messages, loading, error } = useMessages('default', 100);
  
  // Get current user
  let currentUser = null;
  // Try Auth0 first (SDK users), fall back to local userStore
  try {
    const auth0 = useAuth0();
    if (auth0 && auth0.user) {
      currentUser = {
        id: auth0.user.sub || (auth0.user.email || auth0.user.name),
        name: auth0.user.name || auth0.user.email,
      };
    }
  } catch (e) {
    // not using auth0 SDK
  }

  if (!currentUser && window.userStore) {
    const user = window.userStore.getCurrentUser();
    if (user) {
      currentUser = {
        id: user.username,
        name: user.username,
      };
    }
  }

  // Helper to read display-name overrides saved by Profile.jsx
  const DISPLAY_OVERRIDES_KEY = 'profile_display_overrides';
  const readDisplayOverrides = () => {
    try {
      const raw = localStorage.getItem(DISPLAY_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  };
  const getDisplayNameFor = (userId, fallbackName) => {
    if (!userId && !fallbackName) return 'Unknown';
    const map = readDisplayOverrides();
    // Prefer lookup by userId (stable), then by fallbackName (older keys)
    return map[userId] || map[fallbackName] || fallbackName || 'Unknown';
  };

  useEffect(() => {
    if (!window.userStore || !window.userStore.getCurrentUser()) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const send = async () => {
    if (!input.trim() || !currentUser) return;
    
    try {
      await createMessage({
        userId: currentUser.id,
        userName: getDisplayNameFor(currentUser.id, currentUser.name),
        text: input,
        chatroomId: 'default',
        attachment: null,
      });
      setInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      send();
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading messages...</div>;
  }

  if (error) {
    return <div style={{ padding: 20, color: 'red' }}>Error: {error.message}</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Chat</h2>
      <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ccc', padding: 8 }}>
        {messages.map((m) => (
          <div key={m.id}>
            <strong>{getDisplayNameFor(m.userId, m.userName)}:</strong> {m.text}{' '}
            <small>({m.createdAt ? formatTimestamp(m.createdAt) : 'Just now'})</small>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
        />
        <button onClick={send}>Send</button>
        <button onClick={() => navigate('/profile')} style={{ marginLeft: 8 }}>Profile</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => { window.userStore.removeCurrentUser(); navigate('/login'); }}>Logout</button>
      </div>
    </div>
  );
}
