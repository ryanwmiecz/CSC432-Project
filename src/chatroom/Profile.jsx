import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import '../../src/profile.css';

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
  
  try {
    const auth0 = useAuth0();
    auth0Available = true;
    isAuthenticated = auth0.isAuthenticated;
    isLoading = auth0.isLoading;
    auth0User = auth0.user;
    logout = auth0.logout;
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
    
    // helper: read/write bio overrides in localStorage so Auth0 SDK users can have an editable bio
    const BIO_OVERRIDES_KEY = 'profile_bio_overrides';
    const readBioOverrides = () => {
      try {
        const raw = localStorage.getItem(BIO_OVERRIDES_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (e) {
        return {};
      }
    };
    const writeBioOverrides = (map) => {
      try {
        localStorage.setItem(BIO_OVERRIDES_KEY, JSON.stringify(map));
      } catch (e) {
        console.error('Failed to write bio overrides', e);
      }
    };
    const getBioFor = (username, fallback) => {
      if (!username) return fallback;
      const map = readBioOverrides();
      return map[username] || fallback;
    };
    const setBioFor = (username, bio) => {
      if (!username) return;
      const map = readBioOverrides();
      map[username] = bio;
      writeBioOverrides(map);
    };

    if (auth0Available) {
      // Check if user logged in via our custom form (has token in localStorage)
      const auth0Token = localStorage.getItem('auth0_token');
      const auth0Username = localStorage.getItem('auth0_user');
      
      if (auth0Token && auth0Username) {
        // User logged in via custom form
        console.log('[Profile] Using token-based auth');
        setUser({
          username: auth0Username,
          bio: getBioFor(auth0Username, `${auth0Username}@local.app`),
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
        setUser({
          username: auth0User.name || auth0User.email,
          bio: getBioFor(auth0User.name || auth0User.email, auth0User.email),
          img: auth0User.picture || 'public/vite.svg'
        });
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
    if (auth0Available) {
      alert('Name changes for Auth0 users must be done through your Auth0 profile.');
      return;
    }
    const newName = changeNameVal.trim();
    if (!newName || !user) return;
    const oldUsername = user.username;
    const success = window.userStore.changeUser(oldUsername, newName);
    if (success) {
      const refreshed = window.userStore.getCurrentUser();
      setUser(refreshed);
    } else {
      console.error('Failed to change username. Maybe the new name already exists.');
    }
  };

  const handleChangeBio = () => {
    const newBio = changeBioVal.trim();
    if (!newBio || !user) return;
    // If Auth0 SDK or token-based auth is in use, persist a local override so the user can edit their bio
    if (auth0Available) {
      const username = user.username;
      try {
        const BIO_OVERRIDES_KEY = 'profile_bio_overrides';
        const raw = localStorage.getItem(BIO_OVERRIDES_KEY);
        const map = raw ? JSON.parse(raw) : {};
        map[username] = newBio;
        localStorage.setItem(BIO_OVERRIDES_KEY, JSON.stringify(map));
      } catch (e) {
        console.error('Failed to save bio override', e);
      }
      setUser({ ...user, bio: newBio });
      setChangeBioVal('');
      return;
    }

    // legacy/local userStore path
    window.userStore.changeBio(newBio);
    setUser(window.userStore.getCurrentUser());
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
