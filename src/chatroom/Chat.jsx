import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.userStore || !window.userStore.getCurrentUser()) {
      navigate('/login');
      return;
    }
    const stored = window.localStorage.getItem('msgHistory');
    setMessages(stored ? JSON.parse(stored) : [
      { time: '10:07am', id: 'Bob', msg: 'Sup team' },
      { time: '10:10am', id: 'Davy Jones', msg: 'Salutations...' },
    ]);
  }, []);

  const send = () => {
    if (!input.trim()) return;
    const user = window.userStore.getCurrentUser();
    const next = [...messages, { id: user.username, msg: input, time: new Date().toLocaleTimeString() }];
    setMessages(next);
    setInput('');
    window.localStorage.setItem('msgHistory', JSON.stringify(next));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Chat</h2>
      <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #ccc', padding: 8 }}>
        {messages.map((m, i) => (
          <div key={i}><strong>{m.id}:</strong> {m.msg} <small>({m.time})</small></div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} />
        <button onClick={send}>Send</button>
        <button onClick={()=>navigate('/profile')} style={{ marginLeft: 8 }}>Profile</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => { window.userStore.removeCurrentUser(); navigate('/login'); }}>Logout</button>
      </div>
    </div>
  );
}
