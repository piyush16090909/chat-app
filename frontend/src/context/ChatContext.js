// src/context/ChatContext.js — Active Chat & Conversations State
//
// Provides:
//   chats        — array of all chats the user is in
//   activeChat   — the currently open chat object
//   setActiveChat
//   fetchChats   — reload the chat list from the API
//   notification — array of messages received while not in their chat

import React, { createContext, useContext, useState, useCallback } from "react";
import API from "../api/axios";

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [notification, setNotification] = useState([]);

  const fetchChats = useCallback(async () => {
    try {
      const { data } = await API.get("/chats");
      setChats(data);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    }
  }, []);

  const addNotification = (message) => {
    setNotification((prev) => [message, ...prev]);
  };

  const clearNotification = (chatId) => {
    setNotification((prev) => prev.filter((n) => n.chat._id !== chatId));
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        setChats,
        activeChat,
        setActiveChat,
        fetchChats,
        notification,
        addNotification,
        clearNotification,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
