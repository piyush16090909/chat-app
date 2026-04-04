// src/components/MessageBubble.jsx — Single message bubble
//
// Props:
//   message    — the full populated message object from the API
//   isOwn      — true if the current user sent this message
//   showAvatar — whether to show the sender's avatar (avoids
//                repeating it for consecutive messages from the
//                same sender)
//   isGroup    — true for group chats (shows sender name above)

import React from "react";

const MessageBubble = ({ message, isOwn, showAvatar, isGroup }) => {
  const timeStr = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex items-end gap-2 chat-bubble-enter ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      
      {/* Avatar — only shown for other user's messages */}
      {!isOwn && (
        <div className="w-7 h-7 flex-shrink-0 mb-1">
          {showAvatar ? (
            <img
              src={message.sender.avatar}
              alt={message.sender.username}
              className="w-7 h-7 rounded-full object-cover bg-gray-100"
            />
          ) : (
            <div className="w-7 h-7" /> // spacer to keep alignment
          )}
        </div>
      )}

      {/* Bubble */}
      <div className={`max-w-xs lg:max-w-md ${isOwn ? "items-end" : "items-start"} flex flex-col`}>

        {/* Sender name for group chats */}
        {isGroup && !isOwn && showAvatar && (
          <span className="text-xs text-gray-500 ml-1 mb-0.5 font-medium">
            {message.sender.username}
          </span>
        )}

        <div
          className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-sm"
          }`}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-gray-400 mt-0.5 mx-1">{timeStr}</span>
      </div>
    </div>
  );
};

export default MessageBubble;
