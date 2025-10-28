# Authentication System

This project supports **two authentication modes** with the **same custom Login/Signup UI**:

## 1. Local Development Mode (Default)
Uses the built-in `userStore` system with localStorage for testing/development.

**How to use:**
- Just run the app without any `.env` file
- Default user: `admin` / `password`
- Create new users via the Sign Up page
- Data persists in browser localStorage
- **Your custom login forms are used**

## 2. Production Mode (Auth0 as Database)
Uses Auth0 as a secure database backend while **keeping your custom login forms**.

**Setup:**

1. Create a `.env` file in the project root:
```env
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id_here
```

2. Configure your Auth0 Application:
   - Go to Auth0 Dashboard → Applications → Your App
   - Go to **Settings** tab
   - Scroll to **Advanced Settings** → **Grant Types**
   - ✅ Enable **Password** grant type (REQUIRED for custom login forms)
   - Save changes

3. Configure Database Connection:
   - Go to Auth0 Dashboard → Authentication → Database
   - Ensure you have a connection (default: "Username-Password-Authentication")
   - Enable **Requires Username** if you want username-based login
   - Configure password strength rules

4. The app will automatically detect Auth0 credentials and use it as the backend

**Features:**
- **Custom login/signup forms** (your existing UI is preserved)
- Users stored securely in Auth0's database
- Password hashing and security handled by Auth0
- Can add password reset/email verification later
- Secure token-based authentication

## How It Works

**Key Difference from Standard Auth0:**
- ❌ No Auth0 hosted login page redirect
- ❌ No "Log in with Auth0" button
- ✅ Your custom login/signup forms
- ✅ Auth0 used only as backend database
- ✅ Direct API calls to Auth0 for authentication

**Login Flow:**
1. User fills your custom login form
2. App sends credentials to Auth0's `/oauth/token` endpoint
3. Auth0 validates and returns access token
4. Token stored locally, user logged in

**Signup Flow:**
1. User fills your custom signup form
2. App sends data to Auth0's `/dbconnections/signup` endpoint
3. User created in Auth0 database
4. Redirect to login

## Switching Between Modes

The app automatically detects which mode to use:
- **Auth0 credentials present** → Uses Auth0 as database
- **No Auth0 credentials** → Uses local userStore
- **UI stays the same** in both modes!

## File Structure

```
src/
├── auth/
│   ├── Login.jsx          # Custom form → Auth0 API or local
│   ├── Signup.jsx         # Custom form → Auth0 API or local
│   └── userStore.js       # Local authentication fallback
├── chatroom/
│   ├── main.jsx           # Conditionally wraps with Auth0Provider
│   ├── App.jsx            # Protected dashboard route
│   └── Profile.jsx        # User profile (works with both systems)
└── users.js               # Legacy userStore implementation
```

## For Developers

### Testing Auth0 as database:
```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Add your Auth0 credentials to .env
# 3. Enable Password grant type in Auth0 Dashboard
# 4. Restart dev server
npm run dev
```

### Testing without Auth0 (localStorage):
```bash
# Just run without a .env file or comment out the Auth0 variables
npm run dev
```

## Important Auth0 Configuration

### Required Settings:
1. **Grant Types**: Must enable "Password" grant
2. **Database Connection**: Must have a database connection configured
3. **Connection Settings**: 
   - Requires Username: ON (if using username-based login)
   - Password Policy: Configure as needed

### Security Notes:
- The Password grant type is used for trusted first-party applications
- For production, consider adding PKCE or switching to Authorization Code flow
- Tokens are stored in localStorage (consider using httpOnly cookies for production)

## Migration Notes

- **Local to Auth0**: Existing localStorage users won't carry over (manual migration needed)
- **Auth0 to Local**: Remove `.env` or comment out Auth0 variables to test locally
- **Same UI**: Users won't notice a difference - forms look identical
- **Data location**: Only difference is where credentials are stored (localStorage vs Auth0 database)
