import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

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
      <main className="min-h-screen flex items-center justify-center bg-medium-blue border-[30px] border-accent">
        <div className="bg-primary rounded-card p-8 shadow-card">
          <h1 className="text-accent text-2xl font-bold">Loading...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-medium-blue p-4 border-[30px] border-accent">
      <div className="bg-primary rounded-card p-8 w-full max-w-md flex flex-col items-center gap-compact shadow-card">
        <h1 className="text-accent text-3xl font-bold mb-4">Login</h1>
        
        <div className="w-full mb-compact">
          <input 
            type="text" 
            className="w-full px-4 py-2.5 rounded-input border-2 border-transparent focus:border-accent focus:outline-none transition-colors text-primary bg-white" 
            placeholder="Username" 
            value={username} 
            onChange={e=>setUsername(e.target.value)} 
          />
        </div>
        
        <div className="w-full mb-compact">
          <input 
            type="password" 
            className="w-full px-4 py-2.5 rounded-input border-2 border-transparent focus:border-accent focus:outline-none transition-colors text-primary bg-white" 
            placeholder="Password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleLogin(e)}
          />
        </div>
        
        {warning && (
          <div className="text-red-500 text-sm mb-compact text-center w-full">{warning}</div>
        )}
        
        <button 
          className="w-3/4 bg-secondary text-primary font-semibold py-2.5 px-6 rounded-button hover:bg-opacity-80 transition-all duration-200 mb-2" 
          onClick={handleLogin}
        >
          Log In
        </button>
        
        <button 
          className="w-3/4 bg-secondary text-primary font-semibold py-2.5 px-6 rounded-button hover:bg-opacity-80 transition-all duration-200" 
          onClick={() => navigate('/signup')}
        >
          Sign Up
        </button>
      </div>
    </main>
  );
}
