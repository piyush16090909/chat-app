// src/context/SocketContext.js — Global Socket.io Client
//
// Creates one socket connection per logged-in session and makes
// the `socket` instance available everywhere via useSocket().
//
// Lifecycle:
//   - When user logs in  → connect + emit "setup"
//   - When user logs out → disconnect
//
// The socket itself is stable (same reference) for the session,
// so components can safely add listeners in useEffect with socket
// as a dependency without causing infinite re-renders.

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) {
      // User logged out — clean up
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setOnlineUsers([]);
      return;
    }

    // Create socket connection to the backend
    const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5000", {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    // Tell the server who we are — joins our personal room
    socket.emit("setup", user);

    socket.on("connected", () => {
      console.log("✅ Socket setup complete");
    });

    // Track online/offline status of other users
    socket.on("user_online", (userId) => {
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });

    socket.on("user_offline", (userId) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
