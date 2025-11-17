import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api, { setAuthToken } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const GOOGLE_CLIENT_ID = "93962274226-t1ngpdrcblqqiqmvkpji6eq7h0vvhovl.apps.googleusercontent.com";


export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
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
  const [googleLoaded, setGoogleLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleLoaded(true);
    document.body.appendChild(script);

    return () => {
      try { document.body.removeChild(script); } catch (e) {}
    };
  }, []);

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

      //Send OTP
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
    <div className="loginpage">
      <div className="auth-card">
        <div className="left">
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

          <form id="registerForm" onSubmit={handleSubmit} className="login-form">
            <div className="form-title">Create your account</div>

            <label htmlFor="firstName">First Name</label>
            <input type="text" id="firstName" value={form.firstName} onChange={handleChange} required disabled={otpSent} />

            <label htmlFor="lastName">Last Name</label>
            <input type="text" id="lastName" value={form.lastName} onChange={handleChange} required disabled={otpSent} />

            <label htmlFor="username">Username</label>
            <input type="text" id="username" value={form.username} onChange={handleChange} required disabled={otpSent} />

            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={form.email} onChange={handleChange} required disabled={otpSent} />

            <label htmlFor="password">Password</label>
            <input type="password" id="password" value={form.password} onChange={handleChange} required disabled={otpSent} />

            <label htmlFor="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" value={form.confirmPassword} onChange={handleChange} required disabled={otpSent} />

            {otpSent && (
              <>
                <label htmlFor="otp">Enter OTP</label>
                <input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required />
              </>
            )}

            <button type="submit" className="primary-btn">{otpSent ? 'Verify & Register' : 'Send OTP'}</button>

            <div className="divider"><span>or</span></div>
            <div id="googleSignInButton" className="google-container"></div>

            {error && <div className="msg error">{error}</div>}
            {success && <div className="msg success">{success}</div>}

            <div className="register-line">
              <span className="register-text">Already have an account?</span>
              <button type="button" className="tab cta-bold" onClick={() => navigate('/login')}>LOGIN</button>
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