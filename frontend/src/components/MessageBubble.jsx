import React from "react";

const MessageBubble = ({ message, isOwn, showAvatar, isGroup }) => {
  const timeStr = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const initial = message.sender.username?.[0]?.toUpperCase() || "?";

  return (
    <div className={`flex items-end gap-2 chat-bubble-enter ${isOwn ? "flex-row-reverse" : "flex-row"}`}>

      {/* Avatar — other user only */}
      {!isOwn && (
        <div className="w-7 h-7 flex-shrink-0 mb-1">
          {showAvatar ? (
            message.sender.avatar
              ? <img src={message.sender.avatar} alt={message.sender.username} className="w-7 h-7 rounded-lg object-cover" />
              : <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">{initial}</div>
          ) : (
            <div className="w-7 h-7" />
          )}
        </div>
      )}

      {/* Bubble wrapper */}
      <div className={`max-w-xs lg:max-w-md flex flex-col ${isOwn ? "items-end" : "items-start"}`}>

        {/* Sender name in group chats */}
        {isGroup && !isOwn && showAvatar && (
          <span className="text-xs text-violet-400 font-semibold ml-1 mb-1">
            {message.sender.username}
          </span>
        )}

        <div className={`px-4 py-2.5 text-sm leading-relaxed ${
          isOwn
            ? "own-bubble rounded-2xl rounded-br-sm text-white"
            : "other-bubble rounded-2xl rounded-bl-sm text-slate-200"
        }`}>
          {message.content}
        </div>

        <span className="text-xs text-slate-600 mt-1 mx-1">{timeStr}</span>
      </div>
    </div>
  );
};

export default MessageBubble;