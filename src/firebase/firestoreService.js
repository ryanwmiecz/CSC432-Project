// Enhanced Firestore service with Motions and Committees support
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
const COMMITTEES_COLLECTION = 'committees';
const MOTIONS_COLLECTION = 'motions';

// ============= MESSAGE OPERATIONS =============

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
    callback(messages.reverse());
  }, (error) => {
    console.error('Error in message subscription:', error);
  });
};

export const deleteMessage = async (messageId) => {
  try {
    await deleteDoc(doc(db, MESSAGES_COLLECTION, messageId));
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// ============= COMMITTEE OPERATIONS =============

export const createCommittee = async (committeeData) => {
  try {
    const docRef = await addDoc(collection(db, COMMITTEES_COLLECTION), {
      ...committeeData,
      memberIds: committeeData.memberIds || [],
      // Store permissions as object: { userId: 'Chair' | 'Member' | 'Observer' }
      memberPermissions: committeeData.memberPermissions || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating committee:', error);
    throw error;
  }
};

export const getCommittees = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, COMMITTEES_COLLECTION));
    const committees = [];
    querySnapshot.forEach((doc) => {
      committees.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return committees;
  } catch (error) {
    console.error('Error getting committees:', error);
    throw error;
  }
};

export const subscribeToCommittees = (callback) => {
  return onSnapshot(collection(db, COMMITTEES_COLLECTION), (querySnapshot) => {
    const committees = [];
    querySnapshot.forEach((doc) => {
      committees.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    callback(committees);
  }, (error) => {
    console.error('Error in committee subscription:', error);
  });
};

export const updateCommittee = async (committeeId, updates) => {
  try {
    const committeeRef = doc(db, COMMITTEES_COLLECTION, committeeId);
    await updateDoc(committeeRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating committee:', error);
    throw error;
  }
};

export const deleteCommittee = async (committeeId) => {
  try {
    await deleteDoc(doc(db, COMMITTEES_COLLECTION, committeeId));
  } catch (error) {
    console.error('Error deleting committee:', error);
    throw error;
  }
};

export const addMemberToCommittee = async (committeeId, userId, permission = 'Member') => {
  try {
    const committeeRef = doc(db, COMMITTEES_COLLECTION, committeeId);
    const committeeDoc = await getDoc(committeeRef);
    
    if (committeeDoc.exists()) {
      const currentMembers = committeeDoc.data().memberIds || [];
      const currentPermissions = committeeDoc.data().memberPermissions || {};
      
      if (!currentMembers.includes(userId)) {
        await updateDoc(committeeRef, {
          memberIds: [...currentMembers, userId],
          memberPermissions: {
            ...currentPermissions,
            [userId]: permission
          },
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error('Error adding member to committee:', error);
    throw error;
  }
};

export const removeMemberFromCommittee = async (committeeId, userId) => {
  try {
    const committeeRef = doc(db, COMMITTEES_COLLECTION, committeeId);
    const committeeDoc = await getDoc(committeeRef);
    
    if (committeeDoc.exists()) {
      const currentMembers = committeeDoc.data().memberIds || [];
      const currentPermissions = committeeDoc.data().memberPermissions || {};
      const updatedMembers = currentMembers.filter(memberId => memberId !== userId);
      
      // Remove user from permissions object
      const { [userId]: removed, ...updatedPermissions } = currentPermissions;
      
      await updateDoc(committeeRef, {
        memberIds: updatedMembers,
        memberPermissions: updatedPermissions,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error removing member from committee:', error);
    throw error;
  }
};

export const updateMemberPermission = async (committeeId, userId, permission) => {
  try {
    const committeeRef = doc(db, COMMITTEES_COLLECTION, committeeId);
    const committeeDoc = await getDoc(committeeRef);
    
    if (committeeDoc.exists()) {
      const currentPermissions = committeeDoc.data().memberPermissions || {};
      
      await updateDoc(committeeRef, {
        memberPermissions: {
          ...currentPermissions,
          [userId]: permission
        },
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating member permission:', error);
    throw error;
  }
};

// ============= MOTION OPERATIONS =============

export const createMotion = async (motionData) => {
  try {
    const docRef = await addDoc(collection(db, MOTIONS_COLLECTION), {
      ...motionData,
      replies: motionData.replies || [],
      votes: motionData.votes || {},
      recorded: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating motion:', error);
    throw error;
  }
};

export const getMotions = async (committeeId) => {
  try {
    const q = query(
      collection(db, MOTIONS_COLLECTION),
      where('committeeId', '==', committeeId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const motions = [];
    querySnapshot.forEach((doc) => {
      motions.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    return motions;
  } catch (error) {
    console.error('Error getting motions:', error);
    throw error;
  }
};

export const subscribeToMotions = (committeeId, callback) => {
  const q = query(
    collection(db, MOTIONS_COLLECTION),
    where('committeeId', '==', committeeId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const motions = [];
    querySnapshot.forEach((doc) => {
      motions.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    callback(motions);
  }, (error) => {
    console.error('Error in motion subscription:', error);
  });
};

export const updateMotion = async (motionId, updates) => {
  try {
    const motionRef = doc(db, MOTIONS_COLLECTION, motionId);
    await updateDoc(motionRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating motion:', error);
    throw error;
  }
};

export const addReplyToMotion = async (motionId, reply) => {
  try {
    const motionRef = doc(db, MOTIONS_COLLECTION, motionId);
    const motionDoc = await getDoc(motionRef);
    
    if (motionDoc.exists()) {
      const currentReplies = motionDoc.data().replies || [];
      await updateDoc(motionRef, {
        replies: [...currentReplies, {
          ...reply,
          createdAt: new Date().toISOString()
        }],
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error adding reply to motion:', error);
    throw error;
  }
};

export const castVote = async (motionId, userId, vote) => {
  try {
    const motionRef = doc(db, MOTIONS_COLLECTION, motionId);
    const motionDoc = await getDoc(motionRef);
    
    if (motionDoc.exists()) {
      const currentVotes = motionDoc.data().votes || {};
      await updateDoc(motionRef, {
        votes: {
          ...currentVotes,
          [userId]: vote
        },
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error casting vote:', error);
    throw error;
  }
};

// ============= USER OPERATIONS =============

export const createOrUpdateUser = async (userData) => {
  try {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where('userId', '==', userData.userId)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    
    if (querySnapshot.empty) {
      // Create new user
      await addDoc(collection(db, USERS_COLLECTION), {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Update existing user
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, USERS_COLLECTION, userDoc.id), {
        ...userData,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
};

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

export const subscribeToUsers = (callback) => {
  return onSnapshot(collection(db, USERS_COLLECTION), (querySnapshot) => {
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    callback(users);
  }, (error) => {
    console.error('Error in users subscription:', error);
  });
};

export const updateUserRank = async (userId, rank) => {
  try {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, USERS_COLLECTION, userDoc.id), {
        rank: rank,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating user rank:', error);
    throw error;
  }
};

export const updateUserOnlineStatus = async (userId, online) => {
  try {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(usersQuery);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, USERS_COLLECTION, userDoc.id), {
        online: online,
        lastSeen: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating user online status:', error);
    throw error;
  }
};

// ============= UTILITY FUNCTIONS =============

export const timestampToDate = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = timestampToDate(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};