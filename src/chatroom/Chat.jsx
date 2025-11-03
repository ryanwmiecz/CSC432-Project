import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessages } from '../firebase/hooks';
import { createMessage, formatTimestamp } from '../firebase/firestoreService';

export default function Chat() {
  const [input, setInput] = useState('');
  const navigate = useNavigate();
  const { messages, loading, error } = useMessages('default', 100);
  
  // Get current user
  let currentUser = null;
  if (window.userStore) {
    const user = window.userStore.getCurrentUser();
    if (user) {
      currentUser = {
        id: user.username,
        name: user.username,
      };
    }
  }

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
        userName: currentUser.name,
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
            <strong>{m.userName}:</strong> {m.text}{' '}
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
