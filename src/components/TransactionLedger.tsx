"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { getTransactions, deleteTransaction, Transaction } from "@/services/transactionService";
import { motion, AnimatePresence } from "framer-motion";

const TransactionLedger: React.FC = () => {
  const { role, user } = useAuth();
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<{ type: string; category: string }>({ type: 'all', category: 'all' });

  useEffect(() => {
    const unsubscribe = getTransactions((all) => {
      // Only show approved for viewers, or all for committee/admin
      if (role === 'viewer') {
        setTransactions(all.filter(t => t.status === 'approved'));
      } else {
        setTransactions(all);
      }
    });

    return () => unsubscribe();
  }, [role]);

  const filtered = transactions.filter(tr => {
    const typeMatch = filter.type === 'all' || tr.type === filter.type;
    const catMatch = filter.category === 'all' || tr.category === filter.category;
    return typeMatch && catMatch;
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to completely delete this transaction?")) {
      await deleteTransaction(id);
    }
  };


  return (
    <div className="ledger-container fade-in">
      <h3>{t('ledger')}</h3>

      <div className="filter-bar glass">
        <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
          <option value="all">All Types</option>
          <option value="cash_in">Income</option>
          <option value="cash_out">Expense</option>
        </select>
        
        <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
          <option value="all">All Categories</option>
          <option value="donation">Donation</option>
          <option value="hundi">Hundi</option>
          <option value="puja">Puja</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      <div className="transaction-list glass">
        <AnimatePresence>
          {filtered.map(tr => (
            <motion.div 
              key={tr.id} 
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 10, opacity: 0 }}
              className={`tr-item ${tr.type}`}
            >
              <div className="tr-main">
                <div className="tr-details">
                  <span className="tr-category">{t(`pujas.${tr.category as any}` as any) || tr.category}</span>
                  <div className="tr-attribution">
                    {tr.type === 'cash_in' && (
                      <>
                        {tr.category === 'donation' ? (
                          <>
                            {tr.donorType === 'others' ? (
                              <>
                                <span className="attr-item"><b>Donated by:</b> {tr.forWhom}</span>
                                <span className="attr-item"><b>Collected by:</b> {tr.submittedByName}</span>
                              </>
                            ) : (
                              <span className="attr-item"><b>Donated by:</b> {tr.submittedByName}</span>
                            )}
                          </>
                        ) : (
                          <span className="attr-item"><b>Collected by:</b> {tr.submittedByName}</span>
                        )}
                      </>
                    )}
                    {tr.type === 'cash_out' && (
                      <span className="attr-item"><b>Spent by:</b> {tr.submittedByName}</span>
                    )}
                    <span className="attr-item"><b>Purpose:</b> {tr.description}</span>
                  </div>
                  <span className="tr-date">{tr.timestamp.toLocaleString()}</span>
                </div>
                <div className="tr-right">
                  <span className="tr-amount">
                    {tr.type === 'cash_in' ? '+ ' : '- '} ₹ {tr.amount}
                  </span>
                  <span className={`tr-status badge ${tr.status}`}>{t(tr.status)}</span>
                </div>
              </div>
              {tr.imageUrl && (
                <a href={tr.imageUrl} target="_blank" className="view-receipt">View Receipt</a>
              )}
              {user?.email === 'tarunkummaryenuganti07@gmail.com' && (
                <button 
                  onClick={() => handleDelete(tr.id!)} 
                  className="btn-text danger delete-tr"
                  title="Master Admin Delete"
                >Delete</button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filtered.length === 0 && <p className="empty">No matching transactions</p>}
      </div>

      <style jsx>{`
        .ledger-container { margin-top: 40px; }
        .filter-bar { padding: 15px; display: flex; gap: 15px; margin-bottom: 20px; }
        .filter-bar select { padding: 8px; border: 1px solid #eee; border-radius: 4px; background: white; flex: 1; }
        .transaction-list { padding: 10px; display: flex; flex-direction: column; gap: 10px; }
        .tr-item { padding: 20px; border-radius: 12px; border-left: 5px solid transparent; transition: background 0.2s; }
        .tr-item:hover { background: rgba(255,153,51,0.05); }
        .tr-item.cash_in { border-left-color: var(--success); }
        .tr-item.cash_out { border-left-color: var(--error); }
        .tr-main { display: flex; justify-content: space-between; align-items: center; }
        .tr-details { display: flex; flex-direction: column; gap: 4px; }
        .tr-category { font-weight: 700; color: var(--accent); text-transform: capitalize; font-size: 1.1rem; }
        .tr-attribution { display: flex; flex-direction: column; gap: 2px; margin: 4px 0; }
        .attr-item { font-size: 0.9rem; color: var(--text-main); }
        .attr-item b { color: var(--text-muted); font-weight: 600; }
        .tr-date { font-size: 0.75rem; color: var(--text-muted); }
        .tr-amount { font-size: 1.1rem; font-weight: 700; display: block; margin-bottom: 4px; }
        .tr-right { text-align: right; }
        .badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; }
        .pending { background: #fff3e0; color: var(--warning); }
        .approved { background: #e8f5e9; color: var(--success); }
        .rejected { background: #ffebee; color: var(--error); }
        .view-receipt { display: inline-block; margin-top: 8px; font-size: 0.8rem; color: var(--primary); font-weight: 600; text-decoration: none; }
        .view-receipt.delete-tr { margin-left: 15px; cursor: pointer; border: none; background: none; }
        .danger { color: var(--error); font-size: 0.8rem; font-weight: 600; cursor: pointer; border: none; background: none; margin-top: 8px; margin-left: 15px; }
        .danger:hover { text-decoration: underline; }
        .empty { padding: 40px; text-align: center; color: var(--text-muted); }
      `}</style>
    </div>
  );
};

export default TransactionLedger;
