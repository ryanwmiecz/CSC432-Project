import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import '../../src/profile.css';
// Env vars (set VITE_AUTH0_DOMAIN and optionally VITE_AUTH0_MGMT_AUDIENCE)
const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
const AUTH0_MGMT_AUDIENCE = import.meta.env.VITE_AUTH0_MGMT_AUDIENCE; // e.g. https://YOUR_DOMAIN/api/v2/

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [changeNameVal, setChangeNameVal] = useState('');
  const [changeBioVal, setChangeBioVal] = useState('');

  // Try to use Auth0 if available
  let auth0Available = false;
  let isAuthenticated = false;
  let isLoading = false;
  let auth0User = null;
  let logout = null;
  let getAccessTokenSilently = null;
  let getAccessTokenWithPopup = null;
  let loginWithRedirect = null;
  
  try {
    const auth0 = useAuth0();
    auth0Available = true;
    isAuthenticated = auth0.isAuthenticated;
    isLoading = auth0.isLoading;
    auth0User = auth0.user;
    logout = auth0.logout;
    // helpers from SDK
    getAccessTokenSilently = auth0.getAccessTokenSilently;
    getAccessTokenWithPopup = auth0.getAccessTokenWithPopup;
    loginWithRedirect = auth0.loginWithRedirect;
  } catch (e) {
    // Auth0 not configured, use fallback
    auth0Available = false;
  }

  useEffect(() => {
    console.log('[Profile] Checking auth...', {
      auth0Available,
      isAuthenticated,
      isLoading,
      hasToken: !!localStorage.getItem('auth0_token'),
      hasUser: !!localStorage.getItem('auth0_user')
    });
    
    if (auth0Available) {
      // Check if user logged in via our custom form (has token in localStorage)
      const auth0Token = localStorage.getItem('auth0_token');
      const auth0Username = localStorage.getItem('auth0_user');
      
      if (auth0Token && auth0Username) {
        // User logged in via custom form
        console.log('[Profile] Using token-based auth');
        setUser({
          username: auth0Username,
          bio: `${auth0Username}@local.app`,
          img: 'public/vite.svg'
        });
      } else if (!isLoading && !isAuthenticated) {
        // No token and not authenticated via SDK
        console.log('[Profile] No auth, redirecting to login');
        navigate('/login');
        return;
      } else if (auth0User) {
          // Authenticated via Auth0 SDK
          console.log('[Profile] Using SDK auth');
          // If management audience configured, try to fetch user_metadata to get displayName/bio
          if (AUTH0_DOMAIN && AUTH0_MGMT_AUDIENCE && getAccessTokenSilently) {
            (async () => {
              const fresh = await fetchAuth0UserMetadata();
              if (fresh) setUser(fresh);
              else setUser({
                username: auth0User.name || auth0User.email,
                bio: auth0User.email,
                img: auth0User.picture || 'public/vite.svg'
              });
            })();
          } else {
            setUser({
              username: auth0User.name || auth0User.email,
              bio: auth0User.email,
              img: auth0User.picture || 'public/vite.svg'
            });
          }
      }
    } else {
      // Using local userStore
      if (!window.userStore || !window.userStore.getCurrentUser()) {
        navigate('/login');
        return;
      }
      const u = window.userStore.getCurrentUser();
      setUser(u);
    }
  }, [navigate, auth0Available, isAuthenticated, isLoading, auth0User]);

  useEffect(() => {
    if (user) {
      // keep local inputs empty
      setChangeNameVal('');
      setChangeBioVal('');
    }
  }, [user]);

  const handleChangeName = () => {
    const newDisplay = changeNameVal.trim();
    if (!newDisplay || !user) return;
    if (!auth0Available) {
      // local userStore
      const oldUsername = user.username;
      const success = window.userStore.changeUser(oldUsername, newDisplay);
      if (success) setUser(window.userStore.getCurrentUser());
      else console.error('Failed to change username. Maybe the new name already exists.');
      return;
    }

    // Auth0: update only displayName inside user_metadata
    updateAuth0Metadata({ displayName: newDisplay }).then(success => {
      if (success) fetchAuth0UserMetadata().then(fresh => {
        if (fresh) setUser(fresh);
      });
    }).catch(err => console.error('Failed to update display name', err));
  };

  const handleChangeBio = () => {
    const newBio = changeBioVal.trim();
    if (!newBio || !user) return;
    if (!auth0Available) {
      window.userStore.changeBio(newBio);
      setUser(window.userStore.getCurrentUser());
      return;
    }

    // Auth0: update bio in user_metadata
    updateAuth0Metadata({ bio: newBio }).then(success => {
      if (success) fetchAuth0UserMetadata().then(fresh => {
        if (fresh) setUser(fresh);
      });
    }).catch(err => console.error('Failed to update bio', err));
  };

  // ===== Auth0 helper functions =====
  // These functions rely on an audience being configured that allows the SPA
  // to request a token which can call the Management API. Configure
  // VITE_AUTH0_MGMT_AUDIENCE in your environment to the API audience (for
  // example: https://dev-xxx.us.auth0.com/api/v2/). If not set, updates will
  // be blocked and an instructional error will be shown.
     // getAccessTokenSilently is assigned above if auth0 available

  const updateAuth0Metadata = async (metadataUpdates) => {
    // Only attempt server-side update via Netlify Function (no popup/redirect)
    // This avoids the SPA requesting Management API tokens (and popping up for consent).
    try {
      // Get the user's access token (no audience) to present to the server for verification
      let userToken = null;
      if (getAccessTokenSilently) {
        try {
          userToken = await getAccessTokenSilently();
        } catch (e) {
          console.warn('Unable to get user access token for server verification', e);
        }
      }

      const headers = { 'Content-Type': 'application/json' };
      if (userToken) headers['Authorization'] = `Bearer ${userToken}`;

      const fnRes = await fetch('/.netlify/functions/update-user-metadata', {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_metadata: metadataUpdates })
      });
      if (fnRes.ok) {
        return true;
      }
      const text = await fnRes.text();
      console.error('Netlify function returned error', fnRes.status, text);
      alert('Profile update failed server-side. Ensure the Netlify function is deployed and server env vars are set. See console for details.');
      return false;
    } catch (e) {
      console.error('Netlify function not reachable', e);
      alert('Profile update failed: server function not reachable. For local testing run `netlify dev` or deploy the function to Netlify.');
      return false;
    }
  };

  const fetchAuth0UserMetadata = async () => {
    if (!AUTH0_DOMAIN || !AUTH0_MGMT_AUDIENCE) return null;
    // if we have no way to get a token, skip
    if (!getAccessTokenSilently && !getAccessTokenWithPopup && !loginWithRedirect) return null;
    try {
      let token;
      try {
        token = await getAccessTokenSilently({ audience: AUTH0_MGMT_AUDIENCE, scope: 'read:users' });
      } catch (err) {
        console.warn('getAccessTokenSilently failed for fetch, trying popup/redirect', err);
        if (getAccessTokenWithPopup) {
          try {
            token = await getAccessTokenWithPopup({ audience: AUTH0_MGMT_AUDIENCE, scope: 'read:users' });
          } catch (popupErr) {
            console.warn('getAccessTokenWithPopup failed', popupErr);
          }
        }
        if (!token) {
          if (loginWithRedirect) {
            await loginWithRedirect({ authorizationParams: { audience: AUTH0_MGMT_AUDIENCE, scope: 'read:users' } });
            return null;
          }
          throw err;
        }
      }
      const userId = auth0User && auth0User.sub;
      if (!userId) return null;
      const url = `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        console.error('Failed to fetch user from Auth0', res.status);
        return null;
      }
      const body = await res.json();
      // Construct display user using user_metadata when available
      const displayName = (body.user_metadata && body.user_metadata.displayName) || body.name || body.email;
      const displayBio = (body.user_metadata && body.user_metadata.bio) || body.email || '';
      const img = body.picture || 'public/vite.svg';
      return { username: displayName, bio: displayBio, img };
    } catch (e) {
      console.error('fetchAuth0UserMetadata error', e);
      return null;
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleLogout = () => {
    // Clear Auth0 tokens from localStorage
    localStorage.removeItem('auth0_token');
    localStorage.removeItem('auth0_user');
    
    if (auth0Available && logout && isAuthenticated) {
      // If using Auth0 SDK authentication
      logout({ 
        logoutParams: { 
          returnTo: window.location.origin + '/login' 
        } 
      });
    } else if (window.userStore) {
      // If using local userStore
      window.userStore.removeCurrentUser();
      navigate('/login');
    } else {
      // Just navigate to login
      navigate('/login');
    }
  };

  if (auth0Available && isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) return <div>Loading...</div>;

  return (
    <main id="main">
      <div className="container">
        <div className="user">
          <img id="userPic" src={user.img} alt="avatar" />
          <div id="userName">{user.username}</div>
        </div>
        <div className="bio">
          <div id="bioText">{user.bio}</div>
        </div>
        <div className="buttonContainer">
          <input type="text" id="changeName" placeholder="Type new name" value={changeNameVal} onChange={e=>setChangeNameVal(e.target.value)} />
          <button id="changeNameButton" onClick={handleChangeName}>Change Name</button>
          <input type="text" id="changeBio" placeholder="Type new bio" value={changeBioVal} onChange={e=>setChangeBioVal(e.target.value)} />
          <button id="changeBioButton" onClick={handleChangeBio}>Change Bio</button>
          <button className="backButton" onClick={handleBack}>Back</button>
          <button className="logoutButton" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
    </main>
  );
}
