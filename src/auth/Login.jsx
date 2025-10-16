import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [warning, setWarning] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setWarning('');
    if (!username || !password) {
      setWarning('Enter both username and password.');
      return;
    }
    const user = window.userStore ? window.userStore.getUser(username) : null;
    if (user && user.password === password) {
      window.userStore.setCurrentUser(username);
      navigate('/profile');
      return;
    }
    setWarning('Incorrect username or password');
  };

  return (
    <div className="loginWindow">
      <h1>Login</h1>
      <div className="username">
        <input type="text" className="usernameInput" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
      </div>
      <div className="password">
        <input type="password" className="passwordInput" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      </div>
      <div className="warning" id="warning">{warning}</div>
      <div className="buttonRow">
        <button className="loginButton" onClick={handleLogin}>Log In</button>
        <button className="signupButton" onClick={() => navigate('/signup')}>Sign Up</button>
      </div>
    </div>
  );
}
