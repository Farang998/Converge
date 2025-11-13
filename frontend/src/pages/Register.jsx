import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import api from '../services/api';


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
      if (!form.password || form.password.trim() === '') {
        setError('Password is required.');
        return;
      }
      if (form.password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      try {
        const validationResponse = await api.post('auth/validate-user/', {
          username: form.username,
          email: form.email
        });

        if (!validationResponse.data?.success) {
          setError(validationResponse.data?.message || 'Username or email already exists.');
          return;
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Network error while validating username and email.');
        return;
      }

      // Step 2: Send OTP
      try {
        const { data } = await api.post('auth/send-otp/', {
          email: form.email,
          purpose: 'register'
        });

        if (data?.success) {
          setOtpSent(true);
          setSuccess('OTP sent to your email. Please enter it below.');
        } else {
          setError(data?.message || 'Failed to send OTP.');
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Network error while sending OTP.');
      }
      return;
    }

    if (otpSent) {
      if (!otp || otp.trim() === '') {
        setError('Please enter the OTP sent to your email.');
        return;
      }
      try {
        const { data } = await api.post('auth/validate-otp/', {
          email: form.email,
          otp: otp.trim(),
          purpose: 'register'
        });

        if (!data?.success) {
          setError((data && (data.message || data.error)) || 'Invalid OTP.');
          return;
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Network error while validating OTP.');
        return;
      }
    }

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      username: form.username,
      email: form.email,
      password: form.password
    };
    try {
      await api.post('auth/register/', payload);
      setSuccess('Registration successful! Redirecting...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const message = err?.response?.data?.error || err?.response?.data?.message || 'Registration failed';
      setError(message);
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