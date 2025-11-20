import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { createOrUpdateUser } from '../firebase/firestoreService';

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
      // Persist image to Firestore so other clients can see it
      try {
        createOrUpdateUser({ userId: username, img: dataUrl }).catch(console.error);
      } catch (err) {
        console.error('Failed to persist user image to Firestore', err);
      }
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
    // Persist image URL to Firestore so other clients can see it
    try {
      createOrUpdateUser({ userId: username, img: url }).catch(console.error);
    } catch (err) {
      console.error('Failed to persist image URL to Firestore', err);
    }
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-medium-blue">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-medium-blue">
      <div className="text-white text-xl">Loading...</div>
    </div>
  );

  return (
    <main className="min-h-screen flex items-center justify-center bg-medium-blue p-4">
      <div className="bg-primary rounded-card p-8 w-full max-w-2xl flex flex-col shadow-card">
        {/* User Profile Section */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <img 
            src={user.img} 
            alt="avatar" 
            className="w-24 h-24 object-cover rounded-full border-4 border-accent shadow-md" 
          />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-white text-3xl md:text-4xl font-bold mb-2">
              {user.displayName || user.username}
            </h1>
            <p className="text-secondary text-base md:text-lg">
              {user.bio}
            </p>
          </div>
        </div>

        {/* Edit Controls */}
        <div className="space-y-3 max-w-xl mx-auto w-full">
          {/* Change Name */}
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input 
              type="text" 
              placeholder="New display name" 
              value={changeNameVal} 
              onChange={e=>setChangeNameVal(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 text-sm rounded-input border-2 border-transparent focus:border-accent focus:outline-none transition-colors text-primary bg-white"
            />
            <button 
              onClick={handleChangeName}
              className="w-full sm:w-32 bg-secondary text-primary font-semibold py-2 px-4 text-sm rounded-button hover:bg-opacity-80 transition-all duration-200 whitespace-nowrap"
            >
              Change Name
            </button>
          </div>

          {/* Change Bio */}
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input 
              type="text" 
              placeholder="New bio" 
              value={changeBioVal} 
              onChange={e=>setChangeBioVal(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 text-sm rounded-input border-2 border-transparent focus:border-accent focus:outline-none transition-colors text-primary bg-white"
            />
            <button 
              onClick={handleChangeBio}
              className="w-full sm:w-32 bg-secondary text-primary font-semibold py-2 px-4 text-sm rounded-button hover:bg-opacity-80 transition-all duration-200 whitespace-nowrap"
            >
              Change Bio
            </button>
          </div>

          {/* Change Image URL */}
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <input 
              type="url" 
              placeholder="Image URL" 
              value={changeImgVal} 
              onChange={e => setChangeImgVal(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 text-sm rounded-input border-2 border-transparent focus:border-accent focus:outline-none transition-colors text-primary bg-white"
            />
            <button 
              onClick={handleChangeImageUrl}
              className="w-full sm:w-32 bg-secondary text-primary font-semibold py-2 px-4 text-sm rounded-button hover:bg-opacity-80 transition-all duration-200 whitespace-nowrap"
            >
              Set Image
            </button>
          </div>

          {/* Upload Image File */}
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <label className="w-full sm:w-64 cursor-pointer">
              <div className="px-3 py-2 text-sm rounded-input border-2 border-secondary text-secondary hover:border-accent hover:text-accent transition-colors text-center">
                Choose Image File
              </div>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageFile} 
                aria-label="Upload profile image"
                className="hidden"
              />
            </label>
            <div className="w-full sm:w-32"></div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-6 border-t border-secondary border-opacity-30">
            <button 
              onClick={handleBack}
              className="flex-1 bg-secondary text-primary font-semibold py-2.5 px-6 rounded-button hover:bg-opacity-80 transition-all duration-200"
            >
              Back
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 bg-accent text-white font-semibold py-2.5 px-6 rounded-button hover:bg-opacity-80 transition-all duration-200"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
