import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
//import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import "./App.tailwind.css";
import { useMessages, useCommittees, useMotions, useUsers } from '../firebase/hooks';
import {
  createMessage,
  deleteMessage,
  formatTimestamp,
  createCommittee,
  updateCommittee,
  deleteCommittee,
  addMemberToCommittee,
  removeMemberFromCommittee,
  updateMemberPermission,
  createMotion,
  updateMotion,
  addReplyToMotion,
  castVote,
  createOrUpdateUser,
  updateUserRank,
  updateUserOnlineStatus,
} from '../firebase/firestoreService';
// (Removed visible Firebase project label import — debug output moved out of UI)

// Motion status constants (Robert's Rules of Order)
const STATUS_PENDING = 0; // New: Pending second
const STATUS_DISCUSSION = 1;
const STATUS_VOTING = 2;
const STATUS_CONCLUDED = 3;
const motionStatusNames = ["Pending Second", "In Discussion...", "Voting...", "Concluded"];

// Normalize motion.status values coming from Firestore
const normalizeStatus = (s) => {
  if (s === undefined || s === null) return STATUS_PENDING;
  if (typeof s === 'number') return s;
  if (typeof s === 'string') {
    // numeric string like "1"
    const n = parseInt(s, 10);
    if (!isNaN(n)) return n;
    const lower = s.toLowerCase();
    if (lower.includes('disc')) return STATUS_DISCUSSION;
    if (lower.includes('vote')) return STATUS_VOTING;
    if (lower.includes('conclud')) return STATUS_CONCLUDED;
    if (lower.includes('pend')) return STATUS_PENDING;
  }
  return STATUS_PENDING;
};


