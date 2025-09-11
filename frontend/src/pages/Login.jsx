import React, { useState } from "react";
import api from "../services/api";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    api.post("auth/login/", form)
      .then(res => alert("Login successful"))
      .catch(err => alert("Login failed"));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <input 
        type="text" 
        placeholder="Username" 
        value={form.username} 
        onChange={(e) => setForm({ ...form, username: e.target.value })} 
      />
      <input 
        type="password" 
        placeholder="Password" 
        value={form.password} 
        onChange={(e) => setForm({ ...form, password: e.target.value })} 
      />
      <button type="submit">Login</button>
    </form>
  );
}
