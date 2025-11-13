import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaQuestionCircle, FaEnvelope, FaBook, FaLifeRing } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../../services/api';
import './help-support.css';

export default function HelpSupport() {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openDocumentation = () => {
    toast.info('Documentation portal coming soon.');
  };

  const openFaq = () => {
    toast.info('FAQs will be published shortly.');
  };

  const sendEmail = () => {
    window.location.href = 'mailto:convergework23@gmail.com';
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) {
      toast.warn('Please enter feedback before sending.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('notifications/feedback/', {
        message: feedback.trim(),
        context_url: window.location.href,
      });
      toast.success('Feedback sent. Thank you!');
      setFeedback('');
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate('/login');
        return;
      }
      toast.error(err?.response?.data?.error || 'Failed to send feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="help-page">
      <div className="help-card compact">
        <div className="help-header">
          <FaLifeRing className="help-icon" />
          <h2>Help &amp; Support</h2>
        </div>

        <p className="intro-text">
          Need assistance? Explore resources or contact the team to resolve issues quickly.
        </p>

        <div className="help-sections">
          <div className="help-section">
            <FaBook className="icon" />
            <div className="section-body">
              <div className="section-title">Documentation</div>
              <div className="section-desc">
                Explore walkthroughs and onboarding material for every module in Converge.
              </div>
              <div className="section-actions">
                <button type="button" className="link-btn" onClick={openDocumentation}>
                  View Docs
                </button>
              </div>
            </div>
          </div>

          <div className="help-section">
            <FaEnvelope className="icon" />
            <div className="section-body">
              <div className="section-title">Contact Support</div>
              <div className="section-desc">
                Reach out to the support desk for personalised help on urgent blockers.
              </div>
              <div className="section-actions">
                <button type="button" className="link-btn" onClick={sendEmail}>
                  Send Email
                </button>
              </div>
            </div>
          </div>

          <div className="help-section">
            <FaQuestionCircle className="icon" />
            <div className="section-body">
              <div className="section-title">FAQs</div>
              <div className="section-desc">
                Browse answers to the most common questions raised by the community.
              </div>
              <div className="section-actions">
                <button type="button" className="link-btn" onClick={openFaq}>
                  View FAQs
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="feedback-box">
          <div className="feedback-head">
            <h3>Submit Feedback</h3>
            <div className="feedback-note">
              Share ideas, report bugs, or suggest improvements to make Converge better.
            </div>
          </div>
          <textarea
            placeholder="Type your feedback here..."
            className="feedback-text"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
          />
          <div className="feedback-actions">
            <button
              type="button"
              className="submit-btn"
              onClick={submitFeedback}
              disabled={submitting}
            >
              {submitting ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        </div>

        <div className="help-footer">
          <button type="button" className="back-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
      <ToastContainer position="bottom-right" />
    </div>
  );
}