// Helper component for displaying messages with attachments
const ChatMessage = ({ m, myData, users, onDelete, onShowProfile }) => {
  const isMine = m.userId === myData.id || m.id === myData.id;
  const senderObj = users.find((u) => u.userId === m.userId || u.userId === m.id);
  const sender = senderObj?.name || m.userName || "Unknown";
  const senderImage = resolveUserImage(senderObj || { userId: m.userId || m.id, photoURL: m.userPhoto || m.photoURL || m.photo }, 'placeholder-avatar.png');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Validate Base64 string to prevent XSS
  const isValidBase64Image = (base64) => {
    return typeof base64 === 'string' && base64.startsWith('data:image/');
  };

  return (
    <div className={`w-full mb-6 flex ${isMine ? 'justify-end' : 'justify-start'}`} role="listitem">
      <div className={`flex items-start ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <button
          onClick={() => {
            const userObj = senderObj || { userId: m.userId || m.id, name: sender, photoURL: senderObj?.photoURL || senderImage, bio: m.userBio || m.bio };
            onShowProfile && onShowProfile(userObj);
          }}
          className="p-0 border-0 bg-transparent cursor-pointer mr-3 ml-3"
          aria-label={`View profile for ${sender}`}
        >
          <img
            src={senderImage}
            alt={`${sender}'s avatar`}
            className="w-8 h-8 rounded-full object-cover"
          />
        </button>

        <div 
          className={`max-w-[70%] p-3 rounded-lg relative ${
            isMine 
              ? 'bg-accent text-white shadow-message-right' 
              : 'bg-secondary text-primary shadow-message-left'
          }`}
        >
          <div className="text-xs font-bold mb-1">
            <button
              onClick={() => {
                const userObj = senderObj || { userId: m.userId || m.id, name: sender, photoURL: senderObj?.photoURL || senderImage, bio: m.userBio || m.bio };
                onShowProfile && onShowProfile(userObj);
              }}
              className="p-0 border-0 bg-transparent text-left text-inherit cursor-pointer"
              aria-label={`View profile for ${sender}`}
            >
              {sender}
            </button>
          </div>
          {m.attachment && isValidBase64Image(m.attachment.base64) ? (
            <div className="flex flex-col">
              <p className="text-sm font-semibold mb-2">🖼️ Image Attachment</p>
              <div className="w-full max-w-[150px] bg-primary border border-accent rounded overflow-hidden">
                <img
                  src={m.attachment.base64}
                  alt={m.attachment.name || "Attachment"}
                  className="w-full h-full object-contain max-h-[100px] cursor-pointer"
                  onClick={() => setIsPreviewOpen(true)}
                  aria-label="Click to preview image"
                />
                {isPreviewOpen && (
                  <div 
                    className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
                    onClick={() => setIsPreviewOpen(false)}
                  >
                    <img
                      src={m.attachment.base64}
                      alt="Full-size attachment"
                      className="max-w-[90%] max-h-[90%] rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
              {m.text && <p className="mt-2 text-sm italic">{m.text}</p>}
            </div>
          ) : m.attachment ? (
            <div className="flex flex-col">
              <p>Invalid or unsupported image attachment</p>
              <p className="text-xs opacity-75 mt-1">
                {m.attachment.name}
              </p>
            </div>
          ) : (
            <div className="text-sm">{m.msg || m.text}</div>
          )}
          <span className="text-xs text-gray-500 absolute -bottom-5 right-2 whitespace-nowrap overflow-visible max-w-none" style={{whiteSpace: 'nowrap'}} title={m.createdAt ? formatTimestamp(m.createdAt) : m.time}>
            {m.createdAt ? formatTimestamp(m.createdAt) : m.time}
          </span>
          {isMine && onDelete && (
            <button
              className="absolute top-1 right-1 bg-red-700 bg-opacity-70 hover:bg-opacity-90 text-white rounded-full w-5 h-5 flex items-center justify-center text-sm leading-none p-0 transition-colors"
              onClick={() => onDelete(m.id)}
              aria-label="Delete message"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Image override helpers (moved to module scope so components above can use them)
const IMAGE_OVERRIDES_KEY = 'profile_img_overrides';
const readImageOverrides = () => {
  try {
    const raw = localStorage.getItem(IMAGE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};
const getImageFor = (id, fallback) => {
  const map = readImageOverrides();
  return (id && map[id]) || (fallback && map[fallback]) || fallback || 'placeholder-avatar.png';
};

// Resolve a user's image by checking common fields then local overrides
const resolveUserImage = (userObj, fallback = 'placeholder-avatar.png') => {
  if (!userObj) return fallback;
  const id = userObj.userId || userObj.id || userObj.username || userObj.userId;
  const url = userObj.photoURL || userObj.photoUrl || userObj.picture || userObj.img || userObj.avatar || userObj.image;
  return getImageFor(id, url || fallback);
};

// Component for motion history log
const MotionHistory = ({ history }) => (
  <div className="mt-3 p-2 bg-opacity-20 bg-white rounded">
    <h4 className="text-accent text-sm font-bold mb-2">Motion History</h4>
    <ul className="text-xs space-y-1">
      {history.map((entry, index) => (
        <li key={index} className="text-white opacity-90">
          {entry.action} by {entry.userName} at {formatTimestamp(entry.timestamp)}
        </li>
      ))}
    </ul>
  </div>
);

export default function App() {
  const navigate = useNavigate();
  const [messageInput, setMessageInput] = useState('');
  const [slowMode, setSlowMode] = useState(false);
  const [anonymousVoting, setAnonymousVoting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentCommitteeId, setCurrentCommitteeId] = useState(null);
  const [myData, setMyData] = useState({ displayName: "User", id: null, rank: "Member" });
  const [showHome, setShowHome] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [motionsTab, setMotionsTab] = useState('active'); // 'active' or 'history'
  const [showMotionDebug, setShowMotionDebug] = useState(false);
  const [subMotionParentId, setSubMotionParentId] = useState(null);
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');

  // Display-name overrides are stored by Profile.jsx in localStorage.
  const DISPLAY_OVERRIDES_KEY = 'profile_display_overrides';
  const readDisplayOverrides = () => {
    try {
      const raw = localStorage.getItem(DISPLAY_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  };
  const getDisplayNameFor = (id, fallback) => {
    const map = readDisplayOverrides();
    return (id && map[id]) || (fallback && map[fallback]) || fallback || 'User';
  };

  // Firestore hooks
  const { committees, loading: committeesLoading } = useCommittees();
  const { messages, loading: messagesLoading } = useMessages(currentCommitteeId, 100);
  const { motions, loading: motionsLoading } = useMotions(currentCommitteeId);
  const { users } = useUsers();
  const chatRef = useRef(null);
  const motionsRef = useRef(null);
  const newComRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Auth0 integration
  let auth0Available = false;
  let isAuthenticated = false;
  let isLoading = false;
  let user = null;
  let logout = null;

  try {
    const auth0 = useAuth0();
    auth0Available = true;
    isAuthenticated = auth0.isAuthenticated;
    isLoading = auth0.isLoading;
    user = auth0.user;
    logout = auth0.logout;
  } catch (e) {
    auth0Available = false;
  }

  // Check authentication
  useEffect(() => {
    if (auth0Available) {
      const auth0Token = localStorage.getItem('auth0_token');
      const auth0Username = localStorage.getItem('auth0_user');

      if (auth0Token && auth0Username) {
        setMyData(prev => ({ ...prev, displayName: getDisplayNameFor(auth0Username, auth0Username), id: auth0Username }));
      } else if (!isLoading && !isAuthenticated) {
        navigate('/login');
      } else if (user) {
        setMyData(prev => ({ ...prev, displayName: getDisplayNameFor(user.sub, user.name || user.email), id: user.sub }));
      }
    } else {
      if (!window.userStore || !window.userStore.getCurrentUser()) {
        navigate('/login');
      } else {
        const currentUser = window.userStore.getCurrentUser();
        setMyData({ displayName: getDisplayNameFor(currentUser.username, currentUser.username), id: currentUser.username, rank: "Member" });
      }
    }
  }, [navigate, auth0Available, isAuthenticated, isLoading, user]);

  // Set default committee and auto-join if not a member
  useEffect(() => {
    if (committees.length > 0 && !currentCommitteeId) {
      const firstCommittee = committees[0];
      setCurrentCommitteeId(firstCommittee.id);
      
      // Auto-join the first committee if user is not already a member
      if (myData.id && !firstCommittee.memberIds?.includes(myData.id)) {
        addMemberToCommittee(firstCommittee.id, myData.id).catch(console.error);
      }
    }
  }, [committees, currentCommitteeId, myData.id]);

  // Create/update user in Firestore on mount
  useEffect(() => {
    if (myData.id && myData.displayName) {
      createOrUpdateUser({
        userId: myData.id,
        name: getDisplayNameFor(myData.id, myData.displayName),
        rank: myData.rank,
        online: true,
      }).catch(console.error);
    }
  }, [myData.id, myData.displayName, myData.rank]);

  // When the users list updates, prefer the Firestore-stored name for the current user
  useEffect(() => {
    if (!myData.id || !users || users.length === 0) return;
    const me = users.find(u => u.userId === myData.id);
    if (me && me.name && me.name !== myData.displayName) {
      setMyData(prev => ({ ...prev, displayName: me.name }));
    }
  }, [users, myData.id]);

  // Update online status on visibility change and cleanup
  useEffect(() => {
    if (!myData.id) return;
    
    const handleVisibility = () => {
      const isOnline = document.visibilityState === 'visible';
      updateUserOnlineStatus(myData.id, isOnline).catch(console.error);
    };

    const handleBeforeUnload = (e) => {
      // Use navigator.sendBeacon for more reliable status update on page close
      // Note: This requires a REST endpoint, so we'll use the regular update
      // but flag it to not wait for response
      navigator.sendBeacon && updateUserOnlineStatus(myData.id, false);
      if (!navigator.sendBeacon) {
        // Fallback for browsers without sendBeacon
        updateUserOnlineStatus(myData.id, false);
      }
    };

    const handlePageHide = () => {
      // pagehide is more reliable than beforeunload for setting offline status
      updateUserOnlineStatus(myData.id, false).catch(console.error);
    };

    // Set online when component mounts
    updateUserOnlineStatus(myData.id, true).catch(console.error);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      // Set offline when component unmounts or user logs out
      updateUserOnlineStatus(myData.id, false).catch(console.error);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [myData.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages.length]);

  const currentCommittee = committees.find((c) => c.id === currentCommitteeId) || { memberIds: [], memberPermissions: {} };
  const currentUsers = users.filter(u => currentCommittee.memberIds?.includes(u.userId));
  const onlineUsers = currentUsers.filter((u) => u.online);
  
  // Get user's permission level in the current committee
  const myPermissionInCommittee = currentCommittee.memberPermissions?.[myData.id] || 'Member';
  const isOwner = myPermissionInCommittee === 'Owner';
  const isChair = myPermissionInCommittee === 'Chair' || isOwner;
  
  const availableUsers = users.filter((u) => !currentCommittee.memberIds?.includes(u.userId));
  const quorumMet = onlineUsers.length >= Math.ceil(currentUsers.length / 2); // 50% quorum
  
  // Filter committees to only show ones the user is a member of
  const myCommittees = committees.filter(c => c.memberIds?.includes(myData.id));

  // Send message with optional image attachment
  const sendMessage = async (attachment = null) => {
    if (!messageInput.trim() && !attachment) return;

    try {
      await createMessage({
        userId: myData.id,
        userName: myData.displayName,
        text: messageInput,
        chatroomId: currentCommitteeId,
        attachment: attachment || null,
      });
      setMessageInput("");
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;

    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message.');
    }
  };

  const createNewCommittee = async () => {
    const title = newComRef.current.value.trim();
    if (!title) return;

    try {
      await createCommittee({
        title,
        memberIds: [myData.id],
        memberPermissions: {
          [myData.id]: 'Owner' // Creator is automatically Owner
        }
      });
      newComRef.current.value = "";
    } catch (error) {
      console.error('Error creating committee:', error);
      alert('Failed to create committee.');
    }
  };

  const leaveCommittee = async () => {
    if (!currentCommitteeId) return;
    
    const memberCount = currentCommittee.memberIds?.length || 0;
    const isLastMember = memberCount === 1;
    
    // If owner is leaving and not the last member, handle ownership transfer
    if (isOwner && !isLastMember) {
      // Find all chairs (excluding the owner)
      const chairs = Object.entries(currentCommittee.memberPermissions || {})
        .filter(([id, perm]) => perm === 'Chair' && id !== myData.id)
        .map(([id]) => id);
      
      if (chairs.length > 0) {
        // Promote the first chair to owner
        const newOwnerId = chairs[0];
        const newOwner = users.find(u => u.userId === newOwnerId);
        const newOwnerName = newOwner?.name || 'Unknown';
        
        const confirmMessage = `You are the Owner of "${currentCommittee.title}". Leaving will promote ${newOwnerName} (Chair) to Owner. Continue?`;
        if (!window.confirm(confirmMessage)) return;
        
        try {
          // Promote the chair to owner
          await updateMemberPermission(currentCommitteeId, newOwnerId, 'Owner');
          // Remove the current owner
          await removeMemberFromCommittee(currentCommitteeId, myData.id);
          
          // Switch to another committee or home view
          const remainingCommittees = myCommittees.filter(c => c.id !== currentCommitteeId);
          if (remainingCommittees.length > 0) {
            setCurrentCommitteeId(remainingCommittees[0].id);
          } else {
            setCurrentCommitteeId(null);
            setShowHome(true);
          }
          return;
        } catch (error) {
          console.error('Error transferring ownership:', error);
          alert('Failed to transfer ownership.');
          return;
        }
      } else {
        // No chairs exist, delete the committee
        const confirmMessage = `You are the Owner of "${currentCommittee.title}" and there are no Chairs to transfer ownership to. Leaving will delete this committee. Are you sure?`;
        if (!window.confirm(confirmMessage)) return;
        
        try {
          await deleteCommittee(currentCommitteeId);
          
          // Switch to another committee or home view
          const remainingCommittees = myCommittees.filter(c => c.id !== currentCommitteeId);
          if (remainingCommittees.length > 0) {
            setCurrentCommitteeId(remainingCommittees[0].id);
          } else {
            setCurrentCommitteeId(null);
            setShowHome(true);
          }
          return;
        } catch (error) {
          console.error('Error deleting committee:', error);
          alert('Failed to delete committee.');
          return;
        }
      }
    }
    
    // Only Owner can delete the committee if last member
    if (isLastMember && !isOwner) {
      alert('You cannot leave this committee as the last member. Only the Owner can delete this committee.');
      return;
    }
    
    const confirmMessage = isLastMember 
      ? `You are the last member of "${currentCommittee.title}". Leaving will delete this committee. Are you sure?`
      : `Are you sure you want to leave "${currentCommittee.title}"?`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      if (isLastMember) {
        // Delete the committee if this is the last member (Owner only)
        await deleteCommittee(currentCommitteeId);
      } else {
        // Just remove the member
        await removeMemberFromCommittee(currentCommitteeId, myData.id);
      }
      
      // Switch to another committee or home view
      const remainingCommittees = myCommittees.filter(c => c.id !== currentCommitteeId);
      if (remainingCommittees.length > 0) {
        setCurrentCommitteeId(remainingCommittees[0].id);
      } else {
        setCurrentCommitteeId(null);
        setShowHome(true);
      }
    } catch (error) {
      console.error('Error leaving committee:', error);
      alert('Failed to leave committee.');
    }
  };

  const changeUserRank = async (userId, newPermission) => {
    try {
      // Prevent Owner from being demoted
      const targetUserPermission = currentCommittee.memberPermissions?.[userId];
      if (targetUserPermission === 'Owner' && newPermission !== 'Owner') {
        alert('The Owner cannot be demoted. Ownership is permanent.');
        return;
      }
      
      // Only Owner can change permissions
      if (!isOwner) {
        alert('Only the Owner can change user permissions.');
        return;
      }
      
      // Prevent promoting another user to Owner (only one owner allowed)
      if (newPermission === 'Owner' && userId !== myData.id) {
        alert('There can only be one Owner per committee. You cannot transfer ownership.');
        return;
      }
      
      // Prevent chair from demoting themselves if they're the only chair
      if (userId === myData.id && newPermission !== 'Chair' && newPermission !== 'Owner') {
        const chairs = Object.entries(currentCommittee.memberPermissions || {})
          .filter(([id, perm]) => perm === 'Chair' || perm === 'Owner');
        
        if (chairs.length === 1) {
          alert('You cannot demote yourself. You are the only Chair/Owner in this committee. Please promote another member to Chair first.');
          return;
        }
      }
      
      // Update permission in the current committee only
      await updateMemberPermission(currentCommitteeId, userId, newPermission);
    } catch (error) {
      console.error('Error changing user permission:', error);
      alert('Failed to change user permission.');
    }
  };

const secondMotion = async (motionId) => {
  if (!quorumMet) {
    alert('Quorum not met. Cannot second motion.');
    return;
  }
  try {
    await updateMotion(motionId, {
      status: STATUS_DISCUSSION,
      history: [{
        action: 'Seconded',
        userId: myData.id,
        userName: myData.displayName,
        timestamp: new Date()
      }],
    });
  } catch (error) {
    console.error('Error seconding motion:', error);
    alert('Failed to second motion.');
  }
};


const proposeAmendment = async (motionId, e) => {
  e.preventDefault();
  const amendmentText = e.target.amendment.value.trim();
  if (!amendmentText) return;

  try {
    await addReplyToMotion(motionId, {
      id: myData.id,
      name: myData.displayName,
      msg: `${amendmentText}`,
      stance: 'amendment',
    });
    await updateMotion(motionId, {
      history: [{
        action: 'Proposed Amendment',
        userId: myData.id,
        userName: myData.displayName,
        timestamp: new Date()
      }],
    });
    e.target.reset();
  } catch (error) {
    console.error('Error proposing amendment:', error);
    alert('Failed to propose amendment.');
  }
};




const callTheQuestion = async (motionId) => {
  if (!quorumMet) {
    alert('Quorum not met. Cannot call the question.');
    return;
  }
  if (!window.confirm('Call the question to end discussion and start voting?')) return;

  try {
    // Update the existing motion to voting so the voting UI stays with the motion
    console.log('[App] callTheQuestion -> updating motion to VOTING for', motionId);
    await updateMotion(motionId, {
      status: STATUS_VOTING,
      history: [{
        action: 'Called the Question',
        userId: myData.id,
        userName: myData.displayName,
        timestamp: new Date()
      }],
    });
  } catch (error) {
    console.error('Error calling the question:', error);
    alert('Failed to call the question.');
  }
};


const raiseMotion = async (e) => {
  e.preventDefault();
  const title = e.target.title.value.trim();
  const desc = e.target.desc.value.trim();
  const type = e.target.type.value;
  const status = STATUS_PENDING; // Motions start as pending

  if (!title || !desc) {
    alert('Please enter both title and description');
    return;
  }

  if (!currentCommitteeId) {
    alert('Please select a committee first');
    return;
  }

  try {
    // Create initial history entry
    const initialHistory = [{
      action: 'Proposed',
      userId: myData.id,
      userName: myData.displayName,
      timestamp: new Date()
    }];

    // Create the motion with all required fields
    const motionData = {
      committeeId: currentCommitteeId,
      title,
      desc,
      status,
      type,
      proposedBy: myData.id,
      proposedByName: myData.displayName,
      history: initialHistory,
      replies: [],
      votes: {},
      recorded: false,
    };

    console.log('Creating motion:', motionData);
    const motionId = await createMotion(motionData);
    console.log('Motion created with ID:', motionId);
    
    // Reset form only after successful creation
    e.target.reset();
  } catch (error) {
    console.error('Error raising motion:', error);
    alert('Failed to raise motion. Please try again.');
  }
};

  const addReply = async (motionId, e) => {
    e.preventDefault();
    const stance = e.target.stance.value;
    const msg = e.target.msg.value.trim();

    if (!msg) return;

    try {
      await addReplyToMotion(motionId, {
        id: myData.id,
        name: myData.displayName,
        msg,
        stance,
      });
      e.target.reset();
    } catch (error) {
      console.error('Error adding reply:', error);
      alert('Failed to add reply.');
    }
  };

const startVote = async (motionId) => {
  if (!quorumMet) {
    alert('Quorum not met. Cannot start voting.');
    return;
  }
  try {
    // Prevent starting vote on a postponed motion
    const m = normalizedMotions.find(x => x.id === motionId);
    if (m?.postponed) {
      alert('Cannot start vote: motion is postponed.');
      return;
    }
    await updateMotion(motionId, {
      status: STATUS_VOTING,
      history: [{
        action: 'Started Voting',
        userId: myData.id,
        userName: myData.displayName,
        timestamp: new Date()
      }],
    });
  } catch (error) {
    console.error('Error starting vote:', error);
    alert('Failed to start vote.');
  }
};


const castVoteOnMotion = async (motionId, vote) => {
  if (!quorumMet) {
    alert('Quorum not met. Cannot cast vote.');
    return;
  }
  try {
    // Prevent voting on postponed motions
    const m = normalizedMotions.find(x => x.id === motionId);
    if (m?.postponed) {
      alert('Cannot vote: motion is postponed.');
      return;
    }
    await castVote(motionId, myData.id, vote);
    await updateMotion(motionId, {
      history: [{
        action: `Voted ${vote}`,
        userId: myData.id,
        userName: myData.displayName,
        timestamp: new Date()
      }],
    });
  } catch (error) {
    console.error('Error casting vote:', error);
    alert('Failed to cast vote.');
  }
};


const recordDecision = async (motionId, result, summary) => {
  if (!window.confirm(`Confirm recording decision as ${result}?`)) return;
  try {
    await updateMotion(motionId, {
      status: STATUS_CONCLUDED,
      recorded: true,
      result,
      summary,
      history: [{
        action: `Recorded as ${result}`,
        userId: myData.id,
        userName: myData.displayName,
        timestamp: new Date()
      }],
    });
  } catch (error) {
    console.error('Error recording decision:', error);
    alert('Failed to record decision.');
  }
};

const raiseOverturn = async (motion) => {
  try {
    // Only allow users who voted 'yes' on the original motion to raise an overturn
    const myVote = motion.votes?.[myData.id];
    if (myVote !== 'yes') {
      alert('Only users who voted in favor of the original decision can raise an overturn.');
      return;
    }

    // Prevent duplicate overturns
    if (motion.overturnRaised) {
      alert('An overturn motion has already been raised for this decision.');
      return;
    }

    const committeeIdString = String(currentCommitteeId);
    const overturnData = {
      committeeId: committeeIdString, // Use string version
      title: `Overturn: ${motion.title}`,
      desc: `Overturn previous decision: ${motion.desc}`,
      status: STATUS_PENDING,
      type: "procedure",
      proposedBy: myData.id,
      proposedByName: myData.displayName,
      originalMotionId: motion.id,
      history: [{
        action: 'Proposed Overturn',
        userId: myData.id,
        userName: myData.displayName,
        timestamp: new Date()
      }],
      replies: [],
      votes: {},
    };

    const newMotionId = await createMotion(overturnData);

    // Mark the original motion so no further overturns can be raised
    try {
      await updateMotion(motion.id, {
        overturnRaised: true,
        history: [{
          action: 'Overturn Raised',
          userId: myData.id,
          userName: myData.displayName,
          timestamp: new Date()
        }]
      });
    } catch (err) {
      // Non-fatal: log but continue
      console.error('Failed to mark original motion as having an overturn:', err);
    }
    return newMotionId;
  } catch (error) {
    console.error('Error raising overturn:', error);
    alert('Failed to raise overturn motion.');
  }
};

// Postpone and resume handlers (Chair-only actions)
const postponeMotion = async (motionId) => {
  if (!isChair) {
    alert('Only the Chair can postpone motions.');
    return;
  }
  try {
    console.log('[App] postponeMotion called for', motionId);
    await updateMotion(motionId, {
      postponed: true,
      history: [{ action: 'Postponed', userId: myData.id, userName: myData.displayName, timestamp: new Date() }]
    });
  } catch (err) {
    console.error('Error postponing motion:', err);
    alert('Failed to postpone motion.');
  }
};

const resumeMotion = async (motionId) => {
  if (!isChair) {
    alert('Only the Chair can resume motions.');
    return;
  }
  try {
    console.log('[App] resumeMotion called for', motionId);
    await updateMotion(motionId, {
      postponed: false,
      history: [{ action: 'Resumed', userId: myData.id, userName: myData.displayName, timestamp: new Date() }]
    });
  } catch (err) {
    console.error('Error resuming motion:', err);
    alert('Failed to resume motion.');
  }
};

// (editMotion removed — edit-as-revise functionality replaced by sub-motions only)

// Create a sub-motion linked to a parent motion
const createSubMotion = async (parentMotionId, title, desc) => {
  try {
    if (!quorumMet) {
      alert('Quorum not met. Cannot create sub-motion.');
      return;
    }

    const motionData = {
      committeeId: currentCommitteeId,
      title,
      desc,
      status: STATUS_PENDING,
      type: 'submotion',
      proposedBy: myData.id,
      proposedByName: myData.displayName,
      relatedMotionId: parentMotionId,
      history: [{ action: 'Submotion Proposed', userId: myData.id, userName: myData.displayName, timestamp: new Date() }],
      replies: [],
      votes: {},
      recorded: false,
    };

    const newId = await createMotion(motionData);

    // mark parent motion as revised and add history entry so it moves to history
    try {
      await updateMotion(parentMotionId, {
        revised: true,
        revisedBy: myData.id,
        revisedAt: new Date(),
        revisedTo: newId,
        history: [{ action: 'Revised (submotion created)', userId: myData.id, userName: myData.displayName, timestamp: new Date() }]
      });
    } catch (err) {
      console.error('Failed to mark parent motion as revised:', err);
    }

    setSubMotionParentId(null);
    setSubTitle('');
    setSubDesc('');
    return newId;
  } catch (err) {
    console.error('Error creating sub-motion:', err);
    alert('Failed to create sub-motion.');
  }
};

  const handleEmojiClick = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const insertEmoji = (emoji) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert("Only image files are allowed.");
    e.target.value = null;
    return;
  }
  if (file.size > 100 * 1024) { // 100KB limit to keep Firestore documents small
    alert("File size exceeds 100KB limit for Base64 storage.");
    e.target.value = null;
    return;
  }
  try {
    // Convert file to Base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = reader.result;
      const attachment = {
        name: file.name,
        size: file.size,
        type: file.type,
        base64: base64String, // Store Base64 string instead of URL
      };
      await sendMessage(attachment);
      e.target.value = null;
    };
    reader.onerror = () => {
      alert('Failed to read image file.');
      e.target.value = null;
    };
  } catch (error) {
    console.error('Error processing file:', error);
    alert('Failed to process image. Please try again.');
    e.target.value = null;
  }
};

  const handleLogout = async () => {
    if (myData.id) {
      await updateUserOnlineStatus(myData.id, false).catch(console.error);
    }
    localStorage.removeItem('auth0_token');
    localStorage.removeItem('auth0_user');

    if (auth0Available && logout && isAuthenticated) {
      logout({ logoutParams: { returnTo: window.location.origin + '/login' } });
    } else {
      window.userStore && window.userStore.removeCurrentUser();
      navigate('/login');
    }
  };

  if (auth0Available && isLoading) {
    return <div>Loading...</div>;
  }

  // Normalize statuses so comparisons work even if Firestore stored strings
  const normalizedMotions = motions.map((m) => ({ ...m, status: normalizeStatus(m.status) }));
  // Active motions exclude recorded or revised ones
  const activeMotions = normalizedMotions.filter(m => !m.recorded && !m.revised);
  // Past decisions include recorded or revised motions
  const pastDecisions = normalizedMotions.filter(m => m.recorded || m.revised);

  const handleCommitteeSelect = (committeeId) => {
    const selectedCommittee = committees.find(c => c.id === committeeId);
    
    // Auto-join committee if not already a member
    if (myData.id && selectedCommittee && !selectedCommittee.memberIds?.includes(myData.id)) {
      addMemberToCommittee(committeeId, myData.id).catch(console.error);
    }
    
    setCurrentCommitteeId(committeeId);
    setShowHome(false);
  };

  // Filter committees based on search query
  const filteredCommittees = committees.filter(committee =>
    committee.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard" role="main">
      <header className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-semibold">Committee Dashboard</h1>
          <button
            onClick={() => setShowHome(true)}
            aria-label="Go to home"
            className="px-2 py-1 rounded bg-accent text-white text-sm"
          >
            Home
          </button>
        </div>
        {/* Firebase project indicator removed from UI (kept console debug in config) */}
        <div className="user-profile flex items-center space-x-3">
          <img src={resolveUserImage({ userId: myData.id }, 'placeholder-avatar.png')} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
          <span>{myData.displayName}</span>
          <span className="status">Online</span>
          <button onClick={() => navigate('/profile')} aria-label="Go to profile">Profile</button>
          <button className="logout-btn" onClick={handleLogout} aria-label="Log out">Logout</button>
        </div>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <aside className="sidebar">
          <h2>Members ({onlineUsers.length}/{currentUsers.length})</h2>
          <p>Quorum: {quorumMet ? 'Met' : 'Not Met'}</p>
          <div className="members-list-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
            <ul className="online-users" role="list">
            {currentUsers.map((user) => {
              const userPermission = currentCommittee.memberPermissions?.[user.userId] || 'Member';
              const avatarSrc = resolveUserImage(user, 'placeholder-avatar.png');
              const isOnline = !!user.online;
              return (
                <li key={user.id} className={`flex items-center space-x-2 ${isOnline ? '' : 'opacity-60'}`}>
                  <button onClick={() => setSelectedUser(user)} className="p-0 border-0 bg-transparent cursor-pointer">
                    <img src={avatarSrc} alt={`${user.name || 'User'} avatar`} className={`w-8 h-8 rounded-full object-cover ${isOnline ? '' : 'grayscale'}`} />
                  </button>
                  <div className="flex-1">
                    <div className={`font-semibold text-sm ${isOnline ? '' : 'text-gray-400'}`}>
                      <button onClick={() => setSelectedUser(user)} className="text-left p-0 m-0 border-0 bg-transparent text-inherit cursor-pointer">
                        {user.name}
                      </button>
                      <span className="text-xs opacity-75"> ({userPermission})</span>
                    </div>
                    <div className="text-xs" aria-live="polite">{isOnline ? 'Online' : 'Offline'}</div>
                  </div>
                  {user.hasStar && <span className="leader-symbol" aria-label="Leader">★</span>}
                  {isOwner && (
                    <select
                      value={userPermission}
                      onChange={(e) => changeUserRank(user.userId, e.target.value)}
                      aria-label={`Change permission for ${user.name}`}
                      disabled={userPermission === 'Owner'}
                    >
                      <option>Owner</option>
                      <option>Chair</option>
                      <option>Member</option>
                      <option>Observer</option>
                    </select>
                  )}
                </li>
              );
            })}
            </ul>
          </div>
          <div className="committees">
            <h2>Committees</h2>
            <input ref={newComRef} placeholder="New Committee Title" aria-label="New committee title" />
            <button onClick={createNewCommittee}>Create Committee</button>
            {committeesLoading ? (
              <p>Loading committees...</p>
            ) : (
              <ul role="list">
                {myCommittees.map((com) => (
                  <li
                    key={com.id}
                    className={com.id === currentCommitteeId ? "active" : ""}
                    onClick={() => handleCommitteeSelect(com.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleCommitteeSelect(com.id)}
                  >
                    {com.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <section className="chat-section">
          {showHome ? (
            <>
              <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>All Committees</span>
                <input
                  type="text"
                  placeholder="Search committees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #4F5D75',
                    backgroundColor: '#2D3142',
                    color: 'white',
                    fontSize: '14px',
                    width: '250px'
                  }}
                  aria-label="Search committees"
                />
              </div>
              <div className="chat-messages" style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                  {committeesLoading ? (
                    <p>Loading committees...</p>
                  ) : filteredCommittees.length === 0 ? (
                    <p>{searchQuery ? `No committees found matching "${searchQuery}"` : 'No committees available. Create one to get started!'}</p>
                  ) : (
                    filteredCommittees.map((committee) => {
                      const committeeUsers = users.filter(u => committee.memberIds?.includes(u.userId));
                      const onlineCount = committeeUsers.filter(u => u.online).length;
                      return (
                        <div 
                          key={committee.id}
                          onClick={() => handleCommitteeSelect(committee.id)}
                          style={{
                            backgroundColor: '#4F5D75',
                            padding: '20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            border: currentCommitteeId === committee.id ? '2px solid #EF8354' : '2px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <h3 style={{ color: '#EF8354', marginBottom: '10px', fontSize: '18px' }}>{committee.title}</h3>
                          <p style={{ color: '#BFC0C0', fontSize: '14px', marginBottom: '8px' }}>
                            Members: {committee.memberIds?.length || 0}
                          </p>
                          <p style={{ color: '#BFC0C0', fontSize: '14px' }}>
                            Online: {onlineCount}/{committee.memberIds?.length || 0}
                          </p>
                          {currentCommitteeId === committee.id && (
                            <p style={{ color: '#EF8354', fontSize: '12px', marginTop: '8px', fontWeight: 'bold' }}>
                              Currently Selected
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Chat Window - {currentCommittee.title || 'Select a Committee'}</span>
                {currentCommitteeId && (
                  <button
                    onClick={leaveCommittee}
                    style={{
                      backgroundColor: '#EF8354',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    aria-label="Leave committee"
                  >
                    Leave Committee
                  </button>
                )}
              </div>
              <div className="chat-messages" ref={chatRef} role="log" aria-live="polite">
                {messagesLoading ? (
                  <div className="loading-messages">Loading messages...</div>
                ) : (
                  messages.map((m) => (
                      <ChatMessage
                        key={m.id}
                        m={m}
                        myData={myData}
                        users={users}
                        onDelete={handleDeleteMessage}
                        onShowProfile={setSelectedUser}
                      />
                  ))
                )}
              </div>
              <div className="chat-input-container">
                {showEmojiPicker && (
                  <div className="emoji-picker-mock" role="menu">
                    <span onClick={() => insertEmoji("🚀")} role="menuitem">🚀</span>
                    <span onClick={() => insertEmoji("🍎")} role="menuitem">🍎</span>
                    <span onClick={() => insertEmoji("💡")} role="menuitem">💡</span>
                    <span onClick={() => insertEmoji("👍")} role="menuitem">👍</span>
                    <span onClick={() => insertEmoji("👎")} role="menuitem">👎</span>
                    <span onClick={() => insertEmoji("✅")} role="menuitem">✅</span>
                    <span onClick={() => insertEmoji("❌")} role="menuitem">❌</span>
                    <span onClick={() => insertEmoji("🎉")} role="menuitem">🎉</span>
                  </div>
                )}
                <div className="chat-input">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    disabled={slowMode && !isChair}
                    aria-label="Chat message input"
                  />
                  <button onClick={() => sendMessage()} aria-label="Send message">Send</button>
                  <button onClick={handleEmojiClick} aria-label="Toggle emoji picker">Emoji</button>
                  <button onClick={handleUploadClick} aria-label="Upload image">Upload</button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </>
          )}
        </section>
        <aside className="motions-section" ref={motionsRef}>
          <div style={{ display: 'flex', alignItems: 'flex-start', maxHeight: '40px'}}>
            <h2 style={{ margin: 0 }}>Motions & Polls</h2>
            <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto', flexShrink: 0 }}>
              <button
                onClick={() => setMotionsTab('active')}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  backgroundColor: motionsTab === 'active' ? '#EF8354' : '#BFC0C0',
                  color: motionsTab === 'active' ? 'white' : '#2D3142',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: motionsTab === 'active' ? 'bold' : 'normal',
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content'
                }}
                aria-label="View active motions"
              >
                Active
              </button>
              <button
                onClick={() => setMotionsTab('history')}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  backgroundColor: motionsTab === 'history' ? '#EF8354' : '#BFC0C0',
                  color: motionsTab === 'history' ? 'white' : '#2D3142',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: motionsTab === 'history' ? 'bold' : 'normal',
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content'
                }}
                aria-label="View motion history"
              >
                History
              </button>
            </div>
          </div>
          {motionsTab === 'active' && (
            <>
              <div className="new-motion">
            <h3>Raise New Motion</h3>
            <form onSubmit={raiseMotion}>
              <input name="title" placeholder="Motion Title" required aria-label="Motion title" />
              <textarea name="desc" placeholder="Motion Description" required aria-label="Motion description" />
              <select name="type" aria-label="Motion type">
                <option value="normal">Normal Motion (Majority)</option>
                <option value="procedure">Procedure Change (2/3 vote)</option>
                <option value="special">Special Motion (No Discussion)</option>
              </select>
              <button type="submit">Raise Motion</button>
            </form>
          </div>
          {motionsLoading ? (
            <p>Loading motions...</p>
          ) : (
            <div className="active-motions-container">
              {activeMotions.map((motion) => {
                const yesVotes = Object.values(motion.votes || {}).filter((v) => v === "yes").length;
                const noVotes = Object.values(motion.votes || {}).filter((v) => v === "no").length;
                const totalVotes = yesVotes + noVotes;
                const requiredVotes = motion.type === "procedure" ? Math.ceil(totalVotes * 2 / 3) : Math.ceil(totalVotes / 2);
                return (
                  <div key={motion.id} className="motion">
                    <h3>{motion.title}</h3>
                    <p>{motion.desc}</p>
                    {motion.relatedMotionId && (() => {
                      const parent = normalizedMotions.find(x => x.id === motion.relatedMotionId);
                      return (
                        <div style={{ fontSize: '12px', color: '#BFC0C0', marginTop: '6px' }}>
                          Created from: {parent ? parent.title : motion.relatedMotionId}
                        </div>
                      );
                    })()}
                    <div className="status">
                      Status: {motionStatusNames[motion.status]}
                      {motion.type !== "normal" && ` (${motion.type})`}
                    </div>
                    <small>Proposed by: {motion.proposedByName}</small>
                    {isChair && (
                      <button
                        onClick={() => motion.postponed ? resumeMotion(motion.id) : postponeMotion(motion.id)}
                        style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '12px' }}
                      >
                        {motion.postponed ? 'Resume' : 'Postpone'}
                      </button>
                    )}
                    {motion.postponed && (
                      <div style={{ marginTop: '6px', color: '#FBBF24', fontSize: '12px' }}>Postponed — actions paused</div>
                    )}
                    {motion.status === STATUS_PENDING && myData.id !== motion.proposedBy && (
                      <button onClick={() => secondMotion(motion.id)} disabled={!quorumMet || motion.postponed}>
                        Second Motion
                      </button>
                    )}
                    <div className="replies">
                      <h4>Discussion</h4>
                      <ul>
                        {(motion.replies || []).map((r, i) => (
                          <li key={i}>
                            <span className={r.stance}>{r.stance.toUpperCase()}</span>: {r.msg}
                            <em> - {r.name}</em>
                          </li>
                        ))}
                      </ul>
                      {motion.status === STATUS_DISCUSSION && !motion.postponed && (
                        <>
                          <form onSubmit={(e) => addReply(motion.id, e)} className="flex flex-col gap-2 mt-2">
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                              <select name="stance" aria-label="Reply stance" className="p-2 rounded bg-secondary text-primary border border-gray-600" style={{ minWidth: '110px' }}>
                                <option value="pro">Pro</option>
                                <option value="con">Con</option>
                                <option value="neutral">Neutral</option>
                              </select>
                              <button type="submit" className="px-3 py-2 rounded bg-accent text-white" style={{ whiteSpace: 'nowrap' }}>Add Reply</button>
                            </div>
                            <textarea
                              name="msg"
                              rows={3}
                              placeholder="Your comment..."
                              required
                              aria-label="Reply comment"
                              className="w-full p-2 rounded bg-primary text-secondary border border-gray-600 focus:outline-none"
                              style={{ resize: 'vertical' }}
                            />
                          </form>

                          <form onSubmit={(e) => proposeAmendment(motion.id, e)} className="flex flex-col gap-2 mt-2">
                            <label style={{ fontSize: '12px', color: '#BFC0C0' }}>Propose an amendment</label>
                            <textarea
                              name="amendment"
                              rows={2}
                              placeholder="Propose amendment..."
                              required
                              aria-label="Amendment text"
                              className="w-full p-2 rounded bg-primary text-secondary border border-gray-600 focus:outline-none"
                              style={{ resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <button type="submit" className="px-3 py-2 rounded bg-accent text-white">Propose Amendment</button>
                            </div>
                          </form>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                            <button onClick={() => callTheQuestion(motion.id)} disabled={!quorumMet || motion.postponed}>
                                Call the Question
                              </button>
                            {quorumMet && (
                                <button
                                  onClick={() => setSubMotionParentId(subMotionParentId === motion.id ? null : motion.id)}
                                >
                                  {subMotionParentId === motion.id ? 'Cancel Submotion' : 'Create Sub-motion'}
                                </button>
                            )}
                          </div>

                          {/* Edit UI removed — sub-motions used for revisions */}

                          {/* Sub-motion form */}
                          {subMotionParentId === motion.id && (
                            <form onSubmit={async (e) => { e.preventDefault(); await createSubMotion(motion.id, subTitle, subDesc); }} className="mt-2 flex flex-col gap-2">
                              <input value={subTitle} onChange={(e) => setSubTitle(e.target.value)} placeholder="Submotion title" className="p-2 rounded bg-primary text-secondary border border-gray-600" required />
                              <textarea value={subDesc} onChange={(e) => setSubDesc(e.target.value)} rows={2} placeholder="Submotion description" className="p-2 rounded bg-primary text-secondary border border-gray-600" required />
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button type="submit" className="px-3 py-2 rounded bg-accent text-white">Create Sub-motion</button>
                                <button type="button" onClick={() => { setSubMotionParentId(null); setSubTitle(''); setSubDesc(''); }} className="px-3 py-2 rounded bg-gray-500 text-white">Cancel</button>
                              </div>
                            </form>
                          )}

                          {/* Render nested sub-motions linked to this motion */}
                          {normalizedMotions.filter(sm => sm.relatedMotionId === motion.id && !sm.recorded && !sm.revised).length > 0 && (
                            <div className="submotions mt-2" style={{ paddingLeft: '12px', borderLeft: '2px dashed rgba(255,255,255,0.05)' }}>
                              <h5 style={{ margin: 0, fontSize: '12px', color: '#BFC0C0' }}>Sub-motions</h5>
                              {normalizedMotions.filter(sm => sm.relatedMotionId === motion.id && !sm.recorded && !sm.revised).map((sm) => (
                                <div key={sm.id} style={{ marginTop: '6px', padding: '6px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                                  <strong style={{ fontSize: '13px' }}>{sm.title}</strong>
                                  <div style={{ fontSize: '12px', color: '#BFC0C0' }}>{sm.desc}</div>
                                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Status: {motionStatusNames[sm.status]}</div>
                                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Created from: {motion.title}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="poll-interface">
                      {motion.status === STATUS_VOTING && !motion.postponed && (
                        <>
                          <p>Votes needed: {requiredVotes} ({motion.type === "procedure" ? "2/3" : "Majority"})</p>
                          <button 
                            onClick={() => castVoteOnMotion(motion.id, "yes")}
                            style={{
                              backgroundColor: motion.votes?.[myData.id] === "yes" ? '#10b981' : undefined,
                              border: motion.votes?.[myData.id] === "yes" ? '2px solid #059669' : undefined,
                              fontWeight: motion.votes?.[myData.id] === "yes" ? 'bold' : undefined
                            }}
                          >
                            {motion.votes?.[myData.id] === "yes" ? '✓ ' : ''}Vote Yes
                          </button>
                          <button 
                            onClick={() => castVoteOnMotion(motion.id, "no")}
                            style={{
                              backgroundColor: motion.votes?.[myData.id] === "no" ? '#ef4444' : undefined,
                              border: motion.votes?.[myData.id] === "no" ? '2px solid #dc2626' : undefined,
                              fontWeight: motion.votes?.[myData.id] === "no" ? 'bold' : undefined
                            }}
                          >
                            {motion.votes?.[myData.id] === "no" ? '✓ ' : ''}Vote No
                          </button>
                          <button 
                            onClick={() => castVoteOnMotion(motion.id, "abstain")}
                            style={{
                              backgroundColor: motion.votes?.[myData.id] === "abstain" ? '#f59e0b' : undefined,
                              border: motion.votes?.[myData.id] === "abstain" ? '2px solid #d97706' : undefined,
                              fontWeight: motion.votes?.[myData.id] === "abstain" ? 'bold' : undefined
                            }}
                          >
                            {motion.votes?.[myData.id] === "abstain" ? '✓ ' : ''}Abstain
                          </button>
                        </>
                      )}
                    </div>
                    <div className="votes">
                      <h4>Votes</h4>
                      {anonymousVoting ? (
                        <p>
                          Yes: {yesVotes} | No: {noVotes} | Abstain: {Object.values(motion.votes || {}).filter((v) => v === "abstain").length}
                        </p>
                      ) : (
                        <ul>
                          {Object.entries(motion.votes || {}).map(([userId, vote]) => (
                            <li key={userId}>
                              {users.find((u) => u.userId === userId)?.name || 'Unknown'}: {vote}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {motion.history && <MotionHistory history={motion.history} />}
                    {isChair && (
                      <div style={{ marginTop: '10px' }}>
                        {motion.status === STATUS_VOTING && (
                          <>
                            <textarea
                              placeholder="Decision summary..."
                              id={`summary-${motion.id}`}
                              style={{ width: '100%', marginTop: '5px', backgroundColor: '#fff', color: '#2D3142', padding: '8px', borderRadius: '4px' }}
                              aria-label="Decision summary"
                            />
                            <button onClick={() => recordDecision(
                              motion.id,
                              "passed",
                              document.getElementById(`summary-${motion.id}`).value
                            )}>
                              Record Passed
                            </button>
                            <button onClick={() => recordDecision(
                              motion.id,
                              "failed",
                              document.getElementById(`summary-${motion.id}`).value
                            )}>
                              Record Failed
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {isChair && (
            <div className="control-panel">
              <h3>Chair Controls</h3>
              <label>
                <input
                  type="checkbox"
                  checked={slowMode}
                  onChange={(e) => setSlowMode(e.target.checked)}
                />
                Enable Slow Mode
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={anonymousVoting}
                  onChange={(e) => setAnonymousVoting(e.target.checked)}
                />
                Anonymous Voting
              </label>
            </div>
          )}
          </>
          )}
          {motionsTab === 'history' && (
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
              {pastDecisions.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#BFC0C0', marginTop: '20px' }}>No recorded decisions yet.</p>
              ) : (
                pastDecisions.map((motion) => {
                  const yesVotes = Object.values(motion.votes || {}).filter((v) => v === "yes").length;
                  const noVotes = Object.values(motion.votes || {}).filter((v) => v === "no").length;
                  const abstainVotes = Object.values(motion.votes || {}).filter((v) => v === "abstain").length;
                  const myVote = motion.votes?.[myData.id];
                  return (
                    <div key={motion.id} className="past-decision">
                      <h3>{motion.title}</h3>
                      <p>{motion.desc}</p>
                      <div>
                        Result: {motion.revised ? (
                          'Revised'
                        ) : (
                          motion.result?.toUpperCase() || 'N/A'
                        )}
                        {motion.revised && motion.revisedTo && (() => {
                          const revisedMotion = normalizedMotions.find(x => x.id === motion.revisedTo);
                          return (
                            <div style={{ marginTop: '6px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600' }}>Revised to sub-motion: {revisedMotion ? <span>{revisedMotion.title}</span> : <span>{motion.revisedTo}</span>}</div>
                              {revisedMotion?.desc && <div style={{ fontSize: '12px', color: '#BFC0C0', marginTop: '4px' }}>{revisedMotion.desc}</div>}
                            </div>
                          );
                        })()}
                      </div>
                      <div>Summary: {motion.summary}</div>
                      <div>Discussion: {(motion.replies || []).length} replies</div>
                      <div>
                        Votes: Yes {yesVotes} | No {noVotes} | Abstain {abstainVotes}
                      </div>
                      {motion.history && <MotionHistory history={motion.history} />}
                      {myVote === "yes" && (
                        <button
                          onClick={() => raiseOverturn(motion)}
                          disabled={!!motion.overturnRaised}
                          style={motion.overturnRaised ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                          aria-disabled={!!motion.overturnRaised}
                        >
                          {motion.overturnRaised ? 'Overturn Raised' : 'Raise Overturn Motion'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </aside>
        {/* User Profile Modal */}
        {selectedUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedUser(null)}
          >
            <div className="absolute inset-0 bg-black opacity-50"></div>
            <div
              className="relative bg-primary rounded-card p-6 w-full max-w-md z-60 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-4 mb-4">
                <img src={resolveUserImage(selectedUser, 'placeholder-avatar.png')} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
                <div>
                  <h3 className="text-white text-lg font-bold">{selectedUser.name || selectedUser.userId}</h3>
                  <div className="text-xs text-gray-400">{selectedUser.online ? 'Online' : 'Offline'}</div>
                </div>
                <button onClick={() => setSelectedUser(null)} aria-label="Close" className="ml-auto text-white">✕</button>
              </div>
              <div className="text-sm text-secondary">
                {(() => {
                  try {
                    const bioMap = JSON.parse(localStorage.getItem('profile_bio_overrides') || '{}');
                    return bioMap[selectedUser.userId] || selectedUser.bio || 'No bio available.';
                  } catch (e) {
                    return selectedUser.bio || 'No bio available.';
                  }
                })()}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}