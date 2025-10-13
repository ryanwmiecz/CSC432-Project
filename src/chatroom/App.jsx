import React, { useState, useEffect } from "react";
import "./App.css"; // we'll move your CSS here

export default function App() {
  const IN_DISCUSSION = 1;
  const motionStatusNames = ["Invalid Status", "In Discussion...", "Concluding..."];

  const [myData] = useState({ displayName: "Davy Jones", id: 2 });

  const [data] = useState({
    users: [
      { name: "Bob", rank: "Chair", hasStar: true, id: 1 },
      { name: "Davy Jones", rank: "Member", hasStar: false, id: 2 },
      { name: "Cheeseman", rank: "Observer", hasStar: false, id: 3 },
    ],
    committees: [
      { title: "Free Pony Committee", id: 1 },
      { title: "Committee B", id: 2 },
      { title: "Committee Monitoring Committee", id: 3 },
    ],
    motion: {
      title: "Free Pony",
      desc: "Free ponies for all!",
      status: IN_DISCUSSION,
    },
  });

  const [chatHistory] = useState([
    { time: "10:07am", id: 1, msg: "Sup team" },
    { time: "10:10am", id: 2, msg: "Salutations..." },
    { time: "12:32pm", id: 3, msg: "Ruh roh rhaggy!" },
  ]);

  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState(chatHistory);

  const sendMessage = () => {
    if (!messageInput.trim()) return;
    const newMsg = {
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      id: myData.id,
      msg: messageInput,
    };
    setMessages([...messages, newMsg]);
    setMessageInput("");
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Committee Dashboard</h1>
        <div className="user-profile">
          <img src="placeholder-avatar.png" alt="Profile" />
          <span>{myData.displayName}</span>
          <span className="status"></span>
          <button className="logout-btn">Logout</button>
        </div>
      </header>

      <main>
        {/* Sidebar */}
        <aside className="sidebar">
          <h2>Online Users</h2>
          <ul className="online-users">
            {data.users.map((user) => (
              <li key={user.id}>
                <div className="avatar"></div>
                <span>
                  {user.name} ({user.rank})
                </span>
                <span className="status"></span>
                {user.hasStar && <span className="leader-symbol">★</span>}
              </li>
            ))}
          </ul>

          <div className="committees">
            <h2>Committees</h2>
            <ul>
              {data.committees.map((com) => (
                <li key={com.id}>{com.title}</li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Chat Section */}
        <section className="chat-section">
          <div className="chat-header">Chat Window - Current Committee</div>
          <div className="chat-messages">
            {messages.map((m, index) => {
              const isMine = m.id === myData.id;
              const sender = data.users.find((u) => u.id === m.id)?.name || "Unknown";
              return (
                <div key={index} className={`message ${isMine ? "sent" : "received"}`}>
                  <div className="sender">{isMine ? "You" : sender}</div>
                  {m.msg}
                  <span className="timestamp">{m.time}</span>
                </div>
              );
            })}
          </div>
          <div className="chat-input">
            <input
              type="text"
              placeholder="Type your message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
            <button>Emoji</button>
            <button>Upload</button>
          </div>
        </section>

        {/* Motions Section */}
        <aside className="motions-section">
          <h2>Motions & Polls</h2>
          <div className="motion">
            <h3>{data.motion.title}</h3>
            <p>{data.motion.desc}</p>
            <div className="status">
              Status: {motionStatusNames[data.motion.status]}
            </div>
          </div>

          <div className="poll-interface">
            <button>Vote Yes</button>
            <button>Vote No</button>
            <button>Abstain</button>
            <button>Raise Hand (Pro)</button>
            <button>Raise Hand (Con)</button>
          </div>

          <div className="control-panel">
            <h3>Chair Controls</h3>
            <label>
              <input type="checkbox" /> Enable Slow Mode
            </label>
            <label>
              <input type="checkbox" /> Anonymous Voting
            </label>
            <button>Start Vote</button>
            <button>Record Decision</button>
          </div>
        </aside>
      </main>
    </div>
  );
}
