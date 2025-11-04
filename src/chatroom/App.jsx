import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
//import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import "./App.css";
import { useMessages, useCommittees, useMotions, useUsers } from '../firebase/hooks';
import {
  createMessage,
  deleteMessage,
  formatTimestamp,
  createCommittee,
  updateCommittee,
  addMemberToCommittee,
  createMotion,
  updateMotion,
  addReplyToMotion,
  castVote,
  createOrUpdateUser,
  updateUserRank,
  updateUserOnlineStatus,
} from '../firebase/firestoreService';

// Motion status constants (Robert's Rules of Order)
const STATUS_PENDING = 0; // New: Pending second
const STATUS_DISCUSSION = 1;
const STATUS_VOTING = 2;
const STATUS_CONCLUDED = 3;
const motionStatusNames = ["Pending Second", "In Discussion...", "Voting...", "Concluded"];


// Helper component for displaying messages with attachments
const ChatMessage = ({ m, myData, users, onDelete }) => {
  const isMine = m.userId === myData.id || m.id === myData.id;
  const sender = users.find((u) => u.userId === m.id || u.userId === m.userId)?.name || m.userName || "Unknown";
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Validate Base64 string to prevent XSS
  const isValidBase64Image = (base64) => {
    return typeof base64 === 'string' && base64.startsWith('data:image/');
  };

  return (
    <div className={`message ${isMine ? "sent" : "received"}`} role="listitem">
      <div className="sender">{sender}</div>
      {m.attachment && isValidBase64Image(m.attachment.base64) ? (
        <div className="message-content attachment-container">
          <p className="attachment-type">🖼️ Image Attachment</p>
          <div className="image-placeholder">
            <img
              src={m.attachment.base64}
              alt={m.attachment.name || "Attachment"}
              className="chat-image"
              onClick={() => setIsPreviewOpen(true)}
              aria-label="Click to preview image"
            />
            {isPreviewOpen && (
              <div className="image-preview-modal" onClick={() => setIsPreviewOpen(false)}>
                <img
                  src={m.attachment.base64}
                  alt="Full-size attachment"
                  className="preview-image"
                />
              </div>
            )}
          </div>
          {m.text && <p className="image-caption">{m.text}</p>}
        </div>
      ) : m.attachment ? (
        <div className="message-content attachment-container">
          <p>Invalid or unsupported image attachment</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--secondary-light)' }}>
            {m.attachment.name}
          </p>
        </div>
      ) : (
        <div className="message-content text-message">{m.msg || m.text}</div>
      )}
      <span className="timestamp">
        {m.createdAt ? formatTimestamp(m.createdAt) : m.time}
      </span>
      {isMine && onDelete && (
        <button
          className="delete-msg-btn"
          onClick={() => onDelete(m.id)}
          aria-label="Delete message"
        >
          ×
        </button>
      )}
    </div>
  );
};

