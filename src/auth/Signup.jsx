import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Signup.css';

export default function Signup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRe, setPasswordRe] = useState('');
  const [warning, setWarning] = useState('');

  const handle = (e) => {
    e.preventDefault();
    setWarning('');
    const u = username && username.trim();
    if (!u) { setWarning('Please enter a username.'); return; }
    if (!password) { setWarning('Please enter a password.'); return; }
    if (password !== passwordRe) { setWarning('Passwords do not match.'); return; }
    const added = window.userStore ? window.userStore.addUser(u, password) : false;
    if (!added) { setWarning('Username already exists or store unavailable.'); return; }
    navigate('/login');
  };

  return (
    <main id="main">
      <div className="loginWindow">
        <h1>Sign Up</h1>
        <h2>Create a username</h2>
        <div className="username">
          <input type="text" className="usernameInput" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
        </div>
        <h2>Create a password</h2>
        <div className="password">
          <input type="password" className="passwordInput" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <h2>Input the password again</h2>
        <div className="password">
          <input type="password" className="passwordInput" placeholder="Password" value={passwordRe} onChange={e=>setPasswordRe(e.target.value)} />
        </div>
        <div className="warning" id="signupWarning">{warning}</div>
        <button className="signupButton" onClick={handle}>Sign Up</button>
      </div>
    </main>
  );
}
