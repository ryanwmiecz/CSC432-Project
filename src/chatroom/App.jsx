import React, { useState, useEffect, useRef } from "react";
import "./App.css";

export default function App() {
  // If there's no current user, send the browser to the standalone login page.
  useEffect(() => {
    try {
      if (!window.userStore || !window.userStore.getCurrentUser()) {
        window.location.href = '/login.html';
      }
    } catch (e) {
      console.warn('Error checking auth state', e);
    }
  }, []);

  const STATUS_INVALID = 0;
  const STATUS_DISCUSSION = 1;
  const STATUS_VOTING = 2;
  const STATUS_CONCLUDED = 3;
  const motionStatusNames = ["Invalid Status", "In Discussion...", "Voting...", "Concluded"];

  // Initialize state with localStorage
  let storedData = window.localStorage.getItem("appData");
  const initialData = storedData
    ? JSON.parse(storedData)
    : {
        users: [
          { name: "Bob", rank: "Chair", hasStar: true, id: 1, online: true },
          { name: "Davy Jones", rank: "Member", hasStar: false, id: 2, online: true },
          { name: "Cheeseman", rank: "Observer", hasStar: false, id: 3, online: true },
        ],
        committees: [
          {
            title: "Free Pony Committee",
            id: 1,
            memberIds: [1, 2, 3],
            motions: [
              {
                title: "Free Pony",
                desc: "Free ponies for all!",
                status: STATUS_DISCUSSION,
                type: "normal",
                replies: [],
                votes: {},
                summary: "",
                recorded: false,
              },
            ],
            messages: [
              { time: "10:07am", id: 1, msg: "Sup team" },
              { time: "10:10am", id: 2, msg: "Salutations..." },
              { time: "12:32pm", id: 3, msg: "Ruh roh rhaggy!" },
            ],
          },
          { title: "Committee B", id: 2, memberIds: [], motions: [], messages: [] },
          { title: "Committee Monitoring Committee", id: 3, memberIds: [], motions: [], messages: [] },
        ],
      };

  const [myData, setMyData] = useState({ displayName: "Davy Jones", id: 2, rank: "Member" });
  const [data, setData] = useState(initialData);
  const [currentCommitteeId, setCurrentCommitteeId] = useState(1);
  const [messageInput, setMessageInput] = useState(window.localStorage.getItem("inputString") || "");
  const [slowMode, setSlowMode] = useState(false);
  const [anonymousVoting, setAnonymousVoting] = useState(false);

  const currentCommittee = data.committees.find((c) => c.id === currentCommitteeId) || { memberIds: [], motions: [], messages: [] };
  const currentUsers = currentCommittee.memberIds.map((id) => data.users.find((u) => u.id === id)).filter(Boolean);
  const onlineUsers = currentUsers.filter((u) => u.online);
  const isChair = myData.rank === "Chair";
  const chatRef = useRef(null);
  const motionsRef = useRef(null);
  const newComRef = useRef(null);
  const addUserRef = useRef(null);

  // Save data to localStorage on update
  useEffect(() => {
    window.localStorage.setItem("appData", JSON.stringify(data));
    window.localStorage.setItem("inputString", messageInput);
  }, [data, messageInput]);

  // Scroll to bottom of chat on message update
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [currentCommittee.messages.length]);

  // Handle own online status based on tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      updateData((nd) => {
        const user = nd.users.find((u) => u.id === myData.id);
        if (user) user.online = document.visibilityState === "visible";
      });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    handleVisibility();
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [myData.id]);

  // TODO: Real-time polling
  useEffect(() => {
    const interval = setInterval(() => {
      // fetch('/api/update').then(res => res.json()).then(newData => setData(newData));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateData = (updater) => {
    setData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      updater(newData);
      return newData;
    });
  };

  const sendMessage = () => {
    if (!messageInput.trim()) return;
    const newMsg = {
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      id: myData.id,
      msg: messageInput,
    };
    updateData((nd) => {
      const com = nd.committees.find((c) => c.id === currentCommitteeId);
      if (com) com.messages.push(newMsg);
    });
    setMessageInput("");
  };

  const createCommittee = () => {
    const title = newComRef.current.value;
    if (!title) return;
    const newId = data.committees.length + 1;
    updateData((nd) => {
      nd.committees.push({ title, id: newId, memberIds: [myData.id], motions: [], messages: [] });
    });
    newComRef.current.value = "";
  };

  const addUserToCommittee = () => {
    const id = parseInt(addUserRef.current.value);
    if (!id || currentCommittee.memberIds.includes(id)) return;
    updateData((nd) => {
      const com = nd.committees.find((c) => c.id === currentCommitteeId);
      if (com) com.memberIds.push(id);
    });
  };

  const changeUserRank = (userId, newRank) => {
    updateData((nd) => {
      const user = nd.users.find((u) => u.id === userId);
      if (user) user.rank = newRank;
    });
    if (userId === myData.id) {
      setMyData({ ...myData, rank: newRank });
    }
  };

  const changeDisplayName = () => {
    const newName = prompt("Enter new display name:");
    if (!newName) return;
    updateData((nd) => {
      const user = nd.users.find((u) => u.id === myData.id);
      if (user) user.name = newName;
    });
    setMyData({ ...myData, displayName: newName });
  };

  const raiseMotion = (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const desc = e.target.desc.value;
    const type = e.target.type.value;
    const status = type === "special" ? STATUS_VOTING : STATUS_DISCUSSION;
    if (!title || !desc) return;
    updateData((nd) => {
      const com = nd.committees.find((c) => c.id === currentCommitteeId);
      if (com) {
        com.motions.push({
          title,
          desc,
          status,
          type,
          replies: [],
          votes: {},
          summary: "",
          recorded: false,
        });
      }
    });
    e.target.reset();
  };

  const addReply = (motionIndex, e) => {
    e.preventDefault();
    const stance = e.target.stance.value;
    const msg = e.target.msg.value;
    if (!msg) return;
    const newReply = { id: myData.id, msg, stance };
    updateData((nd) => {
      const com = nd.committees.find((c) => c.id === currentCommitteeId);
      if (com) com.motions[motionIndex].replies.push(newReply);
    });
    e.target.reset();
  };

  const startVote = (motionIndex) => {
    updateData((nd) => {
      const com = nd.committees.find((c) => c.id === currentCommitteeId);
      if (com) com.motions[motionIndex].status = STATUS_VOTING;
    });
  };

  const castVote = (motionIndex, vote) => {
    updateData((nd) => {
      const com = nd.committees.find((c) => c.id === currentCommitteeId);
      if (com) com.motions[motionIndex].votes[myData.id] = vote;
    });
  };

  const recordDecision = (motionIndex, result, summary) => {
    updateData((nd) => {
      const com = nd.committees.find((c) => c.id === currentCommitteeId);
      if (com) {
        const motion = com.motions[motionIndex];
        motion.summary = summary;
        motion.recorded = true;
        motion.status = STATUS_CONCLUDED;
        motion.result = result;
      }
    });
  };

  const raiseOverturn = (motion) => {
    updateData((nd) => {
      const com = nd.committees.find((c) => c.id === currentCommitteeId);
      if (com) {
        com.motions.push({
          title: `Overturn: ${motion.title}`,
          desc: `Overturn previous decision: ${motion.desc}`,
          status: STATUS_DISCUSSION,
          type: "procedure",
          replies: [],
          votes: {},
          summary: "",
          recorded: false,
        });
      }
    });
  };

  const availableUsers = data.users.filter((u) => !currentCommittee.memberIds.includes(u.id));

  return (
    <div className="dashboard">
      <header>
        <h1>Committee Dashboard</h1>
        <div className="user-profile">
          <img src="placeholder-avatar.png" alt="Profile" />
          <span>{myData.displayName}</span>
          <span className="status">{data.users.find((u) => u.id === myData.id)?.online ? "Online" : "Offline"}</span>
          <button onClick={changeDisplayName}>Change Name</button>
          <button className="logout-btn">Logout</button>
        </div>
      </header>
      <main>
        <aside className="sidebar">
          <h2>Online Users</h2>
          <ul className="online-users">
            {onlineUsers.map((user) => (
              <li key={user.id}>
                <div className="avatar"></div>
                <span>
                  {user.name} ({user.rank})
                </span>
                <span className="status">{user.online ? "Online" : "Offline"}</span>
                {user.hasStar && <span className="leader-symbol">★</span>}
                {isChair && (
                  <select value={user.rank} onChange={(e) => changeUserRank(user.id, e.target.value)}>
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
              <select ref={addUserRef}>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button onClick={addUserToCommittee}>Add to Committee</button>
            </div>
          )}
          <div className="committees">
            <h2>Committees</h2>
            <input ref={newComRef} placeholder="New Committee Title" />
            <button onClick={createCommittee}>Create Committee</button>
            <ul>
              {data.committees.map((com) => (
                <li
                  key={com.id}
                  className={com.id === currentCommitteeId ? "active" : ""}
                  onClick={() => setCurrentCommitteeId(com.id)}
                >
                  {com.title}
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <section className="chat-section">
          <div className="chat-header">Chat Window - {currentCommittee.title}</div>
          <div className="chat-messages" ref={chatRef}>
            {currentCommittee.messages.map((m, index) => {
              const isMine = m.id === myData.id;
              const sender = data.users.find((u) => u.id === m.id)?.name || "Unknown";
              return (
                <div key={index} className={`message ${isMine ? "sent" : "received"}`}>
                  <div className="sender">{sender}</div>
                  <div className="message-content">{m.msg}</div>
                  <span className="timestamp">{m.time}</span>
                </div>
              );
            })}
          </div>
          <div className="chat-input">
            <input
              id="messageToSend"
              type="text"
              placeholder="Type your message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={slowMode && !isChair}
            />
            <button onClick={sendMessage}>Send</button>
            <button>Emoji</button>
            <button>Upload</button>
          </div>
        </section>
        <aside className="motions-section" ref={motionsRef}>
          <h2>Motions & Polls</h2>
          <div className="new-motion">
            <h3>Raise New Motion</h3>
            <form onSubmit={raiseMotion}>
              <input name="title" placeholder="Title" required />
              <textarea name="desc" placeholder="Description" required />
              <select name="type">
                <option value="normal">Normal</option>
                <option value="procedure">Procedure Change (2/3 vote)</option>
                <option value="special">Special (No Discussion)</option>
              </select>
              <button type="submit">Raise Motion</button>
            </form>
          </div>
          {currentCommittee.motions.filter((m) => !m.recorded).map((motion, index) => (
            <div key={index} className="motion">
              <h3>{motion.title}</h3>
              <p>{motion.desc}</p>
              <div className="status">
                Status: {motionStatusNames[motion.status]} {motion.type !== "normal" && `(${motion.type})`}
              </div>
              <div className="replies">
                <h4>Discussion</h4>
                <ul>
                  {motion.replies.map((r, i) => (
                    <li key={i}>
                      <span className={r.stance}>{r.stance.toUpperCase()}</span>: {r.msg} by{" "}
                      {data.users.find((u) => u.id === r.id)?.name || "Unknown"}
                    </li>
                  ))}
                </ul>
                {motion.status === STATUS_DISCUSSION && (
                  <form onSubmit={(e) => addReply(index, e)}>
                    <select name="stance">
                      <option value="pro">Pro</option>
                      <option value="con">Con</option>
                      <option value="neutral">Neutral</option>
                    </select>
                    <input name="msg" placeholder="Reply..." required />
                    <button type="submit">Add Reply</button>
                  </form>
                )}
              </div>
              <div className="poll-interface">
                {motion.status === STATUS_VOTING && (
                  <>
                    <button onClick={() => castVote(index, "yes")}>Vote Yes</button>
                    <button onClick={() => castVote(index, "no")}>Vote No</button>
                    <button onClick={() => castVote(index, "abstain")}>Abstain</button>
                  </>
                )}
              </div>
              <div className="votes">
                <h4>Votes</h4>
                {anonymousVoting ? (
                  <p>
                    Yes: {Object.values(motion.votes).filter((v) => v === "yes").length} | No:{" "}
                    {Object.values(motion.votes).filter((v) => v === "no").length} | Abstain:{" "}
                    {Object.values(motion.votes).filter((v) => v === "abstain").length}
                  </p>
                ) : (
                  <ul>
                    {Object.entries(motion.votes).map(([userId, vote]) => (
                      <li key={userId}>
                        {data.users.find((u) => u.id === parseInt(userId))?.name}: {vote}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
          {isChair && (
            <div className="control-panel">
              <h3>Chair Controls</h3>
              <label>
                <input type="checkbox" checked={slowMode} onChange={(e) => setSlowMode(e.target.checked)} /> Enable Slow Mode
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={anonymousVoting}
                  onChange={(e) => setAnonymousVoting(e.target.checked)}
                /> Anonymous Voting
              </label>
              {currentCommittee.motions.filter((m) => !m.recorded).map((motion, index) => (
                <div key={index}>
                  {motion.status === STATUS_DISCUSSION && <button onClick={() => startVote(index)}>Start Vote on {motion.title}</button>}
                  {motion.status === STATUS_VOTING && (
                    <>
                      <textarea placeholder="Summary..." id={`summary-${index}`}></textarea>
                      <button onClick={() => recordDecision(index, "passed", document.getElementById(`summary-${index}`).value)}>
                        Record Passed
                      </button>
                      <button onClick={() => recordDecision(index, "failed", document.getElementById(`summary-${index}`).value)}>
                        Record Failed
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <h2>Past Decisions</h2>
          {currentCommittee.motions.filter((m) => m.recorded).map((motion, index) => (
            <div key={index} className="past-decision">
              <h3>{motion.title}</h3>
              <p>{motion.desc}</p>
              <div>Result: {motion.result?.toUpperCase()}</div>
              <div>Summary: {motion.summary}</div>
              <div>Discussion: {motion.replies.length} replies</div>
              <div>
                Votes: Yes {Object.values(motion.votes).filter((v) => v === "yes").length} | No{" "}
                {Object.values(motion.votes).filter((v) => v === "no").length} | Abstain{" "}
                {Object.values(motion.votes).filter((v) => v === "abstain").length}
              </div>
              {motion.votes[myData.id] === "yes" && <button onClick={() => raiseOverturn(motion)}>Raise Overturn</button>}
            </div>
          ))}
        </aside>
      </main>
    </div>
  );
}