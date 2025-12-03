// Custom React hooks for Firestore operations
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  subscribeToMessages, 
  subscribeToCommittees, 
  subscribeToMotions,
  subscribeToUsers 
} from './firestoreService';
import { readLimiter } from './readLimiter';

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
    if (!chatroomId) {
      console.log('useMessages: No chatroomId, skipping subscription');
      setMessages([]);
      setLoading(false);
      return;
    }

    const subscriptionKey = `messages-${chatroomId}`;
    
    // Rate limiting to prevent spam refresh reads
    if (!readLimiter.canSubscribe(subscriptionKey)) {
      console.log('useMessages: Rate limited, using cached data');
      setLoading(false);
      return;
    }

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
 * @param {string} userId - Optional user ID to filter committees by membership
 * @returns {Object} - { committees, loading, error }
 */
export const useCommittees = (userId = null) => {
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Prevent subscription if userId is explicitly undefined (not null, not a string)
    // This handles the initial render before myData.id is set
    if (userId === undefined) {
      console.log('useCommittees: Waiting for userId to be determined...');
      return;
    }

    const subscriptionKey = `committees-${userId || 'all'}`;
    
    // Rate limiting: prevent rapid re-subscriptions (e.g., spam refresh)
    if (!readLimiter.canSubscribe(subscriptionKey)) {
      console.log('useCommittees: Rate limited, using cached data');
      setLoading(false);
      return;
    }

    console.log('useCommittees: Subscribing to committees', userId ? `for user ${userId}` : '(all)');
    setLoading(true);
    setError(null);

    // Clean up any existing subscription first
    if (unsubscribeRef.current) {
      console.log('useCommittees: Cleaning up previous subscription');
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    unsubscribeRef.current = subscribeToCommittees((newCommittees) => {
      console.log('useCommittees: Received committees:', newCommittees.length);
      setCommittees(newCommittees);
      setLoading(false);
    }, userId);

    return () => {
      console.log('useCommittees: Unsubscribing from committees');
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [userId]);

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
      console.log('[useMotions] No committeeId provided, resetting motions');
      setMotions([]);
      setLoading(false);
      return;
    }

    // Convert to string to ensure consistency
    const committeeIdString = String(committeeId);
    console.log('[useMotions] Subscribing to motions for committee:', committeeIdString);
    setLoading(true);
    setError(null);

    try {
      const unsubscribe = subscribeToMotions(committeeIdString, (newMotions) => {
        console.log('[useMotions] Received motions update:', newMotions.length, 'motions for committee:', committeeIdString);
        console.log('[useMotions] Motion IDs:', newMotions.map(m => m.id));
        setMotions(newMotions);
        setLoading(false);
      });

      return () => {
        console.log('[useMotions] Unsubscribing from motions for committee:', committeeIdString);
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (err) {
      console.error('[useMotions] Error setting up subscription:', err);
      setError(err);
      setLoading(false);
    }
  }, [committeeId]);

  return { motions, loading, error };
};

/**
 * Custom hook to subscribe to real-time users
 * @param {Array} userIds - Optional array of specific user IDs to track
 * @returns {Object} - { users, loading, error }
 */
export const useUsers = (userIds = null) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If no userIds provided, don't subscribe (return empty)
    if (!userIds || userIds.length === 0) {
      console.log('useUsers: No userIds provided, skipping subscription');
      setUsers([]);
      setLoading(false);
      return;
    }

    console.log('useUsers: Subscribing to users:', userIds);
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToUsers((newUsers) => {
      // Filter to only the requested users
      const filteredUsers = newUsers.filter(u => userIds.includes(u.userId));
      console.log('useUsers: Received users:', filteredUsers.length, 'of', newUsers.length);
      setUsers(filteredUsers);
      setLoading(false);
    });

    return () => {
      console.log('useUsers: Unsubscribing from users');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userIds?.join(',')]); // Only re-subscribe if the userIds array changes

  return { users, loading, error };
};