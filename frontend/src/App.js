// src/App.js — Root Component with React Router v6
//
// Route structure:
//   /login     → LoginPage   (public)
//   /register  → RegisterPage (public)
//   /          → ChatPage    (protected — redirects to /login if not authed)
//
// PrivateRoute wraps any route that requires authentication.

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ChatProvider } from "./context/ChatContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";

// ── Protected Route Guard ─────────────────────────────────────
// Renders children if the user is logged in; otherwise redirects
// to /login. The "replace" prop prevents the redirect from being
// pushed onto the history stack (so Back button works correctly).
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Redirect "/" to "/login" if not authenticated */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <ChatPage />
          </PrivateRoute>
        }
      />
      {/* If already logged in, redirect away from login/register */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      {/* Catch-all — redirect unknown paths to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <ChatProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ChatProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
