
// Login script: authenticate against the in-memory userStore (window.userStore).

const loginButton = document.getElementById('loginButton');
const signupButton = document.getElementById('signupButton');
const warning = document.getElementById('warning');

if (!window.userStore) {
    console.warn('userStore not found. Make sure src/users.js is loaded.');
}

loginButton.addEventListener('click', function () {
    warning.textContent = '';
    const username = document.getElementById('usernameInfo').value && document.getElementById('usernameInfo').value.trim();
    const password = document.getElementById('passwordInfo').value;

    if (!username || !password) {
        warning.textContent = 'Enter both username and password.';
        return;
    }

    const user = window.userStore ? window.userStore.getUser(username) : null;
    if (user && user.password === password) {
        // Authentication successful. Store in-memory.
        window.currentUser = username;
        window.location.href = 'profile.html';
        return;
    }

    warning.textContent = 'Incorrect username or password';
});

signupButton.addEventListener('click', function () {
    window.location.href = 'signup.html';
});




