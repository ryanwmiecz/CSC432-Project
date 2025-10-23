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
    if (auth0Available) {
      // Using Auth0
      if (!isLoading && !isAuthenticated) {
        navigate('/login');
        return;
      }
      if (auth0User) {
        setUser({
          username: auth0User.name || auth0User.email,
          bio: auth0User.email,
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
    if (auth0Available) {
      alert('Bio changes for Auth0 users are not supported.');
      return;
    }
    const newBio = changeBioVal.trim();
    if (!newBio || !user) return;
    window.userStore.changeBio(newBio);
    setUser(window.userStore.getCurrentUser());
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleLogout = () => {
    if (auth0Available && logout) {
      logout({ 
        logoutParams: { 
          returnTo: window.location.origin + '/login' 
        } 
      });
    } else {
      window.userStore.removeCurrentUser();
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
