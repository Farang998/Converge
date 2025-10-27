import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timer, setTimer] = useState(120);
  const navigate = useNavigate();

  useEffect(() => {
    if (step === 'otp' && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  async function requestOtp(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const resp = await api.post('forgot-password/request/', { email });
      setSuccess(resp.data.message || 'OTP sent');
      setStep('otp');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send OTP');
    }
  }

  async function validateOtp(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const resp = await api.post('validate-otp/', { email, otp, purpose: 'password_reset' });
      if (resp.data.success) {
        setStep('reset');
        setSuccess('OTP validated. You may set a new password.');
      } else {
        setError(resp.data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to validate OTP');
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const resp = await api.post('reset-password/', { email, otp, new_password: newPassword });
      setSuccess(resp.data.message || 'Password reset successful');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to reset password');
    }
  }

  function resendOtp() {
    setTimer(120);
    requestOtp();
  }

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        {step === 'email' && (
          <form id="forgotEmailForm" onSubmit={requestOtp}>
            <h2 className="form-title">Forgot Password</h2>
            <p className="form-description">Enter your account email to receive an OTP.</p>
            <input
              type="email"
              className="form-input"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="form-button">Send OTP</button>
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}
          </form>
        )}

        {step === 'otp' && (
          <form id="forgotOtpForm" onSubmit={validateOtp}>
            <div className="back-arrow" onClick={() => setStep('email')}>
              ← Back
            </div>
            <h2 className="form-title">Enter OTP</h2>
            <p className="form-description">Check your email for the OTP.</p>
            <input
              type="text"
              className="form-input"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <button type="submit" className="form-button">Validate OTP</button>
            <div className="timer">Time remaining: {Math.floor(timer / 60)}:{timer % 60}</div>
            {timer === 0 && (
              <button type="button" className="form-button" onClick={resendOtp}>
                Resend OTP
              </button>
            )}
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}
          </form>
        )}

        {step === 'reset' && (
          <form id="resetForm" onSubmit={resetPassword}>
            <h2 className="form-title">Set New Password</h2>
            <p className="form-description">Enter and confirm your new password.</p>
            <input
              type="password"
              className="form-input"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              type="password"
              className="form-input"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              className="form-button"
              disabled={newPassword !== confirmPassword}
            >
              Reset Password
            </button>
            {newPassword !== confirmPassword && (
              <div className="form-error">Passwords do not match</div>
            )}
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
