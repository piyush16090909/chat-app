// src/context/AuthContext.js — Global Authentication State
//
// Provides { user, login, logout, loading } to every component
// in the tree via the useAuth() hook.
//
// On app load it reads localStorage so the user stays logged in
// after a page refresh — no round-trip to the server needed
// because the JWT itself is the source of truth.

import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialise from localStorage so refresh doesn't log the user out
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("userInfo");
    return stored ? JSON.parse(stored) : null;
  });

  const [loading, setLoading] = useState(false);

  // ── login ─────────────────────────────────────────────────
  // Calls POST /api/auth/login, stores the response in state
  // and localStorage, returns the user object to the caller.
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await API.post("/auth/login", { email, password });
      setUser(data);
      localStorage.setItem("userInfo", JSON.stringify(data));
      return data;
    } finally {
      setLoading(false);
    }
  };

  // ── register ──────────────────────────────────────────────
  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const { data } = await API.post("/auth/register", { username, email, password });
      setUser(data);
      localStorage.setItem("userInfo", JSON.stringify(data));
      return data;
    } finally {
      setLoading(false);
    }
  };

  // ── logout ────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    localStorage.removeItem("userInfo");
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook — components just call: const { user } = useAuth();
export const useAuth = () => useContext(AuthContext);
