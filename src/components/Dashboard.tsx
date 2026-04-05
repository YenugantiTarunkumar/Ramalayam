"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { calculateBalance, getTransactions, Transaction } from "@/services/transactionService";
import { generateTransactionReport } from "@/utils/pdfGenerator";
import { motion, AnimatePresence } from "framer-motion";

// Components
import TransactionForm from "./TransactionForm";
import TransactionLedger from "./TransactionLedger";
import AdminPanel from "./AdminPanel";
import Feedback from "./Feedback";
import PujaBrowser from "./PujaBrowser";
import AnnouncementsBoard from "./AnnouncementsBoard";
import CashWorkspace from "./CashWorkspace";
import { isDemoMode } from "@/lib/firebase";

const Dashboard: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [balance, setBalance] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'ledger' | 'puja' | 'admin' | 'feedback' | 'cash_workspace'>('home');
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });

  useEffect(() => {
    const fetchBalance = async () => {
      const b = await calculateBalance();
      setBalance(b);
    };
    fetchBalance();

    const unsubscribe = getTransactions((all) => {
      setAllTransactions(all);
    });

    return () => unsubscribe();
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "en" ? "te" : "en");
  };

  const handleGenerateReport = () => {
    generateTransactionReport(
      allTransactions,
      new Date(dateRange.start),
      new Date(dateRange.end),
      "Temple Financial Report"
    );
  };

  return (
    <div className="dashboard-container">
      {isDemoMode && (
        <motion.div 
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="demo-banner"
        >
          <span>🚀 <b>Demo Mode Active:</b> Your data is securely saved in your browser's local storage.</span>
        </motion.div>
      )}

      <header className="glass">
        <div className="header-content">
          <div className="brand">
            <h1 className="text-saffron-gradient">{t('appName')}</h1>
          </div>
          
          <nav className="main-nav">
            <button className={activeTab === 'home' ? 'active' : ''} onClick={() => setActiveTab('home')}>{t('dashboard')}</button>
            <button className={activeTab === 'ledger' ? 'active' : ''} onClick={() => setActiveTab('ledger')}>{t('ledger')}</button>
            <button className={activeTab === 'puja' ? 'active' : ''} onClick={() => setActiveTab('puja')}>Pujas</button>
            {role === 'admin' && (
              <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>{t('adminPanel')}</button>
            )}
            <button className={activeTab === 'feedback' ? 'active' : ''} onClick={() => setActiveTab('feedback')}>{t('feedback')}</button>
          </nav>

          <div className="header-actions">
            <button onClick={toggleLanguage} className="btn-lang">
              {i18n.language === "en" ? "తెలుగు" : "English"}
            </button>
            <div className="user-profile">
              <span className="user-name">{user?.displayName?.split(' ')[0]}</span>
              <span className="user-role badge">{t(role || 'viewer')}</span>
              <button onClick={logout} className="btn-logout" title={t('logout')}>🚪 Logout</button>
            </div>
          </div>
        </div>
      </header>

      <main className="fade-in">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Summary Cards */}
              <div className="summary-grid">
                <div className="glass-dark balance-card">
                  <h3>{t('totalBalance')}</h3>
                  <h2 className="amount">₹ {balance.toLocaleString()}</h2>
                  <p className="status-msg">Updated just now</p>
                </div>
                
                <div className="glass quick-actions-card">
                  <h3>{t('quickActions')}</h3>
                  <div className="action-buttons">
                    {(role === 'admin' || role === 'committee') && (
                      <button className="btn-secondary" onClick={() => setActiveTab('cash_workspace')}>Cash Workspace</button>
                    )}
                    <button className="btn-primary" onClick={() => setShowForm(true)}>Donate</button>
                    <button className="btn-primary" onClick={() => setActiveTab('puja')}>Pujas</button>
                  </div>
                </div>
              </div>

              {/* Announcements Section */}
              <AnnouncementsBoard />

              {/* Reports Quick Access */}
              <section className="reports-preview glass">
                <div className="report-header">
                  <h3>{t('reports')}</h3>
                  <div className="report-controls">
                    <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
                    <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
                    <button onClick={handleGenerateReport} className="btn-primary">{t('generateReport')}</button>
                  </div>
                </div>
              </section>

              {/* Recent Activity Mini View */}
              <div className="recent-activity-container">
                <TransactionLedger />
              </div>
            </motion.div>
          )}

          {activeTab === 'ledger' && <motion.div key="ledger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><TransactionLedger /></motion.div>}
          {activeTab === 'puja' && <motion.div key="puja" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><PujaBrowser /></motion.div>}
          {activeTab === 'cash_workspace' && <motion.div key="cash_workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CashWorkspace /></motion.div>}
          {activeTab === 'admin' && <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AdminPanel /></motion.div>}
          {activeTab === 'feedback' && <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><Feedback /></motion.div>}
        </AnimatePresence>
      </main>

      {/* Forms Modal */}
      {showForm && (
        <TransactionForm 
          onSuccess={() => { setShowForm(false); window.location.reload(); }} 
          onCancel={() => setShowForm(false)} 
        />
      )}

      <style jsx>{`
        .dashboard-container { min-height: 100vh; padding: 20px; max-width: 1200px; margin: 0 auto; position: relative; }
        .demo-banner {
          position: fixed;
          top: 0; left: 0; right: 0;
          background: linear-gradient(90deg, #FF9933, #FFCC33);
          color: white;
          text-align: center;
          padding: 8px;
          font-size: 0.85rem;
          z-index: 1001;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        header { padding: 15px 30px; margin-bottom: 30px; position: sticky; top: 40px; z-index: 100; border-radius: var(--radius-md); }
        .header-content { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
        .main-nav { display: flex; gap: 10px; }
        .main-nav button { padding: 8px 16px; border: none; background: none; font-weight: 600; color: var(--text-muted); cursor: pointer; border-radius: var(--radius-sm); transition: all 0.2s; }
        .main-nav button.active { background: rgba(255, 153, 51, 0.1); color: var(--primary); }
        .header-actions { display: flex; align-items: center; gap: 20px; }
        .user-profile { display: flex; align-items: center; gap: 10px; background: white; padding: 6px 12px; border-radius: 30px; box-shadow: var(--shadow-soft); }
        .user-name { font-weight: 700; color: var(--text-main); font-size: 0.9rem; }
        .btn-logout { cursor: pointer; border: none; background: none; font-size: 0.85rem; font-weight: 600; color: var(--error); margin-left: 10px; }
        .btn-logout:hover { text-decoration: underline; }
        .btn-lang { background: none; border: 1px solid var(--primary); color: var(--primary); padding: 4px 10px; border-radius: 4px; font-weight: 600; cursor: pointer; }
        
        .summary-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; margin-bottom: 30px; }
        .balance-card { padding: 40px; text-align: center; display: flex; flex-direction: column; justify-content: center; }
        .quick-actions-card { padding: 30px; }
        .action-buttons { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
        .btn-secondary { background: white; color: var(--primary); border: 1px solid var(--primary); padding: 12px 24px; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-secondary:hover { background: rgba(255,153,51,0.05); }
        .amount { font-size: 3.5rem; margin: 10px 0; color: var(--accent); }
        .status-msg { font-size: 0.8rem; color: var(--text-muted); }

        .reports-preview { padding: 25px; margin-bottom: 30px; }
        .report-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .report-controls { display: flex; gap: 10px; align-items: center; }
        .report-controls input { padding: 8px; border: 1px solid #ddd; border-radius: 6px; }

        @media (max-width: 768px) {
          .summary-grid { grid-template-columns: 1fr; }
          header { padding: 10px 15px; }
          .main-nav { display: none; } /* Mobile sidebar or burger menu would go here */
          .header-content { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
