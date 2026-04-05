// src/pages/ChatPage.jsx — Main Chat Layout
//
// Splits the screen into:
//   Left  (w-80)  → <Sidebar />  — conversation list
//   Right (flex-1) → <ChatWindow /> — active chat

import React from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

const ChatPage = () => {
  return (
    <div className="flex h-screen overflow-hidden" style={{background:"#0f1117"}}>
      <Sidebar />
      <ChatWindow />
    </div>
  );
};

export default ChatPage;