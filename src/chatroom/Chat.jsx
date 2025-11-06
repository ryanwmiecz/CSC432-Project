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
    return (
      <div className="min-h-screen flex items-center justify-center bg-medium-blue">
        <div className="text-white text-xl">Loading messages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-medium-blue">
        <div className="text-red-500 text-xl">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-medium-blue p-4">
      <div className="max-w-4xl mx-auto bg-primary rounded-card shadow-card p-6">
        <h2 className="text-accent text-2xl font-bold mb-4">Chat</h2>
        
        {/* Messages Container */}
        <div className="bg-white rounded-input p-4 max-h-96 overflow-y-auto mb-4 border-2 border-secondary">
          {messages.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="mb-3 pb-3 border-b border-gray-200 last:border-b-0">
                <div className="flex items-baseline gap-2">
                  <strong className="text-primary font-semibold">
                    {getDisplayNameFor(m.userId, m.userName)}:
                  </strong>
                  <span className="text-primary">{m.text}</span>
                </div>
                <small className="text-gray-500 text-xs">
                  {m.createdAt ? formatTimestamp(m.createdAt) : 'Just now'}
                </small>
              </div>
            ))
          )}
        </div>
        
        {/* Input Area */}
        <div className="flex gap-2 mb-4">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm rounded-input border-2 border-transparent focus:border-accent focus:outline-none transition-colors text-primary bg-white"
          />
          <button 
            onClick={send}
            className="bg-secondary text-primary font-semibold py-2 px-6 text-sm rounded-button hover:bg-opacity-80 transition-all duration-200"
          >
            Send
          </button>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/profile')}
            className="bg-secondary text-primary font-semibold py-2 px-4 text-sm rounded-button hover:bg-opacity-80 transition-all duration-200"
          >
            Profile
          </button>
          <button 
            onClick={() => { window.userStore.removeCurrentUser(); navigate('/login'); }}
            className="bg-accent text-white font-semibold py-2 px-4 text-sm rounded-button hover:bg-opacity-80 transition-all duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
