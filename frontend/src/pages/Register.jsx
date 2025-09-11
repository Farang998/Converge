import React, { useState } from "react";
import api from "../services/api";

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    api.post("auth/register/", form)
      .then(res => alert("User registered"))
      .catch(err => alert("Registration failed"));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      <input 
        type="text" 
        placeholder="Username" 
        value={form.username} 
        onChange={(e) => setForm({ ...form, username: e.target.value })} 
      />
      <input 
        type="email" 
        placeholder="Email" 
        value={form.email} 
        onChange={(e) => setForm({ ...form, email: e.target.value })} 
      />
      <input 
        type="password" 
        placeholder="Password" 
        value={form.password} 
        onChange={(e) => setForm({ ...form, password: e.target.value })} 
      />
      <button type="submit">Register</button>
    </form>
  );
}
