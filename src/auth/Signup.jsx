import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

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
    
    // Username validation
    if (!u) { 
      setWarning('Please enter a username.'); 
      setIsSubmitting(false);
      return; 
    }
    if (u.length < 3) {
      setWarning('Username must be at least 3 characters long.');
      setIsSubmitting(false);
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(u)) {
      setWarning('Username can only contain letters, numbers, hyphens, and underscores.');
      setIsSubmitting(false);
      return;
    }
    
    // Password validation
    if (!password) { 
      setWarning('Please enter a password.'); 
      setIsSubmitting(false);
      return; 
    }
    if (password.length < 8) {
      setWarning('Password must be at least 8 characters long.');
      setIsSubmitting(false);
      return;
    }
    if (!/(?=.*[a-z])/.test(password)) {
      setWarning('Password must contain at least one lowercase letter.');
      setIsSubmitting(false);
      return;
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      setWarning('Password must contain at least one uppercase letter.');
      setIsSubmitting(false);
      return;
    }
    if (!/(?=.*\d)/.test(password)) {
      setWarning('Password must contain at least one number.');
      setIsSubmitting(false);
      return;
    }
    if (!/(?=.*[!@#$%^&*])/.test(password)) {
      setWarning('Password must contain at least one special character (!@#$%^&*).');
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
          // Extract error message and provide user-friendly feedback
          let errorMessage = 'Signup failed. Please try again.';
          
          // Check for password strength errors
          if (data.code === 'invalid_password' || data.name === 'PasswordStrengthError') {
            errorMessage = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character (!@#$%^&*).';
          } 
          // Check for duplicate user errors - Auth0 returns 'invalid_signup' for user exists
          else if (data.code === 'invalid_signup') {
            errorMessage = `Account with username "${u}" already exists. Please choose a different username.`;
          }
          // Check for user_exists or username_exists errors
          else if (data.code === 'user_exists' || data.code === 'username_exists') {
            errorMessage = `Account with username "${u}" already exists. Please choose a different username.`;
          }
          // Check error messages for "already exists" or "user exists" phrases
          else if (data.description && typeof data.description === 'string' && 
                   (data.description.toLowerCase().includes('already exists') || 
                    data.description.toLowerCase().includes('user exists'))) {
            errorMessage = `Account with username "${u}" already exists. Please choose a different username.`;
          }
          else if (data.message && typeof data.message === 'string' && 
                   (data.message.toLowerCase().includes('already exists') || 
                    data.message.toLowerCase().includes('user exists'))) {
            errorMessage = `Account with username "${u}" already exists. Please choose a different username.`;
          }
          else if (data.error_description && typeof data.error_description === 'string' && 
                   (data.error_description.toLowerCase().includes('already exists') || 
                    data.error_description.toLowerCase().includes('user exists'))) {
            errorMessage = `Account with username "${u}" already exists. Please choose a different username.`;
          }
          // Fallback to provided error messages
          else if (data.description && typeof data.description === 'string') {
            errorMessage = data.description;
          } else if (data.message) {
            errorMessage = data.message;
          } else if (data.error_description) {
            errorMessage = data.error_description;
          } else if (data.error) {
            errorMessage = data.error;
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
      if (!window.userStore) {
        setWarning('User management system is unavailable. Please try again later.');
        setIsSubmitting(false);
        return;
      }
      
      // Check if username already exists
      const existingUser = window.userStore.getUser(u);
      if (existingUser) {
        setWarning(`Account with username "${u}" already exists. Please choose a different username.`);
        setIsSubmitting(false);
        return;
      }
      
      const added = window.userStore.addUser(u, password);
      if (!added) { 
        setWarning(`Account with username "${u}" already exists. Please choose a different username.`); 
        setIsSubmitting(false);
        return; 
      }
      setIsSubmitting(false);
      navigate('/login');
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
    <main className="min-h-screen flex items-center justify-center bg-medium-blue p-4 border-[30px] border-accent overflow-auto">
      <div className="bg-primary rounded-card p-8 w-full max-w-md flex flex-col items-center gap-compact shadow-card my-4">
        <h1 className="text-accent text-3xl font-bold mb-2">Sign Up</h1>
        {isSubmitting ? (
          <div className="text-white text-center my-5">
            Creating your account...
          </div>
        ) : (
          <>
            <h2 className="text-white text-base font-medium mb-1 self-start w-full">Create a username</h2>
            <div className="w-full mb-compact">
              <input 
                type="text" 
                className="w-full px-4 py-2.5 rounded-input border-2 border-transparent focus:border-accent focus:outline-none transition-colors text-primary bg-white" 
                placeholder="Username" 
                value={username} 
                onChange={e=>setUsername(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <h2 className="text-white text-base font-medium mb-1 self-start w-full mt-2">Create a password</h2>
            <div className="w-full mb-compact">
              <input 
                type="password" 
                className="w-full px-4 py-2.5 rounded-input border-2 border-transparent focus:border-accent focus:outline-none transition-colors text-primary bg-white" 
                placeholder="Password" 
                value={password} 
                onChange={e=>setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            <h2 className="text-white text-base font-medium mb-1 self-start w-full mt-2">Confirm password</h2>
            <div className="w-full mb-compact">
              <input 
                type="password" 
                className="w-full px-4 py-2.5 rounded-input border-2 border-transparent focus:border-accent focus:outline-none transition-colors text-primary bg-white" 
                placeholder="Confirm Password" 
                value={passwordRe} 
                onChange={e=>setPasswordRe(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            
            {warning && (
              <div className="text-red-500 text-sm mb-compact text-center w-full">{warning}</div>
            )}
            
            <button 
              className="w-3/4 bg-secondary text-primary font-semibold py-2.5 px-6 rounded-button hover:bg-opacity-80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2" 
              onClick={handleSignup}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing Up...' : 'Sign Up'}
            </button>
          </>
        )}
        <button 
          className="w-3/4 bg-secondary text-primary font-semibold py-2.5 px-6 rounded-button hover:bg-opacity-80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2" 
          onClick={() => navigate('/login')}
          disabled={isSubmitting}
        >
          Back to Login
        </button>
      </div>
    </main>
  );
}
