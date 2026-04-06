import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { FcGoogle } from "react-icons/fc";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { motion } from "framer-motion";

const Login: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail } = useAuth();
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass login-card"
        key={isLogin ? "login" : "signup"}
      >
        <div className="language-toggle">
          <button onClick={toggleLanguage} className="btn-text lang-btn">
            {i18n.language === "en" ? "తెలుగు" : "English"}
          </button>
        </div>
        
        <h1 className="text-saffron-gradient">{t('appName')}</h1>
        <p className="subtitle">{isLogin ? t('welcome') : (i18n.language === 'te' ? "ఖాతాను సృష్టించండి" : "Create an Account")}</p>
        
        <form className="email-login-form" onSubmit={handleEmailAuth}>
          {!isLogin && (
            <div className="input-group">
              <input 
                type="text" 
                placeholder={i18n.language === 'te' ? "పూర్తి పేరు" : "Full Name"} 
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
          <div className="input-group pass-group">
            <input 
              type={showPass ? "text" : "password"} 
              placeholder="Password" 
              value={pass} 
              onChange={(e) => setPass(e.target.value)}
              required 
            />
            <button 
              type="button" 
              className="eye-toggle" 
              onClick={() => setShowPass(!showPass)}
              title={t('showPassword')}
            >
              {showPass ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? "..." : (isLogin ? t('login') : (i18n.language === 'te' ? "సైన్ అప్" : "Sign Up"))}
          </button>
        </form>
        
        <div className="auth-switch">
          <button type="button" className="btn-text" onClick={() => setIsLogin(!isLogin)}>
            {isLogin 
              ? (i18n.language === 'te' ? "ఖాతా లేదా? సైన్ అప్ చేయండి" : "Don't have an account? Sign Up") 
              : (i18n.language === 'te' ? "ఇప్పటికే ఖాతా ఉందా? లాగిన్ చేయండి" : "Already have an account? Log In")}
          </button>
        </div>

        <div className="divider">
          <span>{i18n.language === 'te' ? "లేదా" : "OR"}</span>
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
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          z-index: 1;
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 40px;
          text-align: center;
          position: relative;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }
        .language-toggle {
          position: absolute;
          top: 15px;
          right: 15px;
        }
        .lang-btn {
          font-size: 0.9rem;
          color: var(--primary);
        }
        .btn-text {
          background: none;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }
        .btn-text:hover { opacity: 0.8; }
        h1 {
          font-size: 2.2rem;
          margin-bottom: 8px;
        }
        .subtitle {
          color: #e0e0e0;
          margin-bottom: 25px;
          font-size: 1rem;
        }
        .email-login-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .input-group {
          position: relative;
        }
        .input-group input {
          width: 100%;
          padding: 14px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #ddd;
          border-radius: var(--radius-sm);
          font-size: 1rem;
          color: #333;
        }
        .pass-group input {
          padding-right: 45px;
        }
        .eye-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #666;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .auth-switch {
          margin-top: 20px;
          font-size: 0.95rem;
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
          border: none;
          padding: 12px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #333;
        }
        .btn-google:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .icon {
          font-size: 1.5rem;
        }
        .divider {
          margin: 25px 0;
          position: relative;
          text-align: center;
        }
        .divider::before, .divider::after {
          content: "";
          position: absolute;
          top: 50%;
          width: 42%;
          height: 1px;
          background: rgba(255, 255, 255, 0.2);
        }
        .divider::before { left: 0; }
        .divider::after { right: 0; }
        .divider span {
          padding: 0 10px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
        }
        .full-width {
          width: 100%;
        }
      `}</style>
    </div>
  );
};


export default Login;
