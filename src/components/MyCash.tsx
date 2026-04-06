"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTransactions, calculatePersonalBalance, Transaction } from "@/services/transactionService";
import { motion } from "framer-motion";
import { FaWallet, FaHandHoldingUsd, FaHistory, FaCheckCircle, FaClock } from "react-icons/fa";

const MyCash: React.FC = () => {
  const { user, role } = useAuth();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    allocated: 0,
    pending: 0,
    balanceLeft: 0,
    finalBalance: 0
  });

  useEffect(() => {
    const unsubscribe = getTransactions((all) => {
      setAllTransactions(all);
      if (user) {
        setStats(calculatePersonalBalance(user.uid, all));
      }
    });
    return () => unsubscribe();
  }, [user]);

  const myTransactions = allTransactions.filter(t => 
    (t.type === 'allocation' && t.allocatedTo === user?.uid) || 
    (t.type === 'cash_out' && t.submittedBy === user?.uid)
  );

  return (
    <div className="my-cash-container fade-in">
      <div className="mc-header glass">
        <h2>My Cash Workspace</h2>
        <p>Personal fund tracking and accountability</p>
      </div>

      <div className="stats-grid">
        <motion.div whileHover={{ y: -5 }} className="stat-card glass primary">
          <FaHandHoldingUsd className="stat-icon" />
          <div className="stat-content">
            <label>Allocated Money</label>
            <span className="stat-value">₹ {stats.allocated.toLocaleString()}</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="stat-card glass warning">
          <FaClock className="stat-icon" />
          <div className="stat-content">
            <label>Pending Expenses</label>
            <span className="stat-value text-warning">₹ {stats.pending.toLocaleString()}</span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="stat-card glass accent">
          <FaWallet className="stat-icon" />
          <div className="stat-content">
            <label>Balance Left</label>
            <span className="stat-value text-accent">₹ {stats.balanceLeft.toLocaleString()}</span>
            <small>Includes pending approvals</small>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="stat-card glass success">
          <FaCheckCircle className="stat-icon" />
          <div className="stat-content">
            <label>Final Balance</label>
            <span className="stat-value text-success">₹ {stats.finalBalance.toLocaleString()}</span>
            <small>After all approvals</small>
          </div>
        </motion.div>
      </div>

      <div className="history-section">
        <h3><FaHistory /> Transaction History</h3>
        <div className="history-list">
          {myTransactions.map(t => (
            <div key={t.id} className={`history-card glass ${t.type}`}>
              <div className="hc-left">
                <span className={`hc-type-badge ${t.type}`}>{t.type.replace('_', ' ')}</span>
                <p className="hc-desc">{t.description}</p>
                <span className="hc-date">{t.timestamp.toLocaleString()}</span>
              </div>
              <div className="hc-right">
                <span className="hc-amount">
                  {t.type === 'allocation' ? '+' : '-'} ₹ {t.amount}
                </span>
                <span className={`badge ${t.status}`}>{t.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          ))}
          {myTransactions.length === 0 && (
            <p className="empty-msg">No personal transactions found yet.</p>
          )}
        </div>
      </div>

      <style jsx>{`
        .my-cash-container { padding-bottom: 50px; }
        .mc-header { padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 5px solid var(--primary); }
        .mc-header h2 { color: var(--primary); margin-bottom: 5px; }
        .mc-header p { color: var(--text-muted); font-size: 0.95rem; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; }
        .stat-icon { font-size: 2rem; color: var(--primary); opacity: 0.8; }
        .stat-content label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 5px; }
        .stat-value { display: block; font-size: 1.4rem; font-weight: bold; color: var(--text-main); }
        .stat-card small { font-size: 0.75rem; color: #999; }
        
        .stat-card.warning .stat-icon { color: var(--warning); }
        .stat-card.accent .stat-icon { color: var(--accent); }
        .stat-card.success .stat-icon { color: var(--success); }
        
        .history-section h3 { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; color: var(--text-main); }
        .history-list { display: flex; flex-direction: column; gap: 12px; }
        .history-card { padding: 15px 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid #ccc; }
        .history-card.allocation { border-left-color: var(--success); }
        .history-card.cash_out { border-left-color: var(--error); }
        
        .hc-type-badge { font-size: 0.7rem; text-transform: uppercase; padding: 2px 8px; border-radius: 10px; font-weight: bold; margin-bottom: 5px; display: inline-block;}
        .hc-type-badge.allocation { background: #e8f5e9; color: var(--success); }
        .hc-type-badge.cash_out { background: #ffebee; color: var(--error); }
        
        .hc-desc { font-weight: 500; color: var(--text-main); margin-bottom: 4px; }
        .hc-date { font-size: 0.75rem; color: var(--text-muted); }
        
        .hc-right { text-align: right; display: flex; flex-direction: column; gap: 5px; }
        .hc-amount { font-size: 1.1rem; font-weight: bold; color: var(--text-main); }
        
        .badge { font-size: 0.7rem; text-transform: uppercase; padding: 3px 10px; border-radius: 12px; font-weight: bold; }
        .badge.approved, .badge.received_confirmed { background: #e8f5e9; color: var(--success); }
        .badge.pending_submission, .badge.pending_settlement { background: #fff3e0; color: var(--warning); }
        .badge.submitted_to_admin, .badge.settled_by_admin { background: #e3f2fd; color: #1976d2; }
        
        .empty-msg { text-align: center; color: var(--text-muted); padding: 40px; }
      `}</style>
    </div>
  );
};

export default MyCash;
