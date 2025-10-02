// Signup script: use the in-memory userStore (window.userStore) for user management.

const signupButton = document.getElementById('signupButton');
const usernameInput = document.getElementById('usernameInfo');
const passwordInput = document.getElementById('passwordInfo');
const passwordInputRe = document.getElementById('passwordInfoRe');
const warningEl = document.getElementById('signupWarning');

if (!window.userStore) {
    console.warn('userStore not found. Make sure src/users.js is loaded.');
}

signupButton.addEventListener('click', function () {
    const username = usernameInput.value && usernameInput.value.trim();
    const password = passwordInput.value;
    const passwordRe = passwordInputRe.value;

    warningEl.textContent = '';

    if (!username) {
        warningEl.textContent = 'Please enter a username.';
        return;
    }
    if (!password) {
        warningEl.textContent = 'Please enter a password.';
        return;
    }
    if (password !== passwordRe) {
        warningEl.textContent = 'Passwords do not match.';
        return;
    }

    // Use the in-memory API
    const added = window.userStore ? window.userStore.addUser(username, password) : false;
    if (!added) {
        warningEl.textContent = 'Username already exists or store unavailable.';
        return;
    }

    // Redirect to login after successful signup.
    window.location.href = 'login.html';
});