import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import '../../src/profile.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [changeNameVal, setChangeNameVal] = useState('');
  const [changeBioVal, setChangeBioVal] = useState('');
  const [changeImgVal, setChangeImgVal] = useState('');

  // Local override helpers (display name and bio) so changes don't affect login identifiers.
  const DISPLAY_OVERRIDES_KEY = 'profile_display_overrides';
  const BIO_OVERRIDES_KEY = 'profile_bio_overrides';
  const IMAGE_OVERRIDES_KEY = 'profile_img_overrides';
  const readOverrides = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  };
  const writeOverrides = (key, map) => {
    try {
      localStorage.setItem(key, JSON.stringify(map));
    } catch (e) {
      console.error('Failed to write overrides', e);
    }
  };
  const getOverride = (key, id, fallback) => {
    if (!id) return fallback;
    const map = readOverrides(key);
    return map[id] || fallback;
  };
  const setOverride = (key, id, value) => {
    if (!id) return;
    const map = readOverrides(key);
    map[id] = value;
    writeOverrides(key, map);
  };

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
    
    
    if (auth0Available) {
      // Check if user logged in via our custom form (has token in localStorage)
      const auth0Token = localStorage.getItem('auth0_token');
      const auth0Username = localStorage.getItem('auth0_user');
      
      if (auth0Token && auth0Username) {
        // User logged in via custom form
        console.log('[Profile] Using token-based auth');
        setUser({
          username: auth0Username,
          displayName: getOverride(DISPLAY_OVERRIDES_KEY, auth0Username, auth0Username),
          bio: getOverride(BIO_OVERRIDES_KEY, auth0Username, `${auth0Username}@local.app`),
          img: getOverride(IMAGE_OVERRIDES_KEY, auth0Username, 'public/vite.svg')
        });
      } else if (!isLoading && !isAuthenticated) {
        // No token and not authenticated via SDK
        console.log('[Profile] No auth, redirecting to login');
        navigate('/login');
        return;
      } else if (auth0User) {
        // Authenticated via Auth0 SDK
        console.log('[Profile] Using SDK auth');
        const username = auth0User.name || auth0User.email;
        setUser({
          username,
          displayName: getOverride(DISPLAY_OVERRIDES_KEY, username, username),
          bio: getOverride(BIO_OVERRIDES_KEY, username, auth0User.email),
          img: getOverride(IMAGE_OVERRIDES_KEY, username, auth0User.picture || 'public/vite.svg')
        });
      }
    } else {
      // Using local userStore
      if (!window.userStore || !window.userStore.getCurrentUser()) {
        navigate('/login');
        return;
      }
      const u = window.userStore.getCurrentUser();
      // Respect any local display-name or bio overrides as well
      const displayName = getOverride(DISPLAY_OVERRIDES_KEY, u.username, u.username);
      const bio = getOverride(BIO_OVERRIDES_KEY, u.username, u.bio || '');
      const img = getOverride(IMAGE_OVERRIDES_KEY, u.username, u.img || 'public/vite.svg');
      setUser({ ...u, displayName, bio, img });
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
    const newName = changeNameVal.trim();
    if (!newName || !user) return;
    // Only change the displayed name (not the login username). Persist as a local override so it
    // behaves the same way as the bio change.
    const username = user.username;
    setOverride(DISPLAY_OVERRIDES_KEY, username, newName);
    setUser({ ...user, displayName: newName });
    setChangeNameVal('');
  };

  const handleImageFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const username = user.username;
      setOverride(IMAGE_OVERRIDES_KEY, username, dataUrl);
      setUser({ ...user, img: dataUrl });
    };
    reader.onerror = () => {
      console.error('Failed to read image file');
      alert('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleChangeImageUrl = () => {
    const url = changeImgVal.trim();
    if (!url || !user) return;
    const username = user.username;
    setOverride(IMAGE_OVERRIDES_KEY, username, url);
    setUser({ ...user, img: url });
    setChangeImgVal('');
  };

  const handleChangeBio = () => {
    const newBio = changeBioVal.trim();
    if (!newBio || !user) return;
    const username = user.username;
    // Persist a local override so the bio change behaves the same across auth types.
    setOverride(BIO_OVERRIDES_KEY, username, newBio);
    // If using local userStore, also update its stored bio for compatibility.
    if (!auth0Available && window.userStore) {
      window.userStore.changeBio(newBio);
      setUser(window.userStore.getCurrentUser());
    } else {
      setUser({ ...user, bio: newBio });
    }
    setChangeBioVal('');
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
          <img id="userPic" src={user.img} alt="avatar" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%' }} />
          <div id="userName">{user.displayName || user.username}</div>
        </div>
        <div className="bio">
          <div id="bioText">{user.bio}</div>
        </div>
        <div className="buttonContainer">
          <input type="text" id="changeName" placeholder="Type new name" value={changeNameVal} onChange={e=>setChangeNameVal(e.target.value)} />
          <button id="changeNameButton" onClick={handleChangeName}>Change Name</button>
          <input type="text" id="changeBio" placeholder="Type new bio" value={changeBioVal} onChange={e=>setChangeBioVal(e.target.value)} />
          <button id="changeBioButton" onClick={handleChangeBio}>Change Bio</button>
          <div style={{ marginTop: 8 }}>
            <input type="url" id="changeImgUrl" placeholder="Image URL" value={changeImgVal} onChange={e => setChangeImgVal(e.target.value)} />
            <button id="changeImgUrlButton" onClick={handleChangeImageUrl}>Set Image URL</button>
          </div>
          <div style={{ marginTop: 8 }}>
            <input type="file" accept="image/*" onChange={handleImageFile} aria-label="Upload profile image" />
          </div>
          <button className="backButton" onClick={handleBack}>Back</button>
          <button className="logoutButton" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
    </main>
  );
}
