import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import './Signup.css';

export default function Signup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRe, setPasswordRe] = useState('');
  const [warning, setWarning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Try to use Auth0 if available
  let auth0Available = false;
  let isAuthenticated = false;
  let isLoading = false;
  
  try {
    const auth0 = useAuth0();
    auth0Available = true;
    isAuthenticated = auth0.isAuthenticated;
    isLoading = auth0.isLoading;
  } catch (e) {
    // Auth0 not configured, use fallback
    auth0Available = false;
  }

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

  const handleSignup = async (e) => {
    e.preventDefault();
    setWarning('');
    setIsSubmitting(true);
    
    const u = username && username.trim();
    if (!u) { 
      setWarning('Please enter a username.'); 
      setIsSubmitting(false);
      return; 
    }
    if (!password) { 
      setWarning('Please enter a password.'); 
      setIsSubmitting(false);
      return; 
    }
    if (password !== passwordRe) { 
      setWarning('Passwords do not match.'); 
      setIsSubmitting(false);
      return; 
    }

    if (auth0Available) {
      // Create user in Auth0 database
      try {
        console.log('[Signup] Attempting Auth0 signup with:', {
          domain: import.meta.env.VITE_AUTH0_DOMAIN,
          clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
          username: u
        });
        
        const response = await fetch(`https://${import.meta.env.VITE_AUTH0_DOMAIN}/dbconnections/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: import.meta.env.VITE_AUTH0_CLIENT_ID,
            email: `${u}@local.app`, // Use username as email prefix
            password: password,
            connection: 'Username-Password-Authentication',
            username: u,
            user_metadata: {
              bio: 'Hello World'
            }
          })
        });

        console.log('[Signup] Response status:', response.status);
        const data = await response.json();
        console.log('[Signup] Response data:', data);
        
        if (response.ok) {
          // Success - redirect to login
          console.log('[Signup] Signup successful!');
          setIsSubmitting(false);
          navigate('/login');
        } else {
          console.error('[Signup] Signup failed:', data);
          // Extract error message (data.description is an object, use data.message instead)
          let errorMessage = 'Signup failed.';
          if (data.code === 'invalid_password' || data.name === 'PasswordStrengthError') {
            errorMessage = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character (!@#$%^&*).';
          } else if (data.message) {
            errorMessage = data.message;
          } else if (data.error_description) {
            errorMessage = data.error_description;
          }
          setWarning(errorMessage);
          setIsSubmitting(false);
        }
      } catch (error) {
        console.error('[Signup] Signup error:', error);
        setWarning('Signup failed. Please try again.');
        setIsSubmitting(false);
      }
    } else {
      // Fallback to local userStore
      const added = window.userStore ? window.userStore.addUser(u, password) : false;
      if (!added) { 
        setWarning('Username already exists or store unavailable.'); 
        setIsSubmitting(false);
        return; 
      }
      setIsSubmitting(false);
      navigate('/login');
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
        <h1>Sign Up</h1>
        {isSubmitting ? (
          <div style={{color: 'white', textAlign: 'center', margin: '20px 0'}}>
            Creating your account...
          </div>
        ) : (
          <>
            <h2>Create a username</h2>
            <div className="username">
              <input 
                type="text" 
                className="usernameInput" 
                placeholder="Username" 
                value={username} 
                onChange={e=>setUsername(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <h2>Create a password</h2>
            <div className="password">
              <input 
                type="password" 
                className="passwordInput" 
                placeholder="Password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <h2>Input the password again</h2>
            <div className="password">
              <input 
                type="password" 
                className="passwordInput" 
                placeholder="Password" 
                value={passwordRe} 
                onChange={e=>setPasswordRe(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="warning" id="signupWarning">{warning}</div>
            <button 
              className="signupButton" 
              onClick={handleSignup}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing Up...' : 'Sign Up'}
            </button>
          </>
        )}
        <button 
          className="loginButton" 
          onClick={() => navigate('/login')}
          style={{marginTop: '10px'}}
          disabled={isSubmitting}
        >
          Back to Login
        </button>
      </div>
    </main>
  );
}
