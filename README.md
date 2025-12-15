# CSC432-Project
- Link to site: https://csc432.netlify.app/
- By: Salvatore, Ryan, and Augustine

## Video Demo
https://youtu.be/tA_poILM8KA 

## Features
- Account creation and login
    <img width="2363" height="1115" alt="image" src="https://github.com/user-attachments/assets/d3557835-61dc-4dea-8b62-866a81d72685" />
    <img width="2363" height="1115" alt="image" src="https://github.com/user-attachments/assets/d63762da-7d5b-476e-b30d-69fa857e890b" />
- User profile settings
    <img width="2363" height="1115" alt="image" src="https://github.com/user-attachments/assets/735f48cd-681a-4e51-8e89-2ef0bb2236e3" />
- Home page to join committees
    <img width="2363" height="1115" alt="image" src="https://github.com/user-attachments/assets/48a63052-ad93-48ad-8237-440662f011b6" />
- Chat and creating a motion in a committee
    <img width="2363" height="1115" alt="image" src="https://github.com/user-attachments/assets/c49af7a4-811a-440c-8ab5-3439453bd4ac" />
- Discussing, proposing an amendment, and creating a sub-motion in a motion
    <img width="2363" height="1115" alt="image" src="https://github.com/user-attachments/assets/a644d8cc-299b-4420-920e-816096549c16" />
    <img width="2363" height="1115" alt="image" src="https://github.com/user-attachments/assets/d5018dd9-b922-475b-8027-ed281ac4e1d5" />
- Voting on a motion
    <img width="2363" height="1115" alt="image" src="https://github.com/user-attachments/assets/29780f5e-5df2-40a4-a0c4-c654980cebc2" />
- Finished motion history
    <img width="2363" height="1115" alt="image" src="https://github.com/user-attachments/assets/8424855e-8c97-4e98-b776-8d54f85084dc" />

## Data Structures

### User Objects
- **Location**: `src/auth/userStore.js`
- **Structure**: `{ username, password, bio, img }`
- **Storage**: LocalStorage-backed with compatibility wrapper for non-React code

### Message Objects
- **Location**: `src/firebase/firestoreService.js` (Firestore collection: `messages`)
- **Structure**: `{ userId, userName, text, chatroomId, createdAt, updatedAt, userPhoto, attachment }`
- **Features**: Real-time subscription, pagination, server timestamps

### Committee Objects
- **Location**: `src/firebase/firestoreService.js` (Firestore collection: `committees`)
- **Structure**: `{ name, memberIds[], memberPermissions{}, createdAt, updatedAt }`
- **Permissions**: `'Chair' | 'Member' | 'Observer'`

### Motion Objects
- **Location**: `src/firebase/firestoreService.js` (Firestore collection: `motions`)
- **Structure**: `{ title, description, committeeId, authorId, status, votes{}, replies[], createdAt, updatedAt }`
- **Status Values**: `0=Pending Second, 1=Discussion, 2=Voting, 3=Concluded` (Robert's Rules of Order)

### React State Management
- **Location**: `src/chatroom/App.jsx`
- **Hooks**: `useState`, `useEffect`, `useRef`, `useMemo` for local component state
- **Custom Hooks**: `src/firebase/hooks.js` (`useMessages`, `useCommittees`, `useMotions`, `useUsers`)

### Rate Limiting
- **Location**: `src/firebase/readLimiter.js`
- **Structure**: Map-based cooldown tracker (3-second minimum between re-subscriptions)
- **Purpose**: Prevents excessive Firebase reads during rapid UI updates

## API Documentation

### Firebase APIs
- **Firestore Database** (`firebase/firestore`)
  - Location: `src/firebase/config.js`, `src/firebase/firestoreService.js`
  - Operations: Real-time subscriptions, CRUD operations, queries with pagination
  - Collections: `messages`, `committees`, `motions`, `users`
  - Features: Offline persistence, cache-first reads, server timestamps

- **Firebase Authentication** (`firebase/auth`)
  - Location: `src/firebase/config.js`
  - Purpose: User authentication initialization

### Auth0 Authentication
- **Package**: `@auth0/auth0-react`
- **Location**: `src/chatroom/App.jsx`
- **Methods**: `useAuth0()` hook for user authentication state
- **Storage**: Auth0 tokens stored in LocalStorage (`auth0_token`, `auth0_user`)

### React Router
- **Package**: `react-router-dom`
- **Location**: `src/chatroom/App.jsx`
- **Hook**: `useNavigate()` for programmatic navigation

### React Core APIs
- **Package**: `react`, `react-dom`
- **Location**: Throughout `src/` components
- **Hooks Used**: `useState`, `useEffect`, `useRef`, `useMemo`
- **Entry Point**: `src/chatroom/main.jsx`

### Vite Build Tool
- **Configuration**: `src/vite.config.js`
- **Environment Variables**: Firebase config via `import.meta.env.VITE_*`


    

