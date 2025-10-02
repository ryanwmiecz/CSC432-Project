// Simple in-memory users dictionary for prototype usage.
// This is intentionally non-persistent and will be lost on page reload/navigation.
// It mimics a future database-backed store for development.

window.users = window.users || { "admin": { password: "admin" } };

window.userStore = {
  addUser: function (username, password) {
    if (!username) return false;
    if (window.users[username]) return false; // already exists
    window.users[username] = { password };
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
