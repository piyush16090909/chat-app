// src/api/axios.js — Pre-configured Axios Instance
//
// All API calls in the app import this instance instead of raw axios.
// Benefits:
//   1. baseURL is set once — no repeating "http://localhost:5000"
//   2. Request interceptor automatically attaches the JWT Bearer token
//      from localStorage to every outgoing request header.

import axios from "axios";

const API = axios.create({
  // "proxy" in package.json forwards this to http://localhost:5000
  // during development, so the baseURL just needs the /api prefix.
  baseURL: "/api",
});

// ── Request Interceptor ───────────────────────────────────────
// Runs before EVERY request. Reads the token stored at login/register
// and injects it as the Authorization header.
API.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem("userInfo");
  if (userInfo) {
    const { token } = JSON.parse(userInfo);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default API;
