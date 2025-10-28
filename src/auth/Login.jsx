import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [warning, setWarning] = useState('');
  
  // Try to use Auth0 if available
  let auth0Available = false;
  let isAuthenticated = false;
  let isLoading = false;
  let loginWithCredentials = null;
  
  try {
    const auth0 = useAuth0();
    auth0Available = true;
    isAuthenticated = auth0.isAuthenticated;
    isLoading = auth0.isLoading;
    loginWithCredentials = auth0.loginWithCredentials;
  } catch (e) {
    // Auth0 not configured, use fallback
    auth0Available = false;
  }

  // If user is authenticated, redirect to profile
  useEffect(() => {
    // Check if user already has an auth token
    const auth0Token = localStorage.getItem('auth0_token');
    
    if (auth0Token) {
      // Already logged in via custom form
      navigate('/profile');
      return;
    }
    
    if (auth0Available && isAuthenticated) {
      // Already logged in via Auth0 SDK
      navigate('/profile');
    }
  }, [isAuthenticated, navigate, auth0Available]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setWarning('');
    
    if (!username || !password) {
      setWarning('Enter both username and password.');
      return;
    }

    if (auth0Available) {
      // Use Auth0 as database with custom login form
      try {
        console.log('[Login] Attempting Auth0 login...');
        // Convert username to email format to match signup
        const loginEmail = username.includes('@') ? username : `${username}@local.app`;
        console.log('[Login] Using email:', loginEmail);
        
        const response = await fetch(`https://${import.meta.env.VITE_AUTH0_DOMAIN}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
            username: loginEmail,
            password: password,
            client_id: import.meta.env.VITE_AUTH0_CLIENT_ID,
            realm: 'Username-Password-Authentication',
            scope: 'openid profile email'
          })
        });

        console.log('[Login] Response status:', response.status);
        const data = await response.json();
        console.log('[Login] Response data:', data);
        
        if (response.ok && data.access_token) {
          console.log('[Login] Login successful!');
          // Store token and redirect
          localStorage.setItem('auth0_token', data.access_token);
          localStorage.setItem('auth0_user', username);
          navigate('/profile');
        } else {
          console.error('[Login] Login failed:', data);
          setWarning(data.error_description || data.message || 'Incorrect username or password');
        }
      } catch (error) {
        console.error('[Login] Login error:', error);
        setWarning('Login failed. Please try again.');
      }
    } else {
      // Fallback to local userStore
      const user = window.userStore ? window.userStore.getUser(username) : null;
      if (user && user.password === password) {
        window.userStore.setCurrentUser(username);
        navigate('/profile');
        return;
      }
      setWarning('Incorrect username or password');
    }
  };

  if (auth0Available && isLoading) {
    return (
      <main id="main">
        <div className="loginWindow">
          <h1>Loading...</h1>
        </div>
      </main>
    );
  }

  return (
    <main id="main">
      <div className="loginWindow">
        <h1>Login</h1>
        <div className="username">
          <input 
            type="text" 
            className="usernameInput" 
            placeholder="Username" 
            value={username} 
            onChange={e=>setUsername(e.target.value)} 
          />
        </div>
        <div className="password">
          <input 
            type="password" 
            className="passwordInput" 
            placeholder="Password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleLogin(e)}
          />
        </div>
        <div className="warning" id="warning">{warning}</div>
        <button className="loginButton" onClick={handleLogin}>
          Log In
        </button>
        <button className="signupButton" onClick={() => navigate('/signup')}>
          Sign Up
        </button>
      </div>
    </main>
  );
}
