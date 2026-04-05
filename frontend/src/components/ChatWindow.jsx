import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useSocket } from "../context/SocketContext";
import API from "../api/axios";
import MessageBubble from "./MessageBubble";

const getSender = (chat, currentUser) =>
  chat.participants.find((p) => p._id !== currentUser._id);

const ChatWindow = () => {
  const { user } = useAuth();
  const { activeChat, setActiveChat, fetchChats, addNotification } = useChat();
  const { socket, onlineUsers } = useSocket();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(false);
  const [sending, setSending] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeChatRef = useRef(activeChat);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (!activeChat) return;
    const loadMessages = async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/messages/${activeChat._id}`);
        setMessages(data);
      } catch (err) { console.error("Failed to load messages:", err); }
      finally { setLoading(false); }
    };
    loadMessages();
    if (socket) socket.emit("join_chat", activeChat._id);
    return () => { if (socket) socket.emit("leave_chat", activeChat._id); };
  }, [activeChat, socket]);

  useEffect(() => {
    if (!socket) return;
    const handleMessageReceived = (message) => {
      if (activeChatRef.current?._id === message.chat._id) {
        setMessages((prev) => [...prev, message]);
        fetchChats();
      } else {
        addNotification(message);
        fetchChats();
      }
    };
    const handleTyping = (chatId) => { if (activeChatRef.current?._id === chatId) setTypingUsers(true); };
    const handleStopTyping = (chatId) => { if (activeChatRef.current?._id === chatId) setTypingUsers(false); };
    socket.on("message_received", handleMessageReceived);
    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);
    return () => {
      socket.off("message_received", handleMessageReceived);
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
    };
  }, [socket, fetchChats, addNotification]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!socket || !activeChat) return;
    socket.emit("typing", activeChat._id);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit("stop_typing", activeChat._id), 2000);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || sending) return;
    setSending(true);
    socket?.emit("stop_typing", activeChat._id);
    try {
      const { data } = await API.post("/messages", { content: newMessage.trim(), chatId: activeChat._id });
      setNewMessage("");
      setMessages((prev) => [...prev, data]);
      fetchChats();
      socket?.emit("send_message", data);
    } catch (err) { console.error("Failed to send message:", err); }
    finally { setSending(false); }
  };

  const handleBlockUser = () => {
    setMenuOpen(false);
    const otherUser = getSender(activeChat, user);
    setConfirmModal({
      type: "block", icon: "block",
      title: `Block ${otherUser?.username}?`,
      message: "They won't be able to send you messages. You can unblock them later.",
      confirmLabel: "Block User", confirmStyle: "bg-orange-500 hover:bg-orange-600",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await API.put(`/users/block/${otherUser._id}`);
          showToast(`${otherUser?.username} has been blocked`);
          setConfirmModal(null);
        } catch (err) { showToast(err.response?.data?.message || "Failed to block user", "error"); }
        finally { setActionLoading(false); }
      },
    });
  };

  const handleDeleteChat = () => {
    setMenuOpen(false);
    setConfirmModal({
      type: "delete", icon: "delete",
      title: "Delete this chat?",
      message: "This conversation will be removed from your list. The other person won't be affected.",
      confirmLabel: "Delete Chat", confirmStyle: "bg-red-500 hover:bg-red-600",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await API.delete(`/users/chat/${activeChat._id}`);
          showToast("Chat deleted");
          setConfirmModal(null);
          setActiveChat(null);
          fetchChats();
        } catch (err) { showToast(err.response?.data?.message || "Failed to delete chat", "error"); }
        finally { setActionLoading(false); }
      },
    });
  };

  // ── Empty state ───────────────────────────────────────────
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center chat-bg text-slate-600">
        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/8 flex items-center justify-center mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-9 h-9 text-slate-500">
            <path strokeLinecap="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-slate-400">Your messages</h2>
        <p className="text-sm text-slate-600 mt-1">Select a conversation or start a new one</p>
      </div>
    );
  }

  const otherUser = !activeChat.isGroupChat ? getSender(activeChat, user) : null;
  const isOtherOnline = otherUser && onlineUsers.includes(otherUser._id);

  return (
    <div className="flex-1 flex flex-col h-full chat-bg">

      {/* ── Toast ─────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2.5 transition-all ${
          toast.type === "error" ? "bg-red-500/90 backdrop-blur-sm" : "bg-emerald-500/90 backdrop-blur-sm"
        }`}>
          {toast.type === "error"
            ? <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          }
          {toast.message}
        </div>
      )}

      {/* ── Confirmation Modal ─────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="modal-card rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="text-center mb-5">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                confirmModal.type === "delete" ? "bg-red-500/20" : "bg-orange-500/20"
              }`}>
                {confirmModal.type === "delete"
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6 text-red-400">
                      <polyline points="3 6 5 6 21 6"/><path strokeLinecap="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path strokeLinecap="round" d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6 text-orange-400">
                      <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                }
              </div>
              <h3 className="text-base font-semibold text-white">{confirmModal.title}</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} disabled={actionLoading}
                className="flex-1 px-4 py-2.5 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 rounded-xl text-sm font-medium transition">
                Cancel
              </button>
              <button onClick={confirmModal.onConfirm} disabled={actionLoading}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition ${confirmModal.confirmStyle} disabled:opacity-60`}>
                {actionLoading
                  ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Working…</span>
                  : confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat Header ───────────────────────────────────── */}
      <div className="chat-header px-5 py-3.5 flex items-center gap-3.5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {activeChat.isGroupChat ? (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </div>
          ) : otherUser?.avatar ? (
            <img src={otherUser.avatar} alt={otherUser.username} className="w-10 h-10 rounded-xl object-cover shadow-md" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md">
              {otherUser?.username?.[0]?.toUpperCase()}
            </div>
          )}
          {!activeChat.isGroupChat && isOtherOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#1a1d2e] rounded-full" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">
            {activeChat.isGroupChat ? activeChat.chatName : otherUser?.username}
          </p>
          <p className="text-xs mt-0.5">
            {activeChat.isGroupChat
              ? <span className="text-slate-500">{activeChat.participants.length} members</span>
              : isOtherOnline
                ? <span className="text-emerald-400 font-medium">Active now</span>
                : <span className="text-slate-600">Offline</span>
            }
          </p>
        </div>

        {/* 3-dot menu */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen((o) => !o)}
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/8 rounded-lg transition">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-44 modal-card border border-white/8 rounded-xl shadow-xl z-30 overflow-hidden">
              {!activeChat.isGroupChat && (
                <button onClick={handleBlockUser}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-orange-400 hover:bg-orange-500/10 transition text-left">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                  </svg>
                  Block User
                </button>
              )}
              {!activeChat.isGroupChat && <div className="border-t border-white/5" />}
              <button onClick={handleDeleteChat}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition text-left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                  <polyline points="3 6 5 6 21 6"/>
                  <path strokeLinecap="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path strokeLinecap="round" d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
                Delete Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 messages-area">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 py-12">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7">
                <path strokeLinecap="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">No messages yet</p>
            <p className="text-xs text-slate-600 mt-1">Say hi to get the conversation started!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={msg.sender._id === user._id}
              showAvatar={idx === 0 || messages[idx - 1]?.sender._id !== msg.sender._id}
              isGroup={activeChat.isGroupChat}
            />
          ))
        )}

        {/* Typing indicator */}
        {typingUsers && (
          <div className="flex items-center gap-2 pl-1 py-1">
            <div className="flex gap-1 bg-white/8 border border-white/8 rounded-2xl rounded-bl-sm px-3 py-2.5">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ─────────────────────────────────────────── */}
      <div className="chat-input-bar px-4 py-3">
        <form onSubmit={sendMessage} className="flex items-center gap-3">
          <input
            type="text" value={newMessage} onChange={handleTyping}
            placeholder="Type a message…"
            className="flex-1 px-4 py-2.5 bg-white/7 border border-white/10 rounded-2xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:bg-white/10 transition"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 bg-violet-600 hover:bg-violet-500 disabled:bg-white/8 disabled:text-slate-600 text-white rounded-2xl flex items-center justify-center transition flex-shrink-0 shadow-md"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;