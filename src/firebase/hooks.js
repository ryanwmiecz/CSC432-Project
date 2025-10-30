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
    setLoading(true);
    setError(null);

    // Subscribe to messages
    const unsubscribe = subscribeToMessages(
      chatroomId,
      (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
      },
      maxMessages
    );

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [chatroomId, maxMessages]);

  return { messages, loading, error };
};
