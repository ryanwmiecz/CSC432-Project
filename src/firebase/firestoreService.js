// Firestore service for chatroom CRUD operations
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

// Collection names
const MESSAGES_COLLECTION = 'messages';
const USERS_COLLECTION = 'users';
const CHATROOMS_COLLECTION = 'chatrooms';

// ============= MESSAGE OPERATIONS =============

/**
 * Create a new message in Firestore
 * @param {Object} messageData - { userId, userName, text, chatroomId, attachment }
 * @returns {Promise<string>} - Document ID of the created message
 */
export const createMessage = async (messageData) => {
  try {
    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
      ...messageData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
};

/**
 * Get all messages from a chatroom
 * @param {string} chatroomId - ID of the chatroom
 * @param {number} maxMessages - Maximum number of messages to retrieve
 * @returns {Promise<Array>} - Array of messages
 */
export const getMessages = async (chatroomId = null, maxMessages = 100) => {
  try {
    let q = query(
      collection(db, MESSAGES_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxMessages)
    );

    if (chatroomId) {
      q = query(
        collection(db, MESSAGES_COLLECTION),
        where('chatroomId', '==', chatroomId),
        orderBy('createdAt', 'desc'),
        limit(maxMessages)
      );
    }

    const querySnapshot = await getDocs(q);
    const messages = [];
    querySnapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

/**
 * Listen to real-time message updates
 * @param {string} chatroomId - ID of the chatroom
 * @param {Function} callback - Callback function to handle new messages
 * @param {number} maxMessages - Maximum number of messages to retrieve
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToMessages = (chatroomId = null, callback, maxMessages = 100) => {
  let q = query(
    collection(db, MESSAGES_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(maxMessages)
  );

  if (chatroomId) {
    q = query(
      collection(db, MESSAGES_COLLECTION),
      where('chatroomId', '==', chatroomId),
      orderBy('createdAt', 'desc'),
      limit(maxMessages)
    );
  }

  return onSnapshot(q, (querySnapshot) => {
    const messages = [];
    querySnapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    callback(messages.reverse()); // Return in chronological order
  }, (error) => {
    console.error('Error in message subscription:', error);
  });
};

/**
 * Update a message
 * @param {string} messageId - ID of the message to update
 * @param {Object} updates - Object containing fields to update
 */
export const updateMessage = async (messageId, updates) => {
  try {
    const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
    await updateDoc(messageRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
};

/**
 * Delete a message
 * @param {string} messageId - ID of the message to delete
 */
export const deleteMessage = async (messageId) => {
  try {
    await deleteDoc(doc(db, MESSAGES_COLLECTION, messageId));
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// ============= USER OPERATIONS =============

/**
 * Create or update a user in Firestore
 * @param {string} userId - User ID
 * @param {Object} userData - { name, email, avatar, etc. }
 */
export const setUser = async (userId, userData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp(),
    }).catch(async () => {
      // If document doesn't exist, create it
      await addDoc(collection(db, USERS_COLLECTION), {
        ...userData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('Error setting user:', error);
    throw error;
  }
};

/**
 * Get a user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User data
 */
export const getUser = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

/**
 * Get all users
 * @returns {Promise<Array>} - Array of users
 */
export const getUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

// ============= CHATROOM OPERATIONS =============

/**
 * Create a new chatroom
 * @param {Object} chatroomData - { name, description, createdBy }
 * @returns {Promise<string>} - Document ID of the created chatroom
 */
export const createChatroom = async (chatroomData) => {
  try {
    const docRef = await addDoc(collection(db, CHATROOMS_COLLECTION), {
      ...chatroomData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating chatroom:', error);
    throw error;
  }
};

/**
 * Get all chatrooms
 * @returns {Promise<Array>} - Array of chatrooms
 */
export const getChatrooms = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, CHATROOMS_COLLECTION));
    const chatrooms = [];
    querySnapshot.forEach((doc) => {
      chatrooms.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return chatrooms;
  } catch (error) {
    console.error('Error getting chatrooms:', error);
    throw error;
  }
};

/**
 * Update a chatroom
 * @param {string} chatroomId - ID of the chatroom to update
 * @param {Object} updates - Object containing fields to update
 */
export const updateChatroom = async (chatroomId, updates) => {
  try {
    const chatroomRef = doc(db, CHATROOMS_COLLECTION, chatroomId);
    await updateDoc(chatroomRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating chatroom:', error);
    throw error;
  }
};

/**
 * Delete a chatroom
 * @param {string} chatroomId - ID of the chatroom to delete
 */
export const deleteChatroom = async (chatroomId) => {
  try {
    await deleteDoc(doc(db, CHATROOMS_COLLECTION, chatroomId));
  } catch (error) {
    console.error('Error deleting chatroom:', error);
    throw error;
  }
};

// ============= UTILITY FUNCTIONS =============

/**
 * Convert Firestore Timestamp to JavaScript Date
 * @param {Timestamp} timestamp - Firestore Timestamp
 * @returns {Date} - JavaScript Date object
 */
export const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  return timestamp.toDate();
};

/**
 * Format timestamp for display
 * @param {Timestamp} timestamp - Firestore Timestamp
 * @returns {string} - Formatted time string
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = timestampToDate(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
