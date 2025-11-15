import React, { useState, useEffect, useRef } from "react";
import { FaTimes, FaUserPlus, FaExclamationCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./createProject.css";
// ...existing code...

export default function CreateProject() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    members: [],
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [memberInput, setMemberInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState("");
  const [usersCache, setUsersCache] = useState([]); // cached users from /users
  const suggRef = useRef(null);
  const debounceRef = useRef(null);

  // Load all users once on mount (use only if userbase is small/moderate)
  useEffect(() => {
    let mounted = true;
    setLoadingSuggestions(true);
    api
      .get("/users")
      .then((res) => {
        if (!mounted) return;
        const arr = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
        const normalized = arr.map((u) => ({
          id: u._id ?? u.id ?? Math.random().toString(36).slice(2),
          username: (u.username ?? "").toString(),
          name: (u.firstName ?? u.name ?? u.fullName ?? u.email ?? "").toString(),
          email: u.email ?? "",
        }));
        setUsersCache(normalized);
      })
      .catch(() => {
        setUsersCache([]);
      })
      .finally(() => mounted && setLoadingSuggestions(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Filter suggestions from cached users (by username / name / email)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const q = (memberInput || "").trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    debounceRef.current = setTimeout(() => {
      const filtered = usersCache.filter(
        (u) =>
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
      );
      setSuggestions(filtered.slice(0, 10));
      setLoadingSuggestions(false);
    }, 180);
    return () => clearTimeout(debounceRef.current);
  }, [memberInput, usersCache]);

  // Close suggestions on outside click
  useEffect(() => {
    function onDoc(e) {
      if (suggRef.current && !suggRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Fallback server-side existence check (if cache miss)
  async function checkUserExistsServer(username) {
    if (!username) return null;
    try {
      const resp = await api.get("/users", { params: { username } });
      const list = Array.isArray(resp.data) ? resp.data : resp.data?.results ?? [];
      const found = list.find((u) => (u.username || "").toLowerCase() === username.toLowerCase());
      if (found) {
        return {
          id: found._id ?? found.id,
          username: found.username,
          name: found.firstName ?? found.name ?? found.email ?? "",
        };
      }
    } catch {
      // ignore
    }
    // try generic q param as second fallback
    try {
      const r2 = await api.get("/users", { params: { q: username } });
      const list2 = Array.isArray(r2.data) ? r2.data : r2.data?.results ?? [];
      const found2 = list2.find((u) => (u.username || "").toLowerCase() === username.toLowerCase());
      if (found2) {
        return {
          id: found2._id ?? found2.id,
          username: found2.username,
          name: found2.firstName ?? found2.name ?? found2.email ?? "",
        };
      }
    } catch {
      // ignore
    }
    return null;
  }

  // Add member (accept optional username param for immediate-add from suggestion)
  const addMember = async (inputUsername) => {
    setError("");
    const trimmed = (inputUsername ?? memberInput ?? "").trim();
    if (!trimmed) {
      setError("Enter a username.");
      return;
    }
    // prevent duplicates
    if (formData.members.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setError("User already added.");
      setMemberInput("");
      setSuggestions([]);
      return;
    }

    // try cache first
    const found = usersCache.find((u) => (u.username || "").toLowerCase() === trimmed.toLowerCase());
    if (found) {
      setFormData((p) => ({ ...p, members: [...p.members, found.username] }));
      setMemberInput("");
      setSuggestions([]);
      return;
    }

    // fallback to server check
    const serverUser = await checkUserExistsServer(trimmed);
    if (!serverUser) {
      setError("User not found in users collection. Add only existing usernames.");
      return;
    }

    setFormData((p) => ({ ...p, members: [...p.members, serverUser.username] }));
    setMemberInput("");
    setSuggestions([]);
  };

  const removeMember = (m) => setFormData((p) => ({ ...p, members: p.members.filter((x) => x !== m) }));

  // When suggestion clicked: add immediately
  const handleSelectSuggestion = (u) => {
    if (!u || !u.username) return;
    addMember(u.username);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.name.trim()) {
      setError("Project name is required.");
      return;
    }
    try {
      const resp = await api.post("/projects", formData);
      if (resp.status === 201 || resp.status === 200) {
        navigate("/dashboard");
      } else {
        setError("Failed to create project.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to create project.");
    }
  };

  return (
    <div className="create-wrapper">
      <div className="create-card">
        <button className="close-btn" onClick={() => navigate("/dashboard")} aria-label="Close">
          <FaTimes />
        </button>

        <h2>Create New Project</h2>

        {error && (
          <div className="error-popup">
            <FaExclamationCircle /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-grid" autoComplete="off">
          <div className="form-group full">
            <label>Project Name <span className="required">*</span></label>
            <input
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="form-group full">
            <label>Description <span className="required">*</span></label>
            <textarea
              className="input-field textarea"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe your project objectives, goals and scope"
              required
            />
          </div>

          <div className="form-group full" ref={suggRef}>
            <label><FaUserPlus className="icon" /> Team Members</label>
            <div className="member-input-row">
              <input
                className="input-field"
                value={memberInput}
                onChange={(e) => { setMemberInput(e.target.value); setError(""); }}
                placeholder="Type username (autocomplete)"
                aria-autocomplete="list"
              />
              <button type="button" className="add-member-btn" onClick={() => addMember()}>
                Add
              </button>
            </div>

            {loadingSuggestions && <div className="hint">Searching...</div>}

            {suggestions.length > 0 && (
              <div className="member-suggestions">
                {suggestions.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="member-suggestion-item"
                    onClick={() => handleSelectSuggestion(u)}
                  >
                    <strong>{u.username}</strong>
                    <span className="muted"> — {u.name}</span>
                  </button>
                ))}
              </div>
            )}

            {formData.members.length > 0 && (
              <div className="member-list">
                {formData.members.map((m) => (
                  <span key={m} className="member-tag">
                    {m}
                    <button type="button" className="remove-member" onClick={() => removeMember(m)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions full">
            <button type="submit" className="create-btn">Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}