"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getTransactions, addTransaction, updateTransactionStatus, Transaction } from "@/services/transactionService";
import { motion, AnimatePresence } from "framer-motion";

const CashWorkspace: React.FC = () => {
  const { role, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'collected' | 'spent'>('collected');
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = getTransactions((all) => {
      // Filter out pure "donations" made through the viewer portal if needed,
      // but assuming everything has type cash_in / cash_out
      setAllTransactions(all);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = role === 'admin' || user?.email === "tarunkummaryenuganti07@gmail.com";

  // Filter based on Role and Tab
  const relevantTransactions = allTransactions.filter(tr => {
    // Basic filter for type
    const matchesTab = activeTab === 'collected' ? tr.type === 'cash_in' : tr.type === 'cash_out';
    if (!matchesTab) return false;
    
    // Role visibility
    if (isAdmin) return true;
    return tr.submittedBy === user?.uid;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    setSubmitting(true);

    try {
      const type = activeTab === 'collected' ? 'cash_in' : 'cash_out';
      const initialStatus = type === 'cash_in' ? 'pending_submission' : 'pending_settlement';

      await addTransaction({
        type,
        amount: parseFloat(amount),
        category: category || "General",
        description,
        status: initialStatus,
        submittedBy: user!.uid,
        submittedByName: user!.displayName || user!.email || "User"
      });

      setShowForm(false);
      setAmount(""); setCategory(""); setDescription("");
    } catch (err) {
      console.error(err);
      alert("Failed to record entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: Transaction['status']) => {
    await updateTransactionStatus(id, newStatus, user?.uid);
  };

  return (
    <div className="cash-workspace fade-in">
      <div className="cw-header glass">
        <h2>Cash Workspace</h2>
        <div className="cw-nav">
          <button className={activeTab === 'collected' ? 'active' : ''} onClick={() => { setActiveTab('collected'); setShowForm(false); }}>
            Collected (Cash In)
          </button>
          <button className={activeTab === 'spent' ? 'active' : ''} onClick={() => { setActiveTab('spent'); setShowForm(false); }}>
            Spent (Cash Out)
          </button>
        </div>
      </div>

      <div className="cw-actions">
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Log New {activeTab === 'collected' ? 'Collection' : 'Expense'}
          </button>
        )}
      </div>

      {showForm && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="form-card glass">
          <h3>Register {activeTab === 'collected' ? 'Collected Money' : 'Spent Money'}</h3>
          <form onSubmit={handleAddSubmit}>
            <div className="input-group">
              <label>Amount (₹)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" />
            </div>
            <div className="input-group">
              <label>Category</label>
              <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Extra Hundi, Supplies" required />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} required />
            </div>
            <div className="form-footer">
              <button type="button" className="btn-text" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-success" disabled={submitting}>Save Draft</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="transactions-list">
        <AnimatePresence>
          {relevantTransactions.map(tr => (
            <motion.div 
              key={tr.id} 
              initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}
              className={`t-card glass ${tr.status}`}
            >
              <div className="tc-top">
                <div>
                  <span className="tc-amount">₹ {tr.amount}</span>
                  <span className="tc-cat">{tr.category}</span>
                </div>
                <span className={`badge ${tr.status}`}>{tr.status.replace(/_/g, ' ')}</span>
              </div>
              <p className="tc-desc">{tr.description}</p>
              <div className="tc-meta">By: {tr.submittedByName} | {tr.timestamp.toLocaleString()}</div>

              {/* ACTION BUTTONS BASED ON WORKFLOW */}
              <div className="tc-actions">
                
                {/* --- COLLECTED WORKFLOW --- */}
                {activeTab === 'collected' && (
                  <>
                    {/* Submitter action */}
                    {tr.status === 'pending_submission' && tr.submittedBy === user?.uid && (
                      <button className="btn-alert" onClick={() => {
                        // If Admin submits their own collection, it bypasses review directly to Approved
                        if (isAdmin) handleStatusChange(tr.id!, 'approved');
                        else handleStatusChange(tr.id!, 'submitted_to_admin');
                      }}>Submit to Admin</button>
                    )}
                    
                    {/* Admin Review action */}
                    {tr.status === 'submitted_to_admin' && isAdmin && (
                      <div className="action-row">
                        <span className="prompt">Approve Submission?</span>
                        <button className="btn-success" onClick={() => handleStatusChange(tr.id!, 'approved')}>Yes</button>
                        <button className="btn-danger" onClick={() => handleStatusChange(tr.id!, 'pending_submission')}>No (Return)</button>
                      </div>
                    )}
                  </>
                )}

                {/* --- SPENT WORKFLOW --- */}
                {activeTab === 'spent' && (
                  <>
                    {/* Admin Settlement action */}
                    {tr.status === 'pending_settlement' && isAdmin && (
                      <button className="btn-alert" onClick={() => handleStatusChange(tr.id!, 'settled_by_admin')}>
                        Settle Money
                      </button>
                    )}

                    {/* Submitter Receipt Confirmation action */}
                    {tr.status === 'settled_by_admin' && tr.submittedBy === user?.uid && (
                      <div className="action-row">
                        <span className="prompt">Received Money?</span>
                        <button className="btn-success" onClick={() => handleStatusChange(tr.id!, 'received_confirmed')}>Yes</button>
                        <button className="btn-danger" onClick={() => handleStatusChange(tr.id!, 'pending_settlement')}>No (Dispute)</button>
                      </div>
                    )}
                  </>
                )}
                
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {relevantTransactions.length === 0 && !showForm && (
          <p className="empty">No entries found for {activeTab}.</p>
        )}
      </div>

      <style jsx>{`
        .cash-workspace { padding: 20px 0; max-width: 800px; margin: 0 auto; }
        .cw-header { padding: 20px; border-radius: 12px; margin-bottom: 25px; text-align: center; }
        .cw-header h2 { margin-bottom: 20px; color: var(--text-main); }
        .cw-nav { display: flex; background: rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; }
        .cw-nav button { flex: 1; padding: 12px; border: none; background: transparent; font-weight: 600; cursor: pointer; color: var(--text-muted); transition: 0.2s;}
        .cw-nav button.active { background: var(--primary); color: white; }
        
        .cw-actions { display: flex; justify-content: flex-end; margin-bottom: 20px; }
        .form-card { padding: 25px; border-radius: 12px; margin-bottom: 30px; }
        .form-card h3 { margin-bottom: 20px; color: var(--accent); }
        .input-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 15px; }
        .input-group label { font-size: 0.9rem; font-weight: 600; color: var(--text-muted); }
        .input-group input, .input-group textarea { padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit;}
        .form-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; }
        
        .transactions-list { display: flex; flex-direction: column; gap: 15px; }
        .t-card { padding: 20px; border-radius: 12px; border-left: 5px solid #ccc; }
        .t-card.approved, .t-card.received_confirmed { border-left-color: var(--success); }
        .t-card.pending_submission, .t-card.pending_settlement { border-left-color: var(--warning); }
        .t-card.submitted_to_admin, .t-card.settled_by_admin { border-left-color: var(--primary); }
        
        .tc-top { display: flex; justify-content: space-between; margin-bottom: 8px; align-items: flex-start;}
        .tc-amount { font-size: 1.5rem; font-weight: bold; color: var(--text-main); margin-right: 15px; }
        .tc-cat { font-size: 0.9rem; background: rgba(0,0,0,0.05); padding: 4px 10px; border-radius: 12px; color: var(--text-muted); font-weight: 500; }
        
        .badge { font-size: 0.75rem; text-transform: uppercase; padding: 4px 10px; border-radius: 12px; font-weight: bold; }
        .badge.approved, .badge.received_confirmed { background: #e8f5e9; color: var(--success); }
        .badge.pending_submission, .badge.pending_settlement { background: #fff3e0; color: var(--warning); }
        .badge.submitted_to_admin, .badge.settled_by_admin { background: #e3f2fd; color: #1976d2; }
        
        .tc-desc { color: var(--text-muted); line-height: 1.4; margin-bottom: 10px; font-size: 0.95rem; }
        .tc-meta { font-size: 0.8rem; color: #aaa; margin-bottom: 15px; }
        
        .tc-actions { padding-top: 15px; border-top: 1px dashed #eee; display: flex; justify-content: flex-end; }
        .action-row { display: flex; align-items: center; gap: 10px; }
        .action-row .prompt { font-size: 0.9rem; font-weight: bold; color: var(--text-main); margin-right: 10px; }
        
        .btn-success { background: var(--success); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;}
        .btn-danger { background: var(--error); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;}
        .btn-alert { background: var(--warning); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;}
        
      `}</style>
    </div>
  );
};

export default CashWorkspace;
