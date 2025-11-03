// Custom React hooks for Firestore operations
import { useState, useEffect } from 'react';
import { subscribeToMessages } from './firestoreService';

/**
 * Custom hook to subscribe to real-time messages
 * @param {string} chatroomId - ID of the chatroom
 * @param {number} maxMessages - Maximum number of messages to retrieve
 * @returns {Object} - { messages, loading, error }
 */
export const useMessages = (chatroomId = null, maxMessages = 100) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('useMessages: Subscribing to chatroom:', chatroomId);
    setLoading(true);
    setError(null);

    // Subscribe to messages
    const unsubscribe = subscribeToMessages(
      chatroomId,
      (newMessages) => {
        console.log('useMessages: Received messages:', newMessages.length, 'messages for chatroom:', chatroomId);
        setMessages(newMessages);
        setLoading(false);
      },
      maxMessages
    );

    // Cleanup subscription on unmount
    return () => {
      console.log('useMessages: Unsubscribing from chatroom:', chatroomId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [chatroomId, maxMessages]);

  return { messages, loading, error };
};
