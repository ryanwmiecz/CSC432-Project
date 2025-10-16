import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../src/profile.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [changeNameVal, setChangeNameVal] = useState('');
  const [changeBioVal, setChangeBioVal] = useState('');

  useEffect(() => {
    if (!window.userStore || !window.userStore.getCurrentUser()) {
      navigate('/login');
      return;
    }
    const u = window.userStore.getCurrentUser();
    setUser(u);
  }, []);

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
    window.userStore.changeBio(newBio);
    setUser(window.userStore.getCurrentUser());
  };

  const handleBack = () => {
    navigate('/Chat');
  };

  const handleLogout = () => {
    window.userStore.removeCurrentUser();
    navigate('/login');
  };

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
