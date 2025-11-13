import React from "react";
import "./HelpSupport.css";
import { FaQuestionCircle, FaEnvelope, FaBook, FaLifeRing } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function HelpSupport() {
  const navigate = useNavigate();

  const sendEmail = () => {
    window.location.href = "mailto:convergework23@gmail.com";
  };

  const openPlaceholder = (url = "#") => {
    if (url === "#") {
      window.alert("Replace with real Documentation/FAQ link.");
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="help-page">
      <div className="help-card compact">
        <div className="help-header">
          <FaLifeRing className="help-icon" />
          <h2>Help & Support</h2>
        </div>

        <p className="intro-text">
          Need assistance? We're here to help you resolve issues, learn features, and improve your experience.
        </p>
        
        <div className="help-sections">
          <div className="help-section">
            <FaBook className="icon" />
            <div className="section-body">
              <div className="section-title">Documentation</div>
              <div className="section-desc">Explore our user guide and FAQs to understand the platform better.</div>
              <div className="section-actions">
                <button className="link-btn" onClick={() => openPlaceholder("#")}>View Docs</button>
              </div>
            </div>
          </div>

          <div className="help-section">
            <FaEnvelope className="icon" />
            <div className="section-body">
              <div className="section-title">Contact Support</div>
              <div className="section-desc">Can’t find what you need? Reach our support team for personalized help.</div>
              <div className="section-actions">
                <button className="link-btn" onClick={sendEmail}>Send Email</button>
              </div>
            </div>
          </div>

          <div className="help-section">
            <FaQuestionCircle className="icon" />
            <div className="section-body">
              <div className="section-title">FAQs</div>
              <div className="section-desc">Check answers to the most frequently asked questions by our users.</div>
              <div className="section-actions">
                <button className="link-btn" onClick={() => openPlaceholder("#")}>View FAQs</button>
              </div>
            </div>
          </div>
        </div>

        <div className="feedback-box">
          <div className="feedback-head">
            <h3>Submit Feedback</h3>
            <div className="feedback-note">Tell us about your experience or suggest improvements.</div>
          </div>

          <textarea placeholder="Type your feedback here..." className="feedback-text" />

          <div className="feedback-actions">
            <button
              className="submit-btn"
              onClick={() => {
                alert("Feedback sent (placeholder). Implement API call to persist feedback.");
              }}
            >
              Send Feedback
            </button>
          </div>
        </div>
        
        <div className="help-footer">
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
