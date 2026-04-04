// src/components/Sidebar.jsx — Left panel: chat list + search + new chat

import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";

// Helper: for a 1-to-1 chat, return the OTHER participant
const getSender = (chat, currentUser) =>
  chat.participants.find((p) => p._id !== currentUser._id);

// Format the latest message preview
const getPreview = (chat, currentUser) => {
  if (!chat.latestMessage) return "No messages yet";
  const isMine = chat.latestMessage.sender?._id === currentUser._id;
  const prefix = isMine ? "You: " : "";
  const content = chat.latestMessage.content || "";
  return prefix + (content.length > 35 ? content.slice(0, 35) + "…" : content);
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { chats, fetchChats, activeChat, setActiveChat, notification, clearNotification } = useChat();
  const { onlineUsers } = useSocket();

  // Search conversations (top search bar — filters existing chats only)
  const [convoSearch, setConvoSearch] = useState("");

  // Find new people modal state
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Load chats on mount
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Live user search inside the "Find People" modal
  useEffect(() => {
    if (!peopleQuery.trim()) { setPeopleResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await API.get(`/users/search?query=${peopleQuery}`);
        setPeopleResults(data);
      } catch {
        setPeopleResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [peopleQuery]);

  const openChat = async (userId) => {
    try {
      const { data } = await API.post("/chats", { userId });
      setActiveChat(data);
      clearNotification(data._id);
      setPeopleQuery("");
      setPeopleResults([]);
      setShowPeopleModal(false);
      fetchChats();
    } catch (err) {
      console.error(err);
    }
  };

  const selectChat = (chat) => {
    setActiveChat(chat);
    clearNotification(chat._id);
  };

  // Filter chats by the conversation search bar
  const filteredChats = chats.filter((chat) => {
    if (!convoSearch.trim()) return true;
    const name = chat.isGroupChat
      ? chat.chatName
      : getSender(chat, user)?.username || "";
    return name.toLowerCase().includes(convoSearch.toLowerCase());
  });

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          {/* User info */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-9 h-9 rounded-full object-cover bg-gray-100"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{user.username}</p>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>

          {/* New People button (top-right) */}
          <button
            onClick={() => setShowPeopleModal(true)}
            title="Find people"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Conversation search — only filters existing chats */}
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={convoSearch}
            onChange={(e) => setConvoSearch(e.target.value)}
            placeholder="Search conversations…"
            className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {convoSearch && (
            <button
              onClick={() => setConvoSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >×</button>
          )}
        </div>
      </div>

      {/* ── Chat List ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">💬</p>
            {convoSearch
              ? <p className="text-sm">No conversations match "<strong>{convoSearch}</strong>"</p>
              : <>
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Click "New Chat" to get started</p>
                </>
            }
          </div>
        )}

        {filteredChats.map((chat) => {
          const sender = !chat.isGroupChat ? getSender(chat, user) : null;
          const isOnline = sender && onlineUsers.includes(sender._id);
          const isActive = activeChat?._id === chat._id;
          const unread = notification.filter((n) => n.chat._id === chat._id).length;

          return (
            <button
              key={chat._id}
              onClick={() => selectChat(chat)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition text-left border-b border-gray-50 ${
                isActive ? "bg-blue-50 border-l-4 border-l-blue-500" : "hover:bg-gray-50"
              }`}
            >
              <div className="relative flex-shrink-0">
                {chat.isGroupChat ? (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-lg">
                    👥
                  </div>
                ) : (
                  <>
                    <img
                      src={sender?.avatar}
                      alt={sender?.username}
                      className="w-11 h-11 rounded-full object-cover bg-gray-100"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className={`text-sm font-medium truncate ${isActive ? "text-blue-700" : "text-gray-900"}`}>
                    {chat.isGroupChat ? chat.chatName : sender?.username}
                  </p>
                  {chat.latestMessage && (
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                      {new Date(chat.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-400 truncate">{getPreview(chat, user)}</p>
                  {unread > 0 && (
                    <span className="ml-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Bottom Bar — Logout ──────────────────────────────── */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition group"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>

      {/* ── Find People Modal ────────────────────────────────── */}
      {showPeopleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Find People</h2>
              <button
                onClick={() => { setShowPeopleModal(false); setPeopleQuery(""); setPeopleResults([]); }}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition text-lg"
              >×</button>
            </div>

            {/* Search input */}
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={peopleQuery}
                  onChange={(e) => setPeopleQuery(e.target.value)}
                  placeholder="Search by username or email…"
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto">
              {searching && (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!searching && peopleQuery && peopleResults.length === 0 && (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">No users found for "{peopleQuery}"</p>
              )}
              {!peopleQuery && (
                <p className="px-5 py-6 text-sm text-gray-400 text-center">Type a name or email to find someone</p>
              )}
              {peopleResults.map((u) => (
                <button
                  key={u._id}
                  onClick={() => openChat(u._id)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition text-left"
                >
                  <div className="relative flex-shrink-0">
                    <img src={u.avatar} alt={u.username} className="w-10 h-10 rounded-full bg-gray-100" />
                    {onlineUsers.includes(u._id) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{u.username}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs text-blue-600 font-medium flex-shrink-0">Chat →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
