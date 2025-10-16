import React from "react";
import "./App.css"; // we'll move your CSS here
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from '../auth/Login';
import Signup from '../auth/Signup';
import Profile from './Profile';
import Chat from './Chat';

function RequireAuth({ children }) {
  if (!window.userStore || !window.userStore.getCurrentUser()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Dashboard() {
  // Reuse the original dashboard UI (kept minimal here by delegating to Chat component)
  return <Chat />;
}

export default function App() {
  const root = () => {
    if (window.userStore && window.userStore.getCurrentUser()) return <Navigate to="/profile" replace />;
    return <Login />;
  };

  return (
    <div>
      <nav style={{ padding: 8, borderBottom: '1px solid #ddd' }}>
        <Link to="/login" style={{ marginRight: 8 }}>Login</Link>
        <Link to="/signup" style={{ marginRight: 8 }}>Sign up</Link>
        <Link to="/profile">Profile</Link>
      </nav>

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/chat" element={<RequireAuth><Chat /></RequireAuth>} />
        <Route path="/" element={root()} />
      </Routes>
    </div>
  );
}
