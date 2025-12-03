// Custom React hooks for Firestore operations
import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  subscribeToMessages, 
  subscribeToCommittees, 
  subscribeToMotions,
  subscribeToUsers,
  getOlderMessages
} from './firestoreService';
import { readLimiter } from './readLimiter';

/**
 * Custom hook to subscribe to real-time messages with pagination support
 * @param {string} chatroomId - ID of the chatroom
 * @param {number} initialPageSize - Initial number of messages to load (default: 10)
 * @returns {Object} - { messages, loading, error, loadMore, hasMore, isLoadingMore }
 */
export const useMessages = (chatroomId = null, initialPageSize = 10) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const lastDocRef = useRef(null);
  const allLoadedMessagesRef = useRef(new Map()); // Track all loaded messages by ID

  useEffect(() => {
    if (!chatroomId) {
      console.log('useMessages: No chatroomId, skipping subscription');
      setMessages([]);
      setLoading(false);
      setHasMore(false);
      lastDocRef.current = null;
      allLoadedMessagesRef.current.clear();
      return;
    }

    const subscriptionKey = `messages-${chatroomId}`;
    
    // Rate limiting to prevent spam refresh reads
    if (!readLimiter.canSubscribe(subscriptionKey)) {
      console.log('useMessages: Rate limited, using cached data');
      setLoading(false);
      return;
    }

    console.log('useMessages: Subscribing to chatroom:', chatroomId, 'with initial page size:', initialPageSize);
    setLoading(true);
    setError(null);
    setHasMore(true);
    lastDocRef.current = null;
    allLoadedMessagesRef.current.clear();

    // Subscribe to real-time updates for newest messages only
    const unsubscribe = subscribeToMessages(
      chatroomId,
      (newMessages) => {
        console.log('useMessages: Received messages:', newMessages.length, 'messages for chatroom:', chatroomId);
        
        // Merge with any previously loaded older messages
        const messagesMap = new Map(allLoadedMessagesRef.current);
        
        // Add new messages to map
        newMessages.forEach(msg => {
          messagesMap.set(msg.id, msg);
        });
        
        // Convert to array and sort by timestamp
        const allMessages = Array.from(messagesMap.values()).sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return aTime - bTime;
        });
        
        allLoadedMessagesRef.current = messagesMap;
        setMessages(allMessages);
        setLoading(false);
        
        // Update hasMore based on whether we got a full page initially
        if (newMessages.length < initialPageSize && !lastDocRef.current) {
          setHasMore(false);
        }
      },
      initialPageSize
    );

    return () => {
      console.log('useMessages: Unsubscribing from chatroom:', chatroomId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [chatroomId, initialPageSize]);

  // Function to load more older messages
  const loadMore = async () => {
    if (!hasMore || isLoadingMore || !chatroomId) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const result = await getOlderMessages(chatroomId, lastDocRef.current, initialPageSize);
      
      if (result.messages.length > 0) {
        // Merge older messages with existing ones
        const messagesMap = new Map(allLoadedMessagesRef.current);
        result.messages.forEach(msg => {
          if (!messagesMap.has(msg.id)) {
            messagesMap.set(msg.id, msg);
          }
        });
        
        // Convert to array and sort
        const allMessages = Array.from(messagesMap.values()).sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return aTime - bTime;
        });
        
        allLoadedMessagesRef.current = messagesMap;
        setMessages(allMessages);
        lastDocRef.current = result.lastDoc;
        setHasMore(result.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
      setError(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return { messages, loading, error, loadMore, hasMore, isLoadingMore };
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