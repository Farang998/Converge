import React, { useState } from "react";
import Navbar from "./components/Navbar";
import ChatList from "./components/ChatList";
import Conversation from "./components/Conversation";
import "./index.css";

export default function App() {
  const [activeConversation, setActiveConversation] = useState(null);
  const currentUserId = 999; // dummy current user id

  return (
    <div className="app-root">
      <Navbar />
      <div className="app-body">
        <ChatList
          setActiveConversation={setActiveConversation}
          currentUserId={currentUserId}
        />
        <Conversation
          activeConversation={activeConversation}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
