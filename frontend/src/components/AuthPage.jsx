import React, { useState } from "react";
import "./AuthPage.css";
import logo from "../assets/logo.png";
import { auth, googleProvider } from "../firebase";
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      alert("✅ Google Sign-In Successful!");
    } catch (error) {
      console.error(error);
      alert("❌ Google Sign-In Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const email = e.target.email?.value;
    const password = e.target.password?.value;

    try {
      if (isLogin) {
        // ---- LOGIN ----
        await signInWithEmailAndPassword(auth, email, password);
        alert("✅ Login Successful!");
      } else {
        // ---- REGISTER ----
        const firstName = e.target.firstName?.value;
        const lastName = e.target.lastName?.value;
        const username = e.target.username?.value;
        const confirmPassword = e.target.confirmPassword?.value;

        if (!/^[A-Za-z]+$/.test(firstName) || !/^[A-Za-z]+$/.test(lastName)) {
          alert("⚠ First name and last name must contain only letters.");
          return;
        }

        if (password !== confirmPassword) {
          alert("⚠ Passwords do not match!");
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        await updateProfile(userCredential.user, {
          displayName: username,
        });

        alert(`🎉 Account Created Successfully! Welcome, ${username}`);
        setIsLogin(true);
      }
    } catch (error) {
      alert("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" id="authContainer">
      {/* --- LOGO + TITLE --- */}
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

      <p className="subtitle">
        The all-in-one remote work collaboration platform
      </p>

      {/* --- FORM --- */}
      {isLogin ? (
        <form onSubmit={handleSubmit}>
          <div className="form-title">Login to your account</div>

          <label>Email or Username</label>
          <input
            type="text"
            name="email"
            placeholder="naitik@example.com or Naitik"
            required
          />

          <label>Password</label>
          <input type="password" name="password" required />

          <p className="forgot-password">Forgot Password?</p>

          <button type="submit" disabled={loading}>
            {loading ? <div className="spinner"></div> : "LOG IN"}
          </button>

          <div className="divider">or</div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="google-btn"
            disabled={loading}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
            />
            Sign in with Google
          </button>

          <p className="switch-text">
            Don’t have an account yet?{" "}
            <span className="link" onClick={() => setIsLogin(false)}>
              CREATE NEW ONE
            </span>
          </p>
        </form>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-title">Create your account</div>

          <div className="name-row">
            <div className="input-group">
              <label>First Name</label>
              <input type="text" name="firstName" placeholder="Naitik" required />
            </div>
            <div className="input-group">
              <label>Last Name</label>
              <input type="text" name="lastName" placeholder="Patel" required />
            </div>
          </div>

          <label>Username</label>
          <input type="text" name="username" placeholder="Naitik" required />

          <label>Email</label>
          <input type="email" name="email" placeholder="naitik@example.com" required />

          <label>Password</label>
          <input type="password" name="password" required />

          <label>Confirm Password</label>
          <input type="password" name="confirmPassword" required />

          <button type="submit" disabled={loading}>
            {loading ? <div className="spinner"></div> : "CREATE ACCOUNT"}
          </button>

          <div className="divider">or</div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="google-btn"
            disabled={loading}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
            />
            Sign up with Google
          </button>

          <p className="switch-text">
            Already have an account?{" "}
            <span className="link" onClick={() => setIsLogin(true)}>
              LOGIN HERE
            </span>
          </p>
        </form>
      )}
    </div>
  );
};

export default AuthPage;
