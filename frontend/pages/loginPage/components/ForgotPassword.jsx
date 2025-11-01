import React, { useState } from "react";
import "./ForgotPassword.css";
import logo from "../assets/logo.png";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("⚠️ Please enter your registered email.");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setMessage("✅ Password reset link sent to your email.");
    } catch (err) {
      console.error(err);
      setError("❌ Unable to send reset link. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-wrapper">
      <div className="forgot-card">
        {/* Logo + Branding */}
        <div className="logo">
          <img src={logo} alt="Converge Logo" />
          <span className="brand">
            <span className="green">C</span>
            <span className="blue">o</span>
            <span className="green">n</span>
            <span className="blue">v</span>
            <span className="green">e</span>
            <span className="blue">r</span>
            <span className="green">g</span>
            <span className="blue">e</span>
          </span>
        </div>

        <h2>Forgot Password</h2>
        <p className="subtitle">
          Enter your registered email to receive a password reset link.
        </p>

        {message && <div className="success-box">{message}</div>}
        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleReset}>
          <label>Email Address</label>
          <input
            type="email"
            placeholder="naitik@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? <div className="spinner"></div> : "Send Reset Link"}
          </button>
        </form>

        <p className="back-link" onClick={() => navigate("/")}>
          ← Back to Login
        </p>
      </div>
    </div>
  );
}
