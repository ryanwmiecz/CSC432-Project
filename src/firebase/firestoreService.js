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
  Timestamp,
  startAfter
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

// Paginated message loading - fetches older messages using cursor
export const getOlderMessages = async (chatroomId, lastMessageDoc, pageSize = 10) => {
  try {
    let q = query(
      collection(db, MESSAGES_COLLECTION),
      where('chatroomId', '==', chatroomId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    // If we have a cursor (last message), start after it
    if (lastMessageDoc) {
      q = query(
        collection(db, MESSAGES_COLLECTION),
        where('chatroomId', '==', chatroomId),
        orderBy('createdAt', 'desc'),
        startAfter(lastMessageDoc),
        limit(pageSize)
      );
    }

    const querySnapshot = await getDocs(q);
    const messages = [];
    let cacheCount = 0;
    let serverCount = 0;

    querySnapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data(),
        _doc: doc, // Store document for cursor
      });
      if (doc.metadata.fromCache) {
        cacheCount++;
      } else {
        serverCount++;
      }
    });

    console.log(`[Messages] 📖 Loaded ${messages.length} older messages: ${cacheCount} from cache, ${serverCount} from server`);
    
    return {
      messages: messages.reverse(),
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1],
      hasMore: messages.length === pageSize
    };
  } catch (error) {
    console.error('Error getting older messages:', error);
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

  return onSnapshot(q, {
    // Don't trigger callbacks for metadata-only changes (pending writes, etc)
    includeMetadataChanges: false
  }, (querySnapshot) => {
    const messages = [];
    let cacheCount = 0;
    let serverCount = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Only include messages with resolved timestamps to prevent flashing
      if (data.createdAt) {
        messages.push({
          id: doc.id,
          ...data,
        });
      }
      // Track where data came from
      if (doc.metadata.fromCache) {
        cacheCount++;
      } else {
        serverCount++;
      }
    });
    
    console.log(`[Messages] Loaded ${messages.length} messages: ${cacheCount} from cache, ${serverCount} from server`);
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

// One-time read for committees (uses cache, no listener costs)
export const getCommitteesOnce = async (userId = null) => {
  try {
    const q = userId 
      ? query(
          collection(db, COMMITTEES_COLLECTION),
          where('memberIds', 'array-contains', userId)
        )
      : collection(db, COMMITTEES_COLLECTION);
    
    const querySnapshot = await getDocs(q);
    const committees = [];
    let cacheCount = 0;
    let serverCount = 0;
    
    querySnapshot.forEach((doc) => {
      committees.push({
        id: doc.id,
        ...doc.data(),
      });
      if (doc.metadata.fromCache) {
        cacheCount++;
      } else {
        serverCount++;
      }
    });
    
    console.log(`[Committees] 📖 One-time read: ${committees.length} committees (${cacheCount} cache, ${serverCount} server)`);
    return committees;
  } catch (error) {
    console.error('Error getting committees:', error);
    throw error;
  }
};

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

export const subscribeToCommittees = (callback, userId = null) => {
  // If userId provided, only subscribe to committees where user is a member
  const q = userId 
    ? query(
        collection(db, COMMITTEES_COLLECTION),
        where('memberIds', 'array-contains', userId)
      )
    : collection(db, COMMITTEES_COLLECTION);
  
  console.log(`[Committees] 🔌 Establishing new listener connection${userId ? ` for user: ${userId}` : ' (all committees)'}`);
  
  return onSnapshot(q, {
    includeMetadataChanges: false
  }, (querySnapshot) => {
    const committees = [];
    let cacheCount = 0;
    let serverCount = 0;
    
    querySnapshot.forEach((doc) => {
      committees.push({
        id: doc.id,
        ...doc.data(),
      });
      if (doc.metadata.fromCache) {
        cacheCount++;
      } else {
        serverCount++;
      }
    });
    
    console.log(`[Committees] 📦 Loaded ${committees.length} committees: ${cacheCount} from cache, ${serverCount} from server`);
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
    console.log('[createMotion] Creating motion with data:', motionData);
    const docRef = await addDoc(collection(db, MOTIONS_COLLECTION), {
      ...motionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('[createMotion] Motion created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[createMotion] Error creating motion:', error);
    console.error('[createMotion] Error code:', error.code);
    console.error('[createMotion] Error details:', error.message);
    throw error;
  }
};

export const getMotions = async (committeeId) => {
  try {
    const q = query(
      collection(db, MOTIONS_COLLECTION),
      where('committeeId', '==', committeeId)
    );
    
    const querySnapshot = await getDocs(q);
    const motions = [];
    querySnapshot.forEach((doc) => {
      motions.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    // Sort in memory
    motions.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    
    return motions;
  } catch (error) {
    console.error('Error getting motions:', error);
    throw error;
  }
};

export const subscribeToMotions = (committeeId, callback) => {
  console.log('[subscribeToMotions] Setting up subscription for committeeId:', committeeId);
  
  // Simpler query - just filter by committeeId, sort in memory
  const q = query(
    collection(db, MOTIONS_COLLECTION),
    where('committeeId', '==', committeeId)
  );

  return onSnapshot(q, {
    includeMetadataChanges: false
  },
    (querySnapshot) => {
      const motions = [];
      let cacheCount = 0;
      let serverCount = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        motions.push({
          id: doc.id,
          ...data,
        });
        if (doc.metadata.fromCache) {
          cacheCount++;
        } else {
          serverCount++;
        }
      });
      
      // Sort in memory by createdAt (newest first)
      motions.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime; // descending order
      });
      
      console.log(`[Motions] Loaded ${motions.length} motions: ${cacheCount} from cache, ${serverCount} from server`);
      callback(motions);
    }, 
    (error) => {
      console.error('[subscribeToMotions] Subscription error:', error);
      console.error('[subscribeToMotions] Error code:', error.code);
      console.error('[subscribeToMotions] Error message:', error.message);
    }
  );
};


export const updateMotion = async (motionId, updates) => {
  try {
    const motionRef = doc(db, MOTIONS_COLLECTION, motionId);
    const motionDoc = await getDoc(motionRef);
    
    if (motionDoc.exists()) {
      // If history is being updated, append to existing history instead of replacing
      if (updates.history && Array.isArray(updates.history)) {
        const currentHistory = motionDoc.data().history || [];
        updates.history = [...currentHistory, ...updates.history];
      }
      
      await updateDoc(motionRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } else {
      console.error('Motion document does not exist:', motionId);
      throw new Error('Motion not found');
    }
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
  return onSnapshot(collection(db, USERS_COLLECTION), {
    includeMetadataChanges: false
  }, (querySnapshot) => {
    const users = [];
    let cacheCount = 0;
    let serverCount = 0;
    
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data(),
      });
      if (doc.metadata.fromCache) {
        cacheCount++;
      } else {
        serverCount++;
      }
    });
    
    console.log(`[Users] Loaded ${users.length} users: ${cacheCount} from cache, ${serverCount} from server`);
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