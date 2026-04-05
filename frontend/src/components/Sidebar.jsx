import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";

const getSender = (chat, currentUser) =>
  chat.participants.find((p) => p._id !== currentUser._id);

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

  const [convoSearch, setConvoSearch] = useState("");
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  useEffect(() => {
    if (!peopleQuery.trim()) { setPeopleResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await API.get(`/users/search?query=${peopleQuery}`);
        setPeopleResults(data);
      } catch { setPeopleResults([]); }
      finally { setSearching(false); }
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
    } catch (err) { console.error(err); }
  };

  const selectChat = (chat) => {
    setActiveChat(chat);
    clearNotification(chat._id);
  };

  const filteredChats = chats.filter((chat) => {
    if (!convoSearch.trim()) return true;
    const name = chat.isGroupChat ? chat.chatName : getSender(chat, user)?.username || "";
    return name.toLowerCase().includes(convoSearch.toLowerCase());
  });

  const avatarInitial = (name) => name?.[0]?.toUpperCase() || "?";

  return (
    <div className="sidebar w-80 flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="p-4 border-b border-white/5">
        {/* User info row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {user.avatar
                  ? <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
                  : avatarInitial(user.username)
                }
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#1a1d2e] rounded-full" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{user.username}</p>
              <p className="text-xs text-emerald-400 font-medium">Active now</p>
            </div>
          </div>

          <button
            onClick={() => setShowPeopleModal(true)}
            title="Start a new chat"
            className="w-9 h-9 flex items-center justify-center bg-violet-600 hover:bg-violet-500 rounded-xl text-white transition shadow-md"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <path strokeLinecap="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* App title */}
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Messages</p>

        {/* Search */}
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" value={convoSearch}
            onChange={(e) => setConvoSearch(e.target.value)}
            placeholder="Search chats…"
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/8 rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:bg-white/8 transition"
          />
          {convoSearch && (
            <button onClick={() => setConvoSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-lg leading-none transition">×</button>
          )}
        </div>
      </div>

      {/* ── Chat List ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2">
        {filteredChats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-600 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                <path strokeLinecap="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            {convoSearch
              ? <p className="text-sm">No chats match "<strong className="text-slate-400">{convoSearch}</strong>"</p>
              : <><p className="text-sm text-slate-500">No conversations yet</p><p className="text-xs mt-1 text-slate-600">Tap + to start one</p></>
            }
          </div>
        )}

        {filteredChats.map((chat) => {
          const sender = !chat.isGroupChat ? getSender(chat, user) : null;
          const isOnline = sender && onlineUsers.includes(sender._id);
          const isActive = activeChat?._id === chat._id;
          const unread = notification.filter((n) => n.chat._id === chat._id).length;
          const name = chat.isGroupChat ? chat.chatName : sender?.username;

          return (
            <button
              key={chat._id}
              onClick={() => selectChat(chat)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left mx-0 ${
                isActive
                  ? "bg-violet-600/20 border-l-2 border-l-violet-500"
                  : "hover:bg-white/5 border-l-2 border-l-transparent"
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                {chat.isGroupChat ? (
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                  </div>
                ) : sender?.avatar ? (
                  <img src={sender.avatar} alt={name} className="w-11 h-11 rounded-2xl object-cover shadow-md" />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                    {avatarInitial(name)}
                  </div>
                )}
                {!chat.isGroupChat && isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#1a1d2e] rounded-full" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <p className={`text-sm font-semibold truncate ${isActive ? "text-violet-300" : "text-slate-200"}`}>
                    {name}
                  </p>
                  {chat.latestMessage && (
                    <span className="text-xs text-slate-600 ml-1 flex-shrink-0">
                      {new Date(chat.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className={`text-xs truncate ${unread > 0 ? "text-slate-300 font-medium" : "text-slate-600"}`}>
                    {getPreview(chat, user)}
                  </p>
                  {unread > 0 && (
                    <span className="ml-1.5 bg-violet-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 px-1 font-semibold">
                      {unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Bottom ──────────────────────────────────────── */}
      <div className="border-t border-white/5 p-3">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition group"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="w-4 h-4 transition group-hover:stroke-red-400">
            <path strokeLinecap="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/>
          </svg>
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>

      {/* ── Find People Modal ────────────────────────────── */}
      {showPeopleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="modal-card w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div>
                <h2 className="font-semibold text-white text-sm">Start a conversation</h2>
                <p className="text-xs text-slate-500 mt-0.5">Find people to chat with</p>
              </div>
              <button
                onClick={() => { setShowPeopleModal(false); setPeopleQuery(""); setPeopleResults([]); }}
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition text-lg"
              >×</button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-white/5">
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none">
                  <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text" value={peopleQuery}
                  onChange={(e) => setPeopleQuery(e.target.value)}
                  placeholder="Search by username or email…"
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/8 rounded-xl text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto">
              {searching && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!searching && peopleQuery && peopleResults.length === 0 && (
                <p className="px-5 py-8 text-sm text-slate-500 text-center">No users found for "<span className="text-slate-400">{peopleQuery}</span>"</p>
              )}
              {!peopleQuery && (
                <p className="px-5 py-8 text-sm text-slate-600 text-center">Type a name or email to search</p>
              )}
              {peopleResults.map((u) => (
                <button
                  key={u._id}
                  onClick={() => openChat(u._id)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition text-left"
                >
                  <div className="relative flex-shrink-0">
                    {u.avatar
                      ? <img src={u.avatar} alt={u.username} className="w-10 h-10 rounded-xl object-cover" />
                      : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">{u.username?.[0]?.toUpperCase()}</div>
                    }
                    {onlineUsers.includes(u._id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#1e2235] rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{u.username}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs text-violet-400 font-semibold flex-shrink-0">Chat →</span>
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
