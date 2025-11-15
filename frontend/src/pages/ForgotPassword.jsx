// import React, { useState, useEffect } from 'react';
// import api from '../services/api';
// import { useNavigate } from 'react-router-dom';
// import './ForgotPassword.css';

// export default function ForgotPassword() {
//   const [step, setStep] = useState('email');
//   const [email, setEmail] = useState('');
//   const [otp, setOtp] = useState('');
//   const [newPassword, setNewPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//   const [timer, setTimer] = useState(120);
//   const navigate = useNavigate();

//   useEffect(() => {
//     if (step === 'otp' && timer > 0) {
//       const interval = setInterval(() => {
//         setTimer((prev) => prev - 1);
//       }, 1000);
//       return () => clearInterval(interval);
//     }
//   }, [step, timer]);

//   async function requestOtp(e) {
//     e.preventDefault();
//     setError('');
//     setSuccess('');
//     try {
//       const resp = await api.post('auth/forgot-password/request/', { email });
//       setSuccess(resp.data.message || 'OTP sent');
//       setStep('otp');
//     } catch (err) {
//       setError(err?.response?.data?.error || 'Failed to send OTP');
//     }
//   }

//   async function validateOtp(e) {
//     e.preventDefault();
//     setError('');
//     setSuccess('');
//     try {
//       const resp = await api.post('auth/validate-otp/', { email, otp, purpose: 'password_reset' });
//       if (resp.data.success) {
//         setStep('reset');
//         setSuccess('OTP validated. You may set a new password.');
//       } else {
//         setError(resp.data.message || 'Invalid OTP');
//       }
//     } catch (err) {
//       setError(err?.response?.data?.message || 'Failed to validate OTP');
//     }
//   }

//   async function resetPassword(e) {
//     e.preventDefault();
//     setError('');
//     setSuccess('');
//     try {
//       const resp = await api.post('auth/reset-password/', { email, otp, new_password: newPassword });
//       setSuccess(resp.data.message || 'Password reset successful');
//       setTimeout(() => navigate('/login'), 1200);
//     } catch (err) {
//       setError(err?.response?.data?.error || 'Failed to reset password');
//     }
//   }

//   function resendOtp() {
//     setTimer(120);
//     requestOtp();
//   }

//   return (
//     <div className="forgot-password-container">
//       <div className="forgot-password-card">
//         {step === 'email' && (
//           <form id="forgotEmailForm" onSubmit={requestOtp}>
//             <h2 className="form-title">Forgot Password</h2>
//             <p className="form-description">Enter your account email to receive an OTP.</p>
//             <input
//               type="email"
//               className="form-input"
//               placeholder="Email Address"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />
//             <button type="submit" className="form-button">Send OTP</button>
//             {error && <div className="form-error">{error}</div>}
//             {success && <div className="form-success">{success}</div>}
//           </form>
//         )}

//         {step === 'otp' && (
//           <form id="forgotOtpForm" onSubmit={validateOtp}>
//             <div className="back-arrow" onClick={() => setStep('email')}>
//               ← Back
//             </div>
//             <h2 className="form-title">Enter OTP</h2>
//             <p className="form-description">Check your email for the OTP.</p>
//             <input
//               type="text"
//               className="form-input"
//               placeholder="Enter OTP"
//               value={otp}
//               onChange={(e) => setOtp(e.target.value)}
//               required
//             />
//             <button type="submit" className="form-button">Validate OTP</button>
//             <div className="timer">Time remaining: {Math.floor(timer / 60)}:{timer % 60}</div>
//             {timer === 0 && (
//               <button type="button" className="form-button" onClick={resendOtp}>
//                 Resend OTP
//               </button>
//             )}
//             {error && <div className="form-error">{error}</div>}
//             {success && <div className="form-success">{success}</div>}
//           </form>
//         )}

//         {step === 'reset' && (
//           <form id="resetForm" onSubmit={resetPassword}>
//             <h2 className="form-title">Set New Password</h2>
//             <p className="form-description">Enter and confirm your new password.</p>
//             <input
//               type="password"
//               className="form-input"
//               placeholder="New Password"
//               value={newPassword}
//               onChange={(e) => setNewPassword(e.target.value)}
//               required
//             />
//             <input
//               type="password"
//               className="form-input"
//               placeholder="Confirm Password"
//               value={confirmPassword}
//               onChange={(e) => setConfirmPassword(e.target.value)}
//               required
//             />
//             <button
//               type="submit"
//               className="form-button"
//               disabled={newPassword !== confirmPassword}
//             >
//               Reset Password
//             </button>
//             {newPassword !== confirmPassword && (
//               <div className="form-error">Passwords do not match</div>
//             )}
//             {error && <div className="form-error">{error}</div>}
//             {success && <div className="form-success">{success}</div>}
//           </form>
//         )}
//       </div>
//     </div>
//   );
// }


import React, { useState, useEffect } from "react";
import "./ForgotPassword.css";
import logo from "../assets/logo.png";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timer, setTimer] = useState(120);
  const navigate = useNavigate();

  useEffect(() => {
    if (step === "otp" && timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  async function requestOtp(e) {
    e.preventDefault();
    setError("");
    try {
      const resp = await api.post("auth/send-otp/", { email, purpose: "password_reset" });
      setSuccess(resp.data.message || "OTP sent!");
      setStep("otp");
    } catch {
      setError("Failed to send OTP.");
    }
  }

  async function validateOtp(e) {
    e.preventDefault();
    setError("");
    try {
      const resp = await api.post("auth/validate-otp/", { email, otp, purpose: "password_reset" });
      if (resp.data.success) {
        setStep("reset");
        setSuccess("OTP validated! Now reset your password.");
      } else setError(resp.data.message);
    } catch {
      setError("Failed to validate OTP.");
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    try {
      await api.post("auth/reset-password/", { email, otp, new_password: newPassword });
      setSuccess("✅ Password reset successful!");
      setTimeout(() => navigate("/"), 1500);
    } catch {
      setError("Failed to reset password.");
    }
  }

  return (
    <div className="forgot-container">
      <div className="forgot-card">
        <div className="logo">
          <img src={logo} alt="logo" />
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

        {step === "email" && (
          <form onSubmit={requestOtp}>
            <h2>Forgot Password?</h2>
            <p className="desc">Enter your email to receive an OTP</p>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit">Send OTP</button>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={validateOtp}>
            <h2>Enter OTP</h2>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <button type="submit">Verify OTP</button>
            <p>Time remaining: {Math.floor(timer / 60)}:{timer % 60}</p>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword}>
            <h2>Reset Password</h2>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button type="submit">Update Password</button>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
