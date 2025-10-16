import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const IN_DISCUSSION = 1;
const motionStatusNames = [
  'Invalid Status',
  'In Discussion...',
  'Concluding...',
];

const initialData = {
  curUserId: 4,
  users: [
    { name: 'Bob', rank: 'Chair', hasStar: true, id: 1 },
    { name: 'Davy Jones', rank: 'Member', hasStar: false, id: 2 },
    { name: 'Cheeseman', rank: 'Observer', hasStar: false, id: 3 },
  ],
  curComId: 4,
  committees: [
    { title: 'Free Pony Committee', id: 1 },
    { title: 'Committee B', id: 2 },
    { title: 'Committee Monitoring Committee', id: 3 },
  ],
  motion: {
    title: 'Free Pony',
    desc: 'Free ponies for all!',
    status: IN_DISCUSSION,
  },
};

const initialChatHistory = [
  { type: 0, time: '10:07am', id: 1, msg: 'Sup team' },
  { type: 0, time: '10:10am', id: 2, msg: 'Salutations...' },
  { type: 0, time: '12:32pm', id: 3, msg: 'Ruh roh rhaggy!' },
];

function Dashboard({ onLogout }) {
  const [data, setData] = useState(initialData);
  const [chatHistory, setChatHistory] = useState(initialChatHistory);
  const [newMessage, setNewMessage] = useState('');
  const [animateMessage, setAnimateMessage] = useState(null);
  const myData = { displayName: 'Davy Jones', id: 2 };
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const storedData = localStorage.getItem('dashboardData');
    const storedChat = localStorage.getItem('chatHistory');
    if (storedData) {
      setData(JSON.parse(storedData));
    }
    if (storedChat) {
      setChatHistory(JSON.parse(storedChat));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboardData', JSON.stringify(data));
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [data, chatHistory]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        type: 0,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        id: myData.id,
        msg: newMessage,
      };
      setChatHistory([...chatHistory, newMsg]);
      setAnimateMessage(newMsg);
      setNewMessage('');
      setTimeout(() => setAnimateMessage(null), 1000); // Clear animation after 1s
    }
  };

  // Simulate receiving a message (for demo purposes)
  const simulateReceiveMessage = () => {
    const newMsg = {
      type: 0,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      id: 1, // Bob sends a message
      msg: 'Received: ' + Math.random().toString(36).substring(7),
    };
    setChatHistory([...chatHistory, newMsg]);
    setAnimateMessage(newMsg);
    setTimeout(() => setAnimateMessage(null), 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-[#2D3142] text-white font-sans">
      <header className="bg-[#4F5D75] p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Committee Dashboard</h1>
        <div className="flex items-center gap-4">
          <img src="placeholder-avatar.png" alt="Profile" className="w-10 h-10 rounded-full bg-[#BFC0C0]" />
          <span className="font-bold">{myData.displayName}</span>
          <span className="w-2.5 h-2.5 bg-limegreen rounded-full"></span>
          <button
            onClick={onLogout}
            className="bg-[#EF8354] text-white border-none py-2 px-4 rounded cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-[#4F5D75] p-4 overflow-y-auto">
          <h2 className="text-[#EF8354] font-bold">Online Users</h2>
          <ul className="list-none p-0">
            {data.users.map((user) => (
              <li key={user.id} className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#BFC0C0]"></div>
                <span>{`${user.name} (${user.rank})`}</span>
                <span className="w-2 h-2 bg-limegreen rounded-full"></span>
                {user.hasStar && <span className="text-[#EF8354] font-bold ml-auto">★</span>}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <h2 className="text-[#EF8354] font-bold">Committees</h2>
            <ul className="list-none p-0">
              {data.committees.map((committee) => (
                <li
                  key={committee.id}
                  className="bg-[#2D3142] p-2 mb-2 rounded"
                >
                  {committee.title}
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <section className="flex-1 flex flex-col bg-white text-[#2D3142]">
          <div className="bg-[#BFC0C0] p-4 font-bold">Chat Window - Current Committee</div>
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[70%] p-2 rounded-2xl relative ${
                  msg.id === myData.id ? 'self-end bg-[#EF8354] text-white' : 'self-start bg-[#BFC0C0] text-[#2D3142]'
                } ${animateMessage === msg ? 'animate-fadeIn' : ''}`}
              >
                <div className="text-xs font-bold">{data.users.find((u) => u.id === msg.id)?.name}</div>
                {msg.msg}
                <span className="text-xs text-gray-500 absolute bottom-[-1.2rem] right-0">{msg.time}</span>
              </div>
            ))}
          </div>
          <div className="flex p-4 bg-[#BFC0C0]">
            <input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 p-2 border border-[#4F5D75] rounded text-[#2D3142]"
            />
            <button
              onClick={handleSendMessage}
              className="bg-[#EF8354] text-white border-none py-2 px-4 ml-2 rounded cursor-pointer"
            >
              Send
            </button>
            <button className="bg-[#EF8354] text-white border-none py-2 px-4 ml-2 rounded cursor-pointer">
              Emoji
            </button>
            <button className="bg-[#EF8354] text-white border-none py-2 px-4 ml-2 rounded cursor-pointer">
              Upload
            </button>
            <button
              onClick={simulateReceiveMessage}
              className="bg-[#EF8354] text-white border-none py-2 px-4 ml-2 rounded cursor-pointer"
            >
              Simulate Receive
            </button>
          </div>
        </section>
        <aside className="w-80 bg-[#4F5D75] p-4 overflow-y-auto">
          <h2 className="text-[#EF8354] font-bold">Motions & Polls</h2>
          <div className="bg-[#2D3142] p-4 mb-4 rounded">
            <h3>{data.motion.title}</h3>
            <p>{data.motion.desc}</p>
            <div className="text-sm text-[#BFC0C0]">Status: {motionStatusNames[data.motion.status]}</div>
          </div>
          <div className="mt-4">
            <button className="bg-[#EF8354] text-white border-none py-2 w-full rounded cursor-pointer mb-2">
              Vote Yes
            </button>
            <button className="bg-[#EF8354] text-white border-none py-2 w-full rounded cursor-pointer mb-2">
              Vote No
            </button>
            <button className="bg-[#EF8354] text-white border-none py-2 w-full rounded cursor-pointer mb-2">
              Abstain
            </button>
            <button className="bg-[#EF8354] text-white border-none py-2 w-full rounded cursor-pointer mb-2">
              Raise Hand (Pro)
            </button>
            <button className="bg-[#EF8354] text-white border-none py-2 w-full rounded cursor-pointer mb-2">
              Raise Hand (Con)
            </button>
          </div>
          <div className="bg-[#2D3142] p-4 rounded">
            <h3 className="text-[#EF8354] font-bold">Chair Controls</h3>
            <label className="block mb-2">
              <input type="checkbox" /> Enable Slow Mode
            </label>
            <label className="block mb-2">
              <input type="checkbox" /> Anonymous Voting
            </label>
            <button className="bg-[#EF8354] text-white border-none py-2 w-full rounded cursor-pointer mb-2">
              Start Vote
            </button>
            <button className="bg-[#EF8354] text-white border-none py-2 w-full rounded cursor-pointer">
              Record Decision
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default Dashboard;