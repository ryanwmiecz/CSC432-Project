import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Auth0Provider } from '@auth0/auth0-react';
// Import Tailwind CSS
import "../index.css";
// Make sure the global userStore (window.userStore) is initialized before App mounts
import "../users.js";
import "../auth/userStore.js";
import App from "./App";
import Login from "../auth/Login";
import Signup from "../auth/Signup";
import Profile from "./Profile";
import "./App.css";

// Check if Auth0 credentials are available
const hasAuth0Credentials = import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID;

const AppContent = (
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  hasAuth0Credentials ? (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
    >
      {AppContent}
    </Auth0Provider>
  ) : (
    AppContent
  )
);
