import React, { useState } from "react";
import "./AuthPage.css";
import logo from "../assets/logo.png";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      alert("✅ Google Sign-In Successful!");
      navigate("/dashboard");
    } catch (error) {
      alert("❌ Google Sign-In Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target;
    const email = form.email?.value;
    const password = form.password?.value;

    try {
      if (isLogin) {
        const response = await api.post("auth/login/", {
          username: email,
          password: password,
        });
        alert("✅ Login Successful!");
        navigate("/dashboard");
      } else {
        const firstName = form.firstName?.value;
        const lastName = form.lastName?.value;
        const username = form.username?.value;
        const confirmPassword = form.confirmPassword?.value;

        if (password !== confirmPassword) {
          alert("⚠ Passwords do not match!");
          return;
        }

        const response = await api.post("auth/register/", {
          username,
          email,
          password,
          firstName,
          lastName,
        });

        if (response.status === 201) {
          alert("🎉 Account Created Successfully!");
          setIsLogin(true);
        }
      }
    } catch (error) {
      alert("❌ " + (error.response?.data?.error || "Request failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" id="authContainer">
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

      <p className="subtitle">The all-in-one remote work collaboration platform</p>

      {isLogin ? (
        <form onSubmit={handleSubmit}>
          <div className="form-title">Login to your account</div>
          <label>Email or Username</label>
          <input type="text" name="email" placeholder="example@gmail.com" required />
          <label>Password</label>
          <input type="password" name="password" required />

          <Link to="/forgot-password" className="forgot-password">
            Forgot Password?
          </Link>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "LOG IN"}
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
              alt="Google"
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
              <input type="text" name="firstName" required />
            </div>
            <div className="input-group">
              <label>Last Name</label>
              <input type="text" name="lastName" required />
            </div>
          </div>
          <label>Username</label>
          <input type="text" name="username" required />
          <label>Email</label>
          <input type="email" name="email" required />
          <label>Password</label>
          <input type="password" name="password" required />
          <label>Confirm Password</label>
          <input type="password" name="confirmPassword" required />
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "CREATE ACCOUNT"}
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
              alt="Google"
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
