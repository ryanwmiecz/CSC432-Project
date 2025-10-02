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

window.users = window.users || _loadedUsers || { "admin": { password: "admin" } };

window.userStore = {
  addUser: function (username, password) {
    if (!username) return false;
    if (window.users[username]) return false; // already exists
    window.users[username] = { password };
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
  listUsers: function () {
    return window.users;
  }
};

// Optionally expose a currentUser holder for the prototype
window.currentUser = window.currentUser || null;
