"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db, isDemoMode } from "@/lib/firebase";
import { FaStar } from "react-icons/fa";
import { motion } from "framer-motion";

const Feedback: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return alert("Please select a rating");

    setSubmitting(true);
    try {
      if (isDemoMode) {
        const existing = JSON.parse(localStorage.getItem("temple_demo_feedback") || "[]");
        localStorage.setItem("temple_demo_feedback", JSON.stringify([{
          id: Date.now(),
          userId: user!.uid,
          userName: user!.displayName,
          rating,
          message,
          timestamp: new Date()
        }, ...existing]));
      } else {
        await addDoc(collection(db, "feedback"), {
          userId: user!.uid,
          userName: user!.displayName,
          rating,
          message,
          timestamp: Timestamp.now()
        });
      }
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      alert("Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="feedback-done glass">
        <h3>Thank you for your feedback!</h3>
        <p>మీ అమూల్యమైన అభిప్రాయానికి ధన్యవాదాలు.</p>
        <button onClick={() => setSubmitted(false)} className="btn-text">Send another</button>
      </div>
    );
  }

  return (
    <div className="feedback-container glass fade-in">
      <h3>{t('feedback')}</h3>
      <form onSubmit={handleSubmit}>
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`star ${star <= (hover || rating) ? 'on' : 'off'}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
            >
              <FaStar />
            </button>
          ))}
        </div>
        
        <textarea 
          placeholder={t('description')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : t('submit')}
        </button>
      </form>

      <style jsx>{`
        .feedback-container { padding: 30px; margin-top: 40px; }
        .star-rating { display: flex; gap: 8px; margin-bottom: 20px; font-size: 2rem; justify-content: center; }
        .star { background: none; border: none; cursor: pointer; transition: color 0.15s; }
        .star.on { color: var(--primary); }
        .star.off { color: #ccc; }
        textarea { width: 100%; min-height: 100px; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; margin-bottom: 20px; }
        .feedback-done { padding: 40px; text-align: center; }
      `}</style>
    </div>
  );
};

export default Feedback;
