// Simple in-memory users dictionary for prototype usage.
// This is intentionally non-persistent and will be lost on page reload/navigation.
// It mimics a future database-backed store for development.

// Load users from sessionStorage when available so signups persist across navigation in the same tab.
// This keeps data only for the session (cleared when the tab/window is closed).
let _loadedUsers = null;
try {
  const raw = sessionStorage.getItem('users');
  if (raw) {
    _loadedUsers = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Could not read users from sessionStorage', e);
}

window.users = window.users || _loadedUsers || {};

window.users["admin"] = {
      "username": "admin",
      "password": "password",
      "bio": "Hello World",
      "img": "public/vite.svg"
    }
// Optionally expose a currentUser holder for the prototype
window.currentUser = undefined;

try {
    const storedCurrentUser = sessionStorage.getItem('currentUser');
    if (storedCurrentUser) {
        window.currentUser = window.users[storedCurrentUser];
    } else {
        // User was in sessionStorage but not in the users dictionary (e.g., dictionary was reset)
        sessionStorage.removeItem('currentUser');
    }
} catch (e) {
    console.warn('Could not restore user session from sessionStorage', e);
}

window.userStore = {
  addUser: function (username, password) {
    if (!username) return false;
    if (window.users[username]) return false; // already exists
    window.users[username] = {
      "username": username,
      "password": password,
      "bio": "Hello World",
      "img": "public/vite.svg"
    };
    // Persist to sessionStorage so new users survive navigation in this tab.
    try {
      sessionStorage.setItem('users', JSON.stringify(window.users));
    } catch (e) {
      console.warn('Failed to save users to sessionStorage', e);
    }
    return true;
  },
  getUser: function (username) {
    return window.users[username] || null;
  },
  changeUser: function (oldUsername, newUsername) {
    if (!window.users[oldUsername]) return false;

    if (window.users[newUsername] && oldUsername !== newUsername) {
      return false;
    }

    if (oldUsername !== newUsername) {
      window.users[newUsername] = window.users[oldUsername];

      window.users[newUsername].username = newUsername;

      delete window.users[oldUsername];
    } else {
      return false;
    }

    this.setCurrentUser(newUsername);

    try {
      sessionStorage.setItem('users', JSON.stringify(window.users));
    } catch (e) {
      console.warn('Failed to save updated users to sessionStorage', e);
    }

    return true;
  },

  changeBio: function(newBio) {
    const user = this.getCurrentUser();
    if (!user) {
      return false;
    }

    window.currentUser.bio = newBio;
    
    window.users[user.username].bio = newBio; 
    
    try {
      sessionStorage.setItem('users', JSON.stringify(window.users));
    } catch (e) {
      console.warn('Failed to save updated users to sessionStorage', e);
    }

    return true;
  },

  listUsers: function () {
    return window.users;
  },
  setCurrentUser: function (username) {
    window.currentUser = this.getUser(username);
    try {
          sessionStorage.setItem('currentUser', username);
      } catch (e) {
          console.warn('Failed to save current user to sessionStorage', e);
      }
      return true;
  },
  getCurrentUser: function () {
    return window.currentUser;
  },
  removeCurrentUser: function () {
    window.currentUser = undefined;
    sessionStorage.removeItem('currentUser');
    return true;
  }
};