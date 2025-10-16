// React-friendly user store backed by localStorage.
// Also attaches a compatibility `window.userStore` so existing non-React code still works.

export function loadUsers() {
  try {
    const raw = localStorage.getItem('users');
    return raw ? JSON.parse(raw) : { admin: { username: 'admin', password: 'password', bio: 'Hello World', img: 'public/vite.svg' } };
  } catch (e) {
    console.warn('loadUsers failed', e);
    return {};
  }
}

export function saveUsers(users) {
  try { localStorage.setItem('users', JSON.stringify(users)); } catch (e) { console.warn('saveUsers failed', e); }
}

export function getCurrentUser() {
  try { return localStorage.getItem('currentUser'); } catch (e) { return null; }
}

export function setCurrentUser(username) {
  try { localStorage.setItem('currentUser', username); } catch (e) { console.warn('setCurrentUser failed', e); }
}

export function removeCurrentUser() { try { localStorage.removeItem('currentUser'); } catch (e) { } }

// Compatibility wrapper that mirrors the previous window.userStore API.
function makeCompat() {
  return {
    addUser: function (username, password) {
      if (!username) return false;
      const users = loadUsers();
      if (users[username]) return false;
      users[username] = { username, password, bio: 'Hello World', img: 'public/vite.svg' };
      saveUsers(users);
      return true;
    },
    getUser: function (username) {
      const users = loadUsers();
      return users[username] || null;
    },
    changeUser: function (oldUsername, newUsername) {
      const users = loadUsers();
      if (!users[oldUsername]) return false;
      if (users[newUsername] && oldUsername !== newUsername) return false;
      if (oldUsername !== newUsername) {
        users[newUsername] = users[oldUsername];
        users[newUsername].username = newUsername;
        delete users[oldUsername];
      } else {
        return false;
      }
      saveUsers(users);
      setCurrentUser(newUsername);
      return true;
    },
    changeBio: function (newBio) {
      const cur = getCurrentUser();
      if (!cur) return false;
      const users = loadUsers();
      users[cur].bio = newBio;
      saveUsers(users);
      return true;
    },
    listUsers: function () { return loadUsers(); },
    setCurrentUser: function (username) { setCurrentUser(username); return true; },
    getCurrentUser: function () {
      const cur = getCurrentUser();
      if (!cur) return undefined;
      const users = loadUsers();
      return users[cur];
    },
    removeCurrentUser: function () { removeCurrentUser(); return true; }
  };
}

// Attach compat to window for non-React scripts that may still run.
if (typeof window !== 'undefined') {
  window.userStore = window.userStore || makeCompat();
}

export const userStore = makeCompat();
