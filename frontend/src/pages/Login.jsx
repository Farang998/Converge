import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api, { setAuthToken } from '../services/api';
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
        // Set the token first
        setAuthToken(response.data.token);
        // Fetch user identity
        const identity = await api.get('auth/identify-user/');
        if (identity?.data?.user) {
          login(identity.data.user, response.data.token);
          localStorage.setItem('username', identity.data.user.username);
          toast.success('Login successful! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 1500);
        } else {
          setError('Failed to get user information.');
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (error) {
      setError(error?.response?.data?.error || 'Login failed. Please try again.');
    }
  }

  return (
    <div className="loginpage">
      <div className="container">
        <div className="logo">
          <span className="brand"><span className="green">Con</span><span className="blue">verge</span></span>
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
          <button type="submit" className="primary-btn">Login</button>

          <button
            type="button"
            className="google-btn"
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
              }
            }}
          >
            <span className="g-icon" aria-hidden="true"></span>
            Continue with Google
          </button>

          {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
          {success && <div style={{ color: 'green', marginTop: '1rem' }}>{success}</div>}
        </form>

        {/* Toast container for login notifications */}
        <ToastContainer />

        <div className="links">
          <button
            type="button"
            className="tab"
            onClick={() => navigate('/forgot-password')}
          >
            Forgot password?
          </button>
          <button
            type="button"
            className="tab"
            onClick={() => navigate('/register')}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}