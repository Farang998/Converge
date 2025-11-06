import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api, { setAuthToken } from '../services/api';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    loginIdentifier: '',
    loginPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.id]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      username: form.loginIdentifier,
      password: form.loginPassword
    };

    try {
      const response = await api.post('auth/login/', payload);
      if (response.data.token) {
        // Set the token in axios headers BEFORE calling identify-user
        setAuthToken(response.data.token);
        
        const userResponse = await api.get('auth/identify-user/');
        if (userResponse.data.user) {
          login(userResponse.data.user, response.data.token);
          toast.success('Login successful! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          setError('Failed to get user information. Please try again.');
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Network error. Please try again.');
    }
  }

  return (
    <div className="container" id="authContainer">
      <div className="logo">
        <img src="logo.png" alt="logo" />
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
      <form id="loginForm" onSubmit={handleSubmit}>
        <div className="form-title">Login to your account</div>
        <label htmlFor="loginIdentifier">Email or Username</label>
        <input
          type="text"
          id="loginIdentifier"
          name="loginIdentifier"
          placeholder="naitik@example.com or Naitik"
          value={form.loginIdentifier}
          onChange={handleChange}
          required
        />
        <label htmlFor="loginPassword">Password</label>
        <input
          type="password"
          id="loginPassword"
          name="loginPassword"
          value={form.loginPassword}
          onChange={handleChange}
          required
        />
        <button type="submit">Login</button>
        <button
          type="button"
          style={{ marginTop: '0.75rem', background: '#4285F4' }}
          onClick={async () => {
            setError('');
            try {
              // Clear any stale token
              setAuthToken(null);
              
              console.log('[Google Login] Starting Google sign-in popup...');
              const result = await signInWithPopup(auth, googleProvider);
              console.log('[Google Login] Sign-in successful, getting ID token...');
              
              const idToken = await result.user.getIdToken();
              console.log('[Google Login] ID token obtained, sending to backend...');
              
              const resp = await api.post('auth/google-login/', { id_token: idToken });
              console.log('[Google Login] Backend response:', resp.data);
              
              if (resp.data.token && resp.data.user) {
                login(resp.data.user, resp.data.token);
                toast.success('Google login successful! Redirecting...');
                setTimeout(() => navigate('/dashboard'), 1200);
              } else {
                setError('Failed to complete Google login.');
              }
            } catch (gErr) {
              console.error('[Google Login] Error:', gErr);
              
              // Better error messages
              if (gErr.code === 'auth/popup-blocked') {
                setError('Popup was blocked. Please allow popups for this site and try again.');
              } else if (gErr.code === 'auth/popup-closed-by-user') {
                setError('Sign-in popup was closed. Please try again.');
              } else if (gErr.code === 'auth/cancelled-popup-request') {
                setError('Another sign-in popup is already open.');
              } else if (gErr.response?.data?.error) {
                setError(gErr.response.data.error + (gErr.response.data.detail ? ': ' + gErr.response.data.detail : ''));
              } else {
                setError(gErr.message || 'Google sign-in failed. Please try again.');
              }
            }
          }}
        >
          Continue with Google
        </button>
        {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
        {success && <div style={{ color: 'green', marginTop: '1rem' }}>{success}</div>}
      </form>
      {/* Toast container for login notifications */}
      <ToastContainer />
      <button
        type="button"
        className="tab"
        style={{ marginTop: '1rem' }}
        onClick={() => navigate('/forgot-password')}
      >
        Forgot password?
      </button>
      <button
        type="button"
        className="tab"
        style={{ marginTop: '1rem' }}
        onClick={() => navigate('/register')}
      >
        If you don't have an account, Register
      </button>
      
    </div>
  );
}