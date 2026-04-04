// src/components/ChatWindow.jsx — Right panel: messages + input
//
// Responsibilities:
//  1. Load messages from GET /api/messages/:chatId on chat change
//  2. Listen for incoming "message_received" socket events
//  3. Emit "typing" / "stop_typing" events as the user types
//  4. Send messages via POST /api/messages then emit "send_message"
//  5. Auto-scroll to the latest message

import React, { useEffect, useRef, useState, useCallback } from "react";
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
  const { socket } = useSocket();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(false);
  const [sending, setSending] = useState(false);

  // 3-dot menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'block'|'delete', title, message, onConfirm }
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeChatRef = useRef(activeChat);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = "success") => setToast({ message, type });

  // ── Scroll to bottom ──────────────────────────────────────
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Load messages ────────────────────────────────────────
  useEffect(() => {
    if (!activeChat) return;
    const loadMessages = async () => {
      setLoading(true);
      try {
        const { data } = await API.get(`/messages/${activeChat._id}`);
        setMessages(data);
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
    if (socket) socket.emit("join_chat", activeChat._id);
    return () => { if (socket) socket.emit("leave_chat", activeChat._id); };
  }, [activeChat, socket]);

  // ── Socket listeners ─────────────────────────────────────
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
    const handleTyping = (chatId) => {
      if (activeChatRef.current?._id === chatId) setTypingUsers(true);
    };
    const handleStopTyping = (chatId) => {
      if (activeChatRef.current?._id === chatId) setTypingUsers(false);
    };
    socket.on("message_received", handleMessageReceived);
    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);
    return () => {
      socket.off("message_received", handleMessageReceived);
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
    };
  }, [socket, fetchChats, addNotification]);

  // ── Typing handler ───────────────────────────────────────
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!socket || !activeChat) return;
    socket.emit("typing", activeChat._id);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", activeChat._id);
    }, 2000);
  };

  // ── Send message ─────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || sending) return;
    setSending(true);
    socket?.emit("stop_typing", activeChat._id);
    try {
      const { data } = await API.post("/messages", {
        content: newMessage.trim(),
        chatId: activeChat._id,
      });
      setNewMessage("");
      setMessages((prev) => [...prev, data]);
      fetchChats();
      socket?.emit("send_message", data);
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  // ── Block user ───────────────────────────────────────────
  const handleBlockUser = () => {
    setMenuOpen(false);
    const otherUser = getSender(activeChat, user);
    setConfirmModal({
      type: "block",
      icon: "🚫",
      title: `Block ${otherUser?.username}?`,
      message: `They won't be able to send you messages. You can unblock them later from settings.`,
      confirmLabel: "Block User",
      confirmStyle: "bg-orange-500 hover:bg-orange-600",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await API.put(`/users/block/${otherUser._id}`);
          showToast(`${otherUser?.username} has been blocked`);
          setConfirmModal(null);
        } catch (err) {
          showToast(err.response?.data?.message || "Failed to block user", "error");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // ── Delete chat ──────────────────────────────────────────
  const handleDeleteChat = () => {
    setMenuOpen(false);
    setConfirmModal({
      type: "delete",
      icon: "🗑️",
      title: "Delete this chat?",
      message: "This conversation will be removed from your list. The other person won't be affected.",
      confirmLabel: "Delete Chat",
      confirmStyle: "bg-red-500 hover:bg-red-600",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await API.delete(`/users/chat/${activeChat._id}`);
          showToast("Chat deleted");
          setConfirmModal(null);
          setActiveChat(null);
          fetchChats();
        } catch (err) {
          showToast(err.response?.data?.message || "Failed to delete chat", "error");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // ── Empty state ──────────────────────────────────────────
  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
        <div className="text-6xl mb-4">💬</div>
        <h2 className="text-xl font-semibold text-gray-600">Select a conversation</h2>
        <p className="text-sm mt-1">Choose from your existing chats or start a new one</p>
      </div>
    );
  }

  const otherUser = !activeChat.isGroupChat ? getSender(activeChat, user) : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">

      {/* ── Toast ────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 transition-all ${
          toast.type === "error" ? "bg-red-500" : "bg-green-500"
        }`}>
          <span>{toast.type === "error" ? "❌" : "✅"}</span>
          {toast.message}
        </div>
      )}

      {/* ── Confirmation Modal ────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-3">{confirmModal.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900">{confirmModal.title}</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmModal(null)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition ${confirmModal.confirmStyle} disabled:opacity-60`}
              >
                {actionLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Working…
                  </span>
                ) : confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat Header ──────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shadow-sm">
        <div className="relative">
          {activeChat.isGroupChat ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white">
              👥
            </div>
          ) : (
            <img src={otherUser?.avatar} alt={otherUser?.username}
              className="w-10 h-10 rounded-full object-cover bg-gray-100" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">
            {activeChat.isGroupChat ? activeChat.chatName : otherUser?.username}
          </p>
          {activeChat.isGroupChat ? (
            <p className="text-xs text-gray-400">{activeChat.participants.length} members</p>
          ) : (
            <p className="text-xs text-gray-400">
              {otherUser?.isOnline ? "🟢 Online" : "⚫ Offline"}
            </p>
          )}
        </div>

        {/* ── 3-Dot Menu ─────────────────────────────────── */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
          >
            {/* Vertical three dots */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-30 overflow-hidden">
              {/* Block User — only for 1-to-1 chats */}
              {!activeChat.isGroupChat && (
                <button
                  onClick={handleBlockUser}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-orange-600 hover:bg-orange-50 transition text-left"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  Block User
                </button>
              )}
              {/* Divider */}
              {!activeChat.isGroupChat && <div className="border-t border-gray-100" />}
              {/* Delete Chat */}
              <button
                onClick={handleDeleteChat}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition text-left"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                  <polyline points="3 6 5 6 21 6" />
                  <path strokeLinecap="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path strokeLinecap="round" d="M10 11v6M14 11v6" />
                  <path strokeLinecap="round" d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
                Delete Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages Area ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">👋</p>
            <p className="text-sm">Say hello to start the conversation!</p>
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
        {typingUsers && (
          <div className="flex items-center gap-2 text-gray-400 text-sm pl-2">
            <span className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
            typing…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Message Input ─────────────────────────────────── */}
      <form onSubmit={sendMessage}
        className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Type a message…"
          className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition flex-shrink-0"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;

//   const [messages, setMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [typingUsers, setTypingUsers] = useState(false);
//   const [sending, setSending] = useState(false);

//   const messagesEndRef = useRef(null);
//   const typingTimeoutRef = useRef(null);
//   const activeChatRef = useRef(activeChat); // stable ref for socket callbacks

//   // Keep ref in sync so socket callbacks see current chat
//   useEffect(() => {
//     activeChatRef.current = activeChat;
//   }, [activeChat]);

//   // ── Scroll to bottom ──────────────────────────────────────
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   // ── Load messages when active chat changes ────────────────
//   useEffect(() => {
//     if (!activeChat) return;

//     const loadMessages = async () => {
//       setLoading(true);
//       try {
//         const { data } = await API.get(`/messages/${activeChat._id}`);
//         setMessages(data);
//       } catch (err) {
//         console.error("Failed to load messages:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadMessages();

//     // Join the socket room for this chat
//     if (socket) {
//       socket.emit("join_chat", activeChat._id);
//     }

//     return () => {
//       if (socket) {
//         socket.emit("leave_chat", activeChat._id);
//       }
//     };
//   }, [activeChat, socket]);

//   // ── Socket event listeners ────────────────────────────────
//   useEffect(() => {
//     if (!socket) return;

//     const handleMessageReceived = (message) => {
//       // If the message belongs to the currently open chat → append it
//       if (activeChatRef.current?._id === message.chat._id) {
//         setMessages((prev) => [...prev, message]);
//         fetchChats(); // refresh sidebar preview
//       } else {
//         // Message for a different chat → add to notification badge
//         addNotification(message);
//         fetchChats();
//       }
//     };

//     const handleTyping = (chatId) => {
//       if (activeChatRef.current?._id === chatId) setTypingUsers(true);
//     };

//     const handleStopTyping = (chatId) => {
//       if (activeChatRef.current?._id === chatId) setTypingUsers(false);
//     };

//     socket.on("message_received", handleMessageReceived);
//     socket.on("typing", handleTyping);
//     socket.on("stop_typing", handleStopTyping);

//     return () => {
//       socket.off("message_received", handleMessageReceived);
//       socket.off("typing", handleTyping);
//       socket.off("stop_typing", handleStopTyping);
//     };
//   }, [socket, fetchChats, addNotification]);

//   // ── Typing handler ────────────────────────────────────────
//   const handleTyping = (e) => {
//     setNewMessage(e.target.value);

//     if (!socket || !activeChat) return;

//     socket.emit("typing", activeChat._id);

//     // Stop emitting "typing" after 2s of inactivity
//     clearTimeout(typingTimeoutRef.current);
//     typingTimeoutRef.current = setTimeout(() => {
//       socket.emit("stop_typing", activeChat._id);
//     }, 2000);
//   };

//   // ── Send message ──────────────────────────────────────────
//   const sendMessage = async (e) => {
//     e.preventDefault();
//     if (!newMessage.trim() || !activeChat || sending) return;

//     setSending(true);
//     socket?.emit("stop_typing", activeChat._id);

//     try {
//       const { data } = await API.post("/messages", {
//         content: newMessage.trim(),
//         chatId: activeChat._id,
//       });

//       setNewMessage("");
//       setMessages((prev) => [...prev, data]);
//       fetchChats(); // update sidebar preview

//       // Broadcast to other users in the room
//       socket?.emit("send_message", data);
//     } catch (err) {
//       console.error("Failed to send message:", err);
//     } finally {
//       setSending(false);
//     }
//   };

//   // ── Empty state ───────────────────────────────────────────
//   if (!activeChat) {
//     return (
//       <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
//         <div className="text-6xl mb-4">💬</div>
//         <h2 className="text-xl font-semibold text-gray-600">Select a conversation</h2>
//         <p className="text-sm mt-1">Choose from your existing chats or start a new one</p>
//       </div>
//     );
//   }

//   const otherUser = !activeChat.isGroupChat ? getSender(activeChat, user) : null;

//   return (
//     <div className="flex-1 flex flex-col h-full bg-gray-50">

//       {/* ── Chat Header ──────────────────────────────────── */}
//       <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 shadow-sm">
//         <div className="relative">
//           {activeChat.isGroupChat ? (
//             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white">
//               👥
//             </div>
//           ) : (
//             <img
//               src={otherUser?.avatar}
//               alt={otherUser?.username}
//               className="w-10 h-10 rounded-full object-cover bg-gray-100"
//             />
//           )}
//         </div>
//         <div>
//           <p className="font-semibold text-gray-900">
//             {activeChat.isGroupChat ? activeChat.chatName : otherUser?.username}
//           </p>
//           {activeChat.isGroupChat ? (
//             <p className="text-xs text-gray-400">
//               {activeChat.participants.length} members
//             </p>
//           ) : (
//             <p className="text-xs text-gray-400">
//               {otherUser?.isOnline ? "🟢 Online" : "⚫ Offline"}
//             </p>
//           )}
//         </div>
//       </div>

//       {/* ── Messages Area ────────────────────────────────── */}
//       <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
//         {loading ? (
//           <div className="flex justify-center py-8">
//             <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//           </div>
//         ) : messages.length === 0 ? (
//           <div className="text-center py-12 text-gray-400">
//             <p className="text-4xl mb-2">👋</p>
//             <p className="text-sm">Say hello to start the conversation!</p>
//           </div>
//         ) : (
//           messages.map((msg, idx) => (
//             <MessageBubble
//               key={msg._id}
//               message={msg}
//               isOwn={msg.sender._id === user._id}
//               showAvatar={
//                 idx === 0 ||
//                 messages[idx - 1]?.sender._id !== msg.sender._id
//               }
//               isGroup={activeChat.isGroupChat}
//             />
//           ))
//         )}

//         {/* Typing indicator */}
//         {typingUsers && (
//           <div className="flex items-center gap-2 text-gray-400 text-sm pl-2">
//             <span className="flex gap-1">
//               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
//               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
//               <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
//             </span>
//             typing…
//           </div>
//         )}

//         <div ref={messagesEndRef} />
//       </div>

//       {/* ── Message Input ─────────────────────────────────── */}
//       <form
//         onSubmit={sendMessage}
//         className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3"
//       >
//         <input
//           type="text"
//           value={newMessage}
//           onChange={handleTyping}
//           placeholder="Type a message…"
//           className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
//           autoComplete="off"
//         />
//         <button
//           type="submit"
//           disabled={!newMessage.trim() || sending}
//           className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition flex-shrink-0"
//         >
//           {sending ? (
//             <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
//           ) : (
//             <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
//               <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
//             </svg>
//           )}
//         </button>
//       </form>
//     </div>
//   );
// };

// export default ChatWindow;
