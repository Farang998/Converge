import React, { useState } from "react";

export default function ChatList({ setActiveConversation, currentUserId }) {
  const [selectedUser, setSelectedUser] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showGroupPopup, setShowGroupPopup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);

  const users = [
    { id: 1, username: "Alice" },
    { id: 2, username: "Bob" },
    { id: 3, username: "Charlie" },
    { id: 4, username: "Soham" },
  ];

  const [conversations, setConversations] = useState([
    {
      id: 1,
      name: "Alice",
      type: "direct",
      participants: [
        { id: currentUserId, username: "You" },
        { id: 1, username: "Alice" },
      ],
      messages: [],
    },
    {
      id: 2,
      name: "Project Team",
      type: "group",
      participants: [
        { id: currentUserId, username: "You" },
        { id: 1, username: "Alice" },
        { id: 2, username: "Bob" },
        { id: 3, username: "Charlie" },
      ],
      messages: [],
    },
  ]);

  const startConversation = () => {
    if (!selectedUser) {
      setErrorMessage("Please select a user first.");
      return;
    }

    const user = users.find((u) => u.id === Number(selectedUser));
    const existing = conversations.find(
      (c) => c.type === "direct" && c.participants.some((p) => p.id === user.id)
    );

    if (existing) {
      setActiveConversation(existing);
    } else {
      const newConv = {
        id: Date.now(),
        name: user.username,
        type: "direct",
        participants: [
          { id: currentUserId, username: "You" },
          user,
        ],
        messages: [],
      };
      setConversations([...conversations, newConv]);
      setActiveConversation(newConv);
    }

    setSelectedUser("");
    setErrorMessage("");
  };

  const handleSelect = (conversation) => {
    setActiveConversation(conversation);
  };

  const toggleGroupUser = (id) => {
    setSelectedGroupUsers((prev) =>
      prev.includes(id)
        ? prev.filter((uid) => uid !== id)
        : [...prev, id]
    );
  };

  const createGroupChat = () => {
    if (!groupName.trim()) {
      alert("Enter a group name!");
      return;
    }

    if (selectedGroupUsers.length < 2) {
      alert("Select at least 2 users for a group!");
      return;
    }

    const selected = users.filter((u) => selectedGroupUsers.includes(u.id));
    const newGroup = {
      id: Date.now(),
      name: groupName,
      type: "group",
      participants: [
        { id: currentUserId, username: "You" },
        ...selected,
      ],
      messages: [],
    };

    setConversations([...conversations, newGroup]);
    setGroupName("");
    setSelectedGroupUsers([]);
    setShowGroupPopup(false);
  };

  return (
    <aside className="chat-sidebar">
      <div className="chat-header">
        <h3>Discussion</h3>
        <p>Connect with your team</p>
      </div>

      <div className="user-selector">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="">Select a user to chat</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}
            </option>
          ))}
        </select>
        <button onClick={startConversation}>Start Chat</button>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
      </div>

      <button
        onClick={() => setShowGroupPopup(true)}
        className="group-btn"
      >
        + Create Group
      </button>

      <div className="conversation-list">
        <h4>Active Conversations</h4>
        {conversations.map((c) => (
          <div
            key={c.id}
            className="conversation-item"
            onClick={() => handleSelect(c)}
          >
            {c.type === "group" ? `Group: ${c.name}` : `Chat: ${c.name}`}
          </div>
        ))}
      </div>

      {showGroupPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h3>Create Group</h3>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />

            <p>Select members:</p>
            <div className="checkbox-list">
              {users.map((u) => (
                <label key={u.id}>
                  <input
                    type="checkbox"
                    checked={selectedGroupUsers.includes(u.id)}
                    onChange={() => toggleGroupUser(u.id)}
                  />{" "}
                  {u.username}
                </label>
              ))}
            </div>

            <div className="popup-buttons">
              <button onClick={() => setShowGroupPopup(false)}>Cancel</button>
              <button onClick={createGroupChat}>Create</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