// Component for motion history log
const MotionHistory = ({ history }) => (
  <div className="motion-history">
    <h4>Motion History</h4>
    <ul>
      {history.map((entry, index) => (
        <li key={index}>
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

  // Firestore hooks
  const { committees, loading: committeesLoading } = useCommittees();
  const { messages, loading: messagesLoading } = useMessages(currentCommitteeId, 100);
  const { motions, loading: motionsLoading } = useMotions(currentCommitteeId);
  const { users } = useUsers();
  const chatRef = useRef(null);
  const motionsRef = useRef(null);
  const newComRef = useRef(null);
  const addUserRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Set default committee
  useEffect(() => {
    if (committees.length > 0 && !currentCommitteeId) {
      setCurrentCommitteeId(committees[0].id);
    }
  }, [committees, currentCommitteeId]);

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

  // Update online status on visibility change
  useEffect(() => {
    if (!myData.id) return;
    const handleVisibility = () => {
      const isOnline = document.visibilityState === 'visible';
      updateUserOnlineStatus(myData.id, isOnline).catch(console.error);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility();

    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [myData.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages.length]);

  const currentCommittee = committees.find((c) => c.id === currentCommitteeId) || { memberIds: [] };
  const currentUsers = users.filter(u => currentCommittee.memberIds?.includes(u.userId));
  const onlineUsers = currentUsers.filter((u) => u.online);
  const isChair = myData.rank === "Chair";
  const availableUsers = users.filter((u) => !currentCommittee.memberIds?.includes(u.userId));
  const quorumMet = onlineUsers.length >= Math.ceil(currentUsers.length / 2); // 50% quorum

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
      });
      newComRef.current.value = "";
    } catch (error) {
      console.error('Error creating committee:', error);
      alert('Failed to create committee.');
    }
  };

  const addUserToCommittee = async () => {
    const userId = addUserRef.current.value;
    if (!userId) return;

    try {
      await addMemberToCommittee(currentCommitteeId, userId);
    } catch (error) {
      console.error('Error adding user to committee:', error);
      alert('Failed to add user to committee.');
    }
  };

  const changeUserRank = async (userId, newRank) => {
    try {
      await updateUserRank(userId, newRank);
      if (userId === myData.id) {
        setMyData(prev => ({ ...prev, rank: newRank }));
      }
    } catch (error) {
      console.error('Error changing user rank:', error);
      alert('Failed to change user rank.');
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
        history: [{ action: 'Seconded', userId: myData.id, userName: myData.displayName, timestamp: new Date() }],
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
        msg: `Amendment: ${amendmentText}`,
        stance: 'amendment',
      });
      await updateMotion(motionId, {
        history: [{ action: 'Proposed Amendment', userId: myData.id, userName: myData.displayName, timestamp: new Date() }],
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
      await createMotion({
        committeeId: currentCommitteeId,
        title: `Call the Question on Motion`,
        desc: `End discussion and move to vote on motion ${motionId}`,
        status: STATUS_VOTING,
        type: 'procedure',
        proposedBy: myData.id,
        proposedByName: myData.displayName,
        relatedMotionId: motionId,
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

    if (!title || !desc) return;

    try {
      await createMotion({
        committeeId: currentCommitteeId,
        title,
        desc,
        status,
        type,
        proposedBy: myData.id,
        proposedByName: myData.displayName,
        history: [{ action: 'Proposed', userId: myData.id, userName: myData.displayName, timestamp: new Date() }],
      });
      e.target.reset();
    } catch (error) {
      console.error('Error raising motion:', error);
      alert('Failed to raise motion.');
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
      await updateMotion(motionId, {
        status: STATUS_VOTING,
        history: [{ action: 'Started Voting', userId: myData.id, userName: myData.displayName, timestamp: new Date() }],
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
      await castVote(motionId, myData.id, vote);
      await updateMotion(motionId, {
        history: [{ action: `Voted ${vote}`, userId: myData.id, userName: myData.displayName, timestamp: new Date() }],
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
        history: [{ action: `Recorded as ${result}`, userId: myData.id, userName: myData.displayName, timestamp: new Date() }],
      });
    } catch (error) {
      console.error('Error recording decision:', error);
      alert('Failed to record decision.');
    }
  };

  const raiseOverturn = async (motion) => {
    try {
      await createMotion({
        committeeId: currentCommitteeId,
        title: `Overturn: ${motion.title}`,
        desc: `Overturn previous decision: ${motion.desc}`,
        status: STATUS_PENDING,
        type: "procedure",
        proposedBy: myData.id,
        proposedByName: myData.displayName,
        originalMotionId: motion.id,
        history: [{ action: 'Proposed Overturn', userId: myData.id, userName: myData.displayName, timestamp: new Date() }],
      });
    } catch (error) {
      console.error('Error raising overturn:', error);
      alert('Failed to raise overturn motion.');
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

  const handleLogout = () => {
    if (myData.id) {
      updateUserOnlineStatus(myData.id, false).catch(console.error);
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

  const activeMotions = motions.filter(m => !m.recorded);
  const pastDecisions = motions.filter(m => m.recorded);

  return (
    <div className="dashboard" role="main">
      <header>
        <h1>Committee Dashboard</h1>
        <div className="user-profile">
          <img src={getImageFor(myData.id, 'placeholder-avatar.png')} alt="Profile" style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <span>{myData.displayName}</span>
          <span className="status">Online</span>
          <button onClick={() => navigate('/profile')} aria-label="Go to profile">Profile</button>
          <button className="logout-btn" onClick={handleLogout} aria-label="Log out">Logout</button>
        </div>
      </header>
      <main>
        <aside className="sidebar">
          <h2>Online Users ({onlineUsers.length}/{currentUsers.length})</h2>
          <p>Quorum: {quorumMet ? 'Met' : 'Not Met'}</p>
          <ul className="online-users" role="list">
            {onlineUsers.map((user) => (
              <li key={user.id}>
                <div className="avatar" aria-hidden="true"></div>
                <span>{user.name} ({user.rank || 'Member'})</span>
                <span className="status">{user.online ? "Online" : "Offline"}</span>
                {user.hasStar && <span className="leader-symbol" aria-label="Leader">★</span>}
                {isChair && (
                  <select
                    value={user.rank || 'Member'}
                    onChange={(e) => changeUserRank(user.userId, e.target.value)}
                    aria-label={`Change rank for ${user.name}`}
                  >
                    <option>Chair</option>
                    <option>Member</option>
                    <option>Observer</option>
                  </select>
                )}
              </li>
            ))}
          </ul>
          {isChair && availableUsers.length > 0 && (
            <div className="add-user">
              <select ref={addUserRef} aria-label="Select user to add">
                <option value="">Select user...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.userId}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button onClick={addUserToCommittee}>Add to Committee</button>
            </div>
          )}
          <div className="committees">
            <h2>Committees</h2>
            <input ref={newComRef} placeholder="New Committee Title" aria-label="New committee title" />
            <button onClick={createNewCommittee}>Create Committee</button>
            {committeesLoading ? (
              <p>Loading committees...</p>
            ) : (
              <ul role="list">
                {committees.map((com) => (
                  <li
                    key={com.id}
                    className={com.id === currentCommitteeId ? "active" : ""}
                    onClick={() => setCurrentCommitteeId(com.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setCurrentCommitteeId(com.id)}
                  >
                    {com.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <section className="chat-section">
          <div className="chat-header">
            Chat Window - {currentCommittee.title || 'Select a Committee'}
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
        </section>
        <aside className="motions-section" ref={motionsRef}>
          <h2>Motions & Polls</h2>
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
            <>
              {activeMotions.map((motion) => {
                const yesVotes = Object.values(motion.votes || {}).filter((v) => v === "yes").length;
                const noVotes = Object.values(motion.votes || {}).filter((v) => v === "no").length;
                const totalVotes = yesVotes + noVotes;
                const requiredVotes = motion.type === "procedure" ? Math.ceil(totalVotes * 2 / 3) : Math.ceil(totalVotes / 2);
                return (
                  <div key={motion.id} className="motion">
                    <h3>{motion.title}</h3>
                    <p>{motion.desc}</p>
                    <div className="status">
                      Status: {motionStatusNames[motion.status]}
                      {motion.type !== "normal" && ` (${motion.type})`}
                    </div>
                    <small>Proposed by: {motion.proposedByName}</small>
                    {motion.status === STATUS_PENDING && myData.id !== motion.proposedBy && (
                      <button onClick={() => secondMotion(motion.id)} disabled={!quorumMet}>
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
                      {motion.status === STATUS_DISCUSSION && (
                        <>
                          <form onSubmit={(e) => addReply(motion.id, e)}>
                            <select name="stance" aria-label="Reply stance">
                              <option value="pro">Pro</option>
                              <option value="con">Con</option>
                              <option value="neutral">Neutral</option>
                            </select>
                            <input name="msg" placeholder="Your comment..." required aria-label="Reply comment" />
                            <button type="submit">Add Reply</button>
                          </form>
                          <form onSubmit={(e) => proposeAmendment(motion.id, e)}>
                            <input name="amendment" placeholder="Propose amendment..." required aria-label="Amendment text" />
                            <button type="submit">Propose Amendment</button>
                          </form>
                          <button onClick={() => callTheQuestion(motion.id)} disabled={!quorumMet}>
                            Call the Question
                          </button>
                        </>
                      )}
                    </div>
                    <div className="poll-interface">
                      {motion.status === STATUS_VOTING && (
                        <>
                          <p>Votes needed: {requiredVotes} ({motion.type === "procedure" ? "2/3" : "Majority"})</p>
                          <button onClick={() => castVoteOnMotion(motion.id, "yes")}>Vote Yes</button>
                          <button onClick={() => castVoteOnMotion(motion.id, "no")}>Vote No</button>
                          <button onClick={() => castVoteOnMotion(motion.id, "abstain")}>Abstain</button>
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
                        {motion.status === STATUS_DISCUSSION && (
                          <button onClick={() => startVote(motion.id)} disabled={!quorumMet}>
                            Start Vote
                          </button>
                        )}
                        {motion.status === STATUS_VOTING && (
                          <>
                            <textarea
                              placeholder="Decision summary..."
                              id={`summary-${motion.id}`}
                              style={{ width: '100%', marginTop: '5px' }}
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
            </>
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
          <h2>Past Decisions</h2>
          {pastDecisions.map((motion) => {
            const yesVotes = Object.values(motion.votes || {}).filter((v) => v === "yes").length;
            const noVotes = Object.values(motion.votes || {}).filter((v) => v === "no").length;
            const abstainVotes = Object.values(motion.votes || {}).filter((v) => v === "abstain").length;
            const myVote = motion.votes?.[myData.id];
            return (
              <div key={motion.id} className="past-decision">
                <h3>{motion.title}</h3>
                <p>{motion.desc}</p>
                <div>Result: {motion.result?.toUpperCase()}</div>
                <div>Summary: {motion.summary}</div>
                <div>Discussion: {(motion.replies || []).length} replies</div>
                <div>
                  Votes: Yes {yesVotes} | No {noVotes} | Abstain {abstainVotes}
                </div>
                {motion.history && <MotionHistory history={motion.history} />}
                {myVote === "yes" && (
                  <button onClick={() => raiseOverturn(motion)}>
                    Raise Overturn Motion
                  </button>
                )}
              </div>
            );
          })}
        </aside>
      </main>
    </div>
  );
}