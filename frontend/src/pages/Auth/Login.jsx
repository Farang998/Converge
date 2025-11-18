import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api, { setAuthToken } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
const GOOGLE_CLIENT_ID = "93962274226-t1ngpdrcblqqiqmvkpji6eq7h0vvhovl.apps.googleusercontent.com";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    loginIdentifier: '',
    loginPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleLoaded, setGoogleLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
        setAuthToken(response.data.token);
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

  const handleGoogleSignIn = async (response) => {
    setError('');
    setSuccess('');
    
    try {
      
      const resp = await api.post('auth/google-login/', { 
        id_token: response.credential 
      });
      
      
      if (resp.data.success && resp.data.token && resp.data.user) {
        setAuthToken(resp.data.token);
        login(resp.data.user, resp.data.token);
        localStorage.setItem('username', resp.data.user.username);
        
        if (resp.data.is_new_user) {
          toast.success(`🎉 ${resp.data.message}`);
          setSuccess(`Welcome! Your account has been created. Redirecting to dashboard...`);
        } else {
          toast.success(resp.data.message);
          setSuccess(`${resp.data.message} Redirecting...`);
        }
        
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        const errorMsg = resp.data.error || 'Failed to complete Google login.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (gErr) {
      const errorMessage = gErr?.response?.data?.error || 'Google authentication failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      
      if (gErr?.response?.status === 400) {
        setError(errorMessage + ' Please make sure you\'re using a valid Google account.');
      }
    }
  };

  useEffect(() => {
    if (googleLoaded && window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('googleSignInButton'),
        { 
          theme: 'outline', 
          size: 'large',
          width: 300,
          text: 'continue_with'
        }
      );
    }
  }, [googleLoaded]);

  return (
    <div className="loginpage">
      <div className="auth-card">
        <div className="left">
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

          <form id="loginForm" onSubmit={handleSubmit} className="login-form">
            <div className="form-title">Login to your account</div>

            <label htmlFor="loginIdentifier">Email or Username</label>
            <input
              type="text"
              id="loginIdentifier"
              name="loginIdentifier"
              placeholder="you@example.com or Username"
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

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="forgot-inline" onClick={() => navigate('/forgot-password')}>Forgot password?</button>
            </div>

            <button type="submit" className="primary-btn">Log In</button>

            <div className="divider"><span>or</span></div>

            <div id="googleSignInButton" className="google-container"></div>

            {error && <div className="msg error">{error}</div>}
            {success && <div className="msg success">{success}</div>}

            <div className="register-line">
              <span className="register-text">Don't have an account?</span>
              <button type="button" className="tab cta" onClick={() => navigate('/register')}>CREATE ONE NOW</button>
            </div>
          </form>

          <ToastContainer />
        </div>

        <div className="right" aria-hidden="true">
          <div className="art"></div>
        </div>
      </div>
    </div>
  );
}