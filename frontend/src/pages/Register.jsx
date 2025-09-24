import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';


export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.id]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otpSent) {
      // Step 1: Send OTP
      try {
        const response = await fetch('http://localhost:8000/api/send-otp/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, purpose: 'register' })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setOtpSent(true);
          setSuccess('OTP sent to your email. Please enter it below.');
          if (data.otp) setOtp(String(data.otp)); // helpful in DEBUG mode
        } else {
          setError(data.message || 'Failed to send OTP.');
        }
      } catch (err) {
        setError('Network error while sending OTP.');
      }
      return;
    }

    // Step 2: Validate OTP
    if (otpSent) {
      if (!otp || otp.trim() === '') {
        setError('Please enter the OTP sent to your email.');
        return;
      }
      try {
        const response = await fetch('http://localhost:8000/api/validate-otp/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, otp: otp.trim(), purpose: 'register' })
        });
        const data = await response.json();
        if (!(response.ok && data.success)) {
          setError((data && (data.message || data.error)) || 'Invalid OTP.');
          return;
        }
      } catch (err) {
        setError('Network error while validating OTP.');
        return;
      }
    }

    // Step 3: Register user
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      username: form.username,
      email: form.email,
      password: form.password
    };
    try {
      const response = await fetch('http://localhost:8000/api/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setSuccess('Registration successful! Redirecting...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        const data = await response.json();
        setError(data.error || data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Network error during registration.');
    }
  }

  return (
    <div className="container" id="authContainer">
      <div className="logo">
        <img src="/logo.png" alt="logo" />
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
      <p className="subtitle">The all-in-one remote work collaboration platform</p>
      <form id="registerForm" onSubmit={handleSubmit}>
        <div className="form-title">Create your account</div>
        <label>First Name</label>
        <input type="text" id="firstName" value={form.firstName} onChange={handleChange} required disabled={otpSent} />
        <label>Last Name</label>
        <input type="text" id="lastName" value={form.lastName} onChange={handleChange} required disabled={otpSent} />
        <label>Username</label>
        <input type="text" id="username" value={form.username} onChange={handleChange} required disabled={otpSent} />
        <label>Email</label>
        <input type="email" id="email" value={form.email} onChange={handleChange} required disabled={otpSent} />
        <label>Password</label>
        <input type="password" id="password" value={form.password} onChange={handleChange} required disabled={otpSent} />
        <label>Confirm Password</label>
        <input type="password" id="confirmPassword" value={form.confirmPassword} onChange={handleChange} required disabled={otpSent} />
        {otpSent && (
          <>
            <label>Enter OTP</label>
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required />
          </>
        )}
        <button type="submit">{otpSent ? 'Verify OTP & Register' : 'Send OTP'}</button>
        {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
        {success && <div style={{ color: 'green', marginTop: '1rem' }}>{success}</div>}
      </form>
      <button
        type="button"
        className="tab"
        style={{ marginTop: '1rem' }}
        onClick={() => navigate('/login')}
      >
        If you already have an account, Login
      </button>
    </div>
  );
}