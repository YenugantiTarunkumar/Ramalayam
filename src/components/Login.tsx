"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { FcGoogle } from "react-icons/fc";
import { motion } from "framer-motion";

const Login: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail } = useAuth();
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "en" ? "te" : "en");
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const safeEmail = email.trim().toLowerCase();
    try {
      if (isLogin) {
        await loginWithEmail(safeEmail, pass);
      } else {
        await signUpWithEmail(name, safeEmail, pass);
      }
    } catch (error: any) {
      if (error.message.includes('user-not-found')) {
        alert("Account not found. Please sign up first.");
      } else if (error.message.includes('in-use')) {
        alert("Email already registered. Please log in.");
      } else {
        alert("Authentication failed: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass login-card"
        key={isLogin ? "login" : "signup"}
      >
        <div className="language-toggle">
          <button onClick={toggleLanguage} className="btn-text lang-btn">
            {i18n.language === "en" ? "తెలుగు" : "English"}
          </button>
        </div>
        
        <h1 className="text-saffron-gradient">{t('appName')}</h1>
        <p className="subtitle">{isLogin ? t('welcome') : "Create an Account"}</p>
        
        <form className="email-login-form" onSubmit={handleEmailAuth}>
          {!isLogin && (
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                required={!isLogin} 
              />
            </div>
          )}
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="input-group">
            <input 
              type="password" 
              placeholder="Password" 
              value={pass} 
              onChange={(e) => setPass(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? "Processing..." : (isLogin ? t('login') : "Sign Up")}
          </button>
        </form>
        
        <div className="auth-switch">
          <button type="button" className="btn-text" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
          </button>
        </div>

        <div className="divider">
          <span>OR</span>
        </div>
        
        <div className="login-options">
          <button onClick={loginWithGoogle} className="btn-google">
            <FcGoogle className="icon" />
            <span>{t('googleLogin')}</span>
          </button>
        </div>
      </motion.div>

      <style jsx>{`
        .login-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fffcf9 0%, #fff0e0 100%);
          padding: 20px;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 40px;
          text-align: center;
          position: relative;
        }
        .language-toggle {
          position: absolute;
          top: 15px;
          right: 15px;
        }
        .lang-btn {
          font-size: 0.85rem;
        }
        .btn-text {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 8px;
        }
        .subtitle {
          color: var(--text-muted);
          margin-bottom: 25px;
        }
        .email-login-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .input-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: var(--radius-sm);
        }
        .auth-switch {
          margin-top: 15px;
          font-size: 0.9rem;
        }
        .login-options {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .btn-google {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: white;
          border: 1px solid #ddd;
          padding: 12px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-google:hover {
          background: #f8f8f8;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .icon {
          font-size: 1.5rem;
        }
        .divider {
          margin: 20px 0;
          position: relative;
          text-align: center;
        }
        .divider::before, .divider::after {
          content: "";
          position: absolute;
          top: 50%;
          width: 40%;
          height: 1px;
          background: #ddd;
        }
        .divider::before { left: 0; }
        .divider::after { right: 0; }
        .divider span {
          background: transparent;
          padding: 0 10px;
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        .full-width {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default Login;
