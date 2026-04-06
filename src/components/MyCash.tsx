"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTransactions, calculatePersonalBalance, Transaction, updateTransactionStatus } from "@/services/transactionService";
import { motion, AnimatePresence } from "framer-motion";
import { FaWallet, FaHandHoldingUsd, FaHistory, FaCheckCircle, FaClock, FaExclamationTriangle, FaHandPointer } from "react-icons/fa";

const MyCash: React.FC = () => {
  const { user } = useAuth();
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

  const handleConfirmReimbursement = async (id: string, confirmed: boolean) => {
    try {
      await updateTransactionStatus(id, confirmed ? 'received_confirmed' : 'rejected', user?.uid);
    } catch (err) {
      console.error(err);
      alert("Action failed");
    }
  };

  const myTransactions = allTransactions.filter(t => 
    (t.type === 'allocation' && t.allocatedTo === user?.uid) || 
    (t.type === 'cash_out' && t.submittedBy === user?.uid)
  );

  const pendingReimbursements = myTransactions.filter(t => 
    t.type === 'allocation' && t.allocatedTo === user?.uid && t.status === 'settled_reimbursement'
  );

  const isOverspent = stats.balanceLeft < 0;

  return (
    <div className="my-cash-container fade-in">
      <div className={`mc-header glass ${isOverspent ? 'danger-border' : ''}`}>
        <h2>My Cash Workspace</h2>
        <p>Personal fund tracking and accountability</p>
        {isOverspent && (
          <div className="overspent-alert">
            <FaExclamationTriangle /> <span>You have spent more than your allocated limit!</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {pendingReimbursements.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="reimbursement-prompt glass"
          >
            <div className="rp-icon"><FaHandPointer /></div>
            <div className="rp-content">
              <h3>Confirm Receipt</h3>
              <p>Admin has sent ₹{pendingReimbursements[0].amount} for your extra expenses. Did you receive the cash?</p>
              <div className="rp-actions">
                <button className="btn-success" onClick={() => handleConfirmReimbursement(pendingReimbursements[0].id!, true)}>Yes, Received</button>
                <button className="btn-danger-text" onClick={() => handleConfirmReimbursement(pendingReimbursements[0].id!, false)}>No, Not Received</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

        <motion.div whileHover={{ y: -5 }} className={`stat-card glass ${isOverspent ? 'danger' : 'accent'}`}>
          <FaWallet className="stat-icon" />
          <div className="stat-content">
            <label>{isOverspent ? 'Extra Spent' : 'Balance Left'}</label>
            <span className={`stat-value ${isOverspent ? 'text-danger' : 'text-accent'}`}>
              ₹ {Math.abs(stats.balanceLeft).toLocaleString()}
            </span>
            <small>{isOverspent ? 'Needs collection from Admin' : 'Includes pending approvals'}</small>
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
        .mc-header { padding: 25px; border-radius: 12px; margin-bottom: 30px; border-left: 5px solid var(--primary); transition: all 0.3s; }
        .mc-header.danger-border { border-left-color: var(--error); background: rgba(255, 82, 82, 0.05); }
        .mc-header h2 { color: var(--primary); margin-bottom: 5px; }
        .mc-header.danger-border h2 { color: var(--error); }
        .mc-header p { color: var(--text-muted); font-size: 0.95rem; }
        
        .overspent-alert { display: flex; align-items: center; gap: 10px; color: var(--error); font-weight: 700; margin-top: 10px; font-size: 0.9rem; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.7; } 100% { opacity: 1; } }

        .reimbursement-prompt { display: flex; align-items: center; gap: 20px; padding: 20px; border-radius: 12px; background: #fffde7; border: 2px dashed #fbc02d; margin-bottom: 30px; }
        .rp-icon { font-size: 2rem; color: #fbc02d; }
        .rp-content h3 { margin: 0 0 5px 0; color: #f57f17; }
        .rp-content p { margin: 0 0 15px 0; font-size: 0.95rem; }
        .rp-actions { display: flex; gap: 15px; }
        .btn-danger-text { background: none; border: none; color: var(--error); cursor: pointer; font-weight: 600; text-decoration: underline; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 15px; }
        .stat-card.danger { background: #ffebee; border: 1px solid #ffcdd2; }
        .stat-icon { font-size: 2rem; color: var(--primary); opacity: 0.8; }
        .stat-card.danger .stat-icon { color: var(--error); }
        .stat-content label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-muted); margin-bottom: 5px; }
        .stat-value { display: block; font-size: 1.4rem; font-weight: bold; color: var(--text-main); }
        .stat-value.text-danger { color: var(--error); }
        
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
