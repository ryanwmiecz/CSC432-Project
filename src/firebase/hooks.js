// Custom React hooks for Firestore operations
import { useState, useEffect, useMemo } from 'react';
import { 
  subscribeToMessages, 
  subscribeToCommittees, 
  subscribeToMotions,
  subscribeToUsers 
} from './firestoreService';

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

    const unsubscribe = subscribeToMessages(
      chatroomId,
      (newMessages) => {
        console.log('useMessages: Received messages:', newMessages.length, 'messages for chatroom:', chatroomId);
        setMessages(newMessages);
        setLoading(false);
      },
      maxMessages
    );

    return () => {
      console.log('useMessages: Unsubscribing from chatroom:', chatroomId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [chatroomId, maxMessages]);

  return { messages, loading, error };
};

/**
 * Custom hook to subscribe to real-time committees
 * @returns {Object} - { committees, loading, error }
 */
export const useCommittees = () => {
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('useCommittees: Subscribing to committees');
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToCommittees((newCommittees) => {
      console.log('useCommittees: Received committees:', newCommittees.length);
      setCommittees(newCommittees);
      setLoading(false);
    });

    return () => {
      console.log('useCommittees: Unsubscribing from committees');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { committees, loading, error };
};

/**
 * Custom hook to subscribe to real-time motions for a committee
 * @param {string} committeeId - ID of the committee
 * @returns {Object} - { motions, loading, error }
 */
export const useMotions = (committeeId) => {
  const [motions, setMotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!committeeId) {
      console.log('useMotions: No committeeId provided, resetting motions');
      setMotions([]);
      setLoading(false);
      return;
    }

    console.log('useMotions: Subscribing to motions for committee:', committeeId);
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToMotions(committeeId, (newMotions) => {
      console.log('useMotions: Received motions:', newMotions.length, 'for committee:', committeeId, newMotions);
      setMotions(newMotions);
      setLoading(false);
    });

    return () => {
      console.log('useMotions: Unsubscribing from motions for committee:', committeeId);
      unsubscribe();
    };
  }, [committeeId]);

  return { motions, loading, error };
};

/**
 * Custom hook to subscribe to real-time users
 * @returns {Object} - { users, loading, error }
 */
export const useUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('useUsers: Subscribing to users');
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToUsers((newUsers) => {
      console.log('useUsers: Received users:', newUsers.length);
      setUsers(newUsers);
      setLoading(false);
    });

    return () => {
      console.log('useUsers: Unsubscribing from users');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { users, loading, error };
};