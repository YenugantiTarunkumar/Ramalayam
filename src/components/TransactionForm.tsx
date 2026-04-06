"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { addTransaction } from "@/services/transactionService";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const TransactionForm: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const { user, role } = useAuth();
  const isPrivileged = role === "admin" || role === "committee";

  const [donorType, setDonorType] = useState<'myself' | 'others'>('myself');
  const [forWhom, setForWhom] = useState("");
  const [donationType, setDonationType] = useState<'cash' | 'other'>('cash');
  const [otherItem, setOtherItem] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash_offline");
  
  const [showPaymentSim, setShowPaymentSim] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (donationType === 'cash' && !amount) return;
    if (donationType === 'other' && !otherItem) return;
    if (donorType === 'others' && !forWhom) return;

    const finalPaymentMethod = role === 'viewer' ? 'cash_online' : paymentMethod;

    if (donationType === 'cash' && finalPaymentMethod === 'cash_online') {
      setShowPaymentSim(true);
    } else {
      finalizeSubmission();
    }
  };

  const finalizeSubmission = async () => {
    setSubmitting(true);
    try {
      const isViewer = role === 'viewer';
      const actualDonorType = isViewer ? 'myself' : donorType;
      const finalPaymentMethod = isViewer ? 'cash_online' : paymentMethod;
      
      // Auto-approve cash donations? The prompt didn't say Viewers need approval. Let's auto-approve cash in.
      // Alternatively, set to "pending" to keep it secure. We'll use "approved" to match the original auto-approval behavior.
      
      await addTransaction({
        type: 'cash_in',
        amount: donationType === 'cash' ? parseFloat(amount) : 0,
        category: 'donation',
        donorType: actualDonorType,
        forWhom: actualDonorType === 'others' ? forWhom : undefined,
        donationType,
        otherDonationItem: donationType === 'other' ? otherItem : undefined,
        paymentMethod: donationType === 'cash' ? finalPaymentMethod : undefined,
        description: donationType === 'cash' ? "Cash Donation" : "In-kind Donation",
        status: 'approved', // Real donations auto-finalize to ledger
        submittedBy: user!.uid,
        submittedByName: user?.displayName || user?.email || user?.uid || "User"
      });
      
      onSuccess();
    } catch (error: any) {
      console.error("TransactionForm error:", error?.message || error);
      alert(`Submission failed: ${error?.message || 'Unknown error. Check console.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-overlay fade-in">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass form-card"
      >
        <AnimatePresence mode="wait">
        {showPaymentSim ? (
          <motion.div key="sim" className="payment-simulation fade-in" initial={{opacity:0}} animate={{opacity:1}}>
            <h3 className="text-saffron-gradient">UPI Payment Redirect</h3>
            <p>You selected "Cash Online". In a real environment, you would be redirected to Razorpay or a UPI deep link.</p>
            <div className="sim-amount">Total: ₹ {amount}</div>
            <div className="form-footer">
              <button onClick={() => setShowPaymentSim(false)} className="btn-text">Cancel</button>
              <button onClick={finalizeSubmission} className="btn-success" disabled={submitting}>
                {submitting ? "Processing..." : "Simulate Payment Success"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{opacity:0}} animate={{opacity:1}}>
            <h3>Make a Donation</h3>
            
            <form onSubmit={handleInitialSubmit}>
              {/* Admins & Members Toggle for "Myself" vs "Others" */}
              {isPrivileged && (
                <div className="toggle-group">
                  <button 
                    type="button" 
                    className={donorType === 'myself' ? 'active' : ''}
                    onClick={() => setDonorType('myself')}
                  >Myself</button>
                  <button 
                    type="button" 
                    className={donorType === 'others' ? 'active' : ''}
                    onClick={() => setDonorType('others')}
                  >Others</button>
                </div>
              )}

              {/* If Admin selected "Others", ask For Whom */}
              {isPrivileged && donorType === 'others' && (
                <div className="input-group fade-in">
                  <label>For Whom?</label>
                  <input 
                    type="text" 
                    value={forWhom} 
                    onChange={(e) => setForWhom(e.target.value)} 
                    placeholder="Name of the person"
                    required 
                  />
                </div>
              )}

              {/* Main Category: Cash or Other */}
              <div className="input-group">
                <label>Donation Type</label>
                <div className="radio-group">
                  <label>
                    <input type="radio" checked={donationType === 'cash'} onChange={() => setDonationType('cash')} />
                    Cash
                  </label>
                  <label>
                    <input type="radio" checked={donationType === 'other'} onChange={() => setDonationType('other')} />
                    Other
                  </label>
                </div>
              </div>

              {/* If "Other" -> What are you going to donate? */}
              {donationType === 'other' && (
                <div className="input-group fade-in">
                  <label>What are you going to donate?</label>
                  <textarea 
                    value={otherItem} 
                    onChange={(e) => setOtherItem(e.target.value)} 
                    placeholder="e.g. 50kg Rice, Gold Chain..."
                    required 
                    rows={3}
                  />
                </div>
              )}

              {/* If "Cash" -> Amount and Online/Offline */}
              {donationType === 'cash' && (
                <>
                  <div className="input-group fade-in">
                    <label>Amount (₹)</label>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      min="1"
                      placeholder="e.g. 500"
                      required 
                    />
                  </div>
                  
                  <div className="input-group fade-in">
                    <label>Payment Method</label>
                    {role === 'viewer' ? (
                      <select value="cash_online" disabled>
                        <option value="cash_online">Cash Online (UPI/Card)</option>
                      </select>
                    ) : (
                      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                        <option value="cash_offline">Cash Offline (In-Person)</option>
                        <option value="cash_online">Cash Online (UPI/Card)</option>
                      </select>
                    )}
                  </div>
                </>
              )}

              <div className="form-footer">
                <button type="button" onClick={onCancel} className="btn-text">Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Submitting..." : ((role === 'viewer' || paymentMethod === 'cash_online') && donationType === 'cash' ? "Proceed to Pay" : "Submit Donation")}
                </button>
              </div>
            </form>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>

      <style jsx>{`
        .form-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; backdrop-filter: blur(4px);
        }
        .form-card { width: 100%; max-width: 450px; padding: 30px; }
        .payment-simulation { text-align: center; }
        .payment-simulation h3 { margin-bottom: 10px; font-size: 1.5rem; }
        .payment-simulation p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;}
        .sim-amount { font-size: 2rem; font-weight: 700; color: var(--success); margin-bottom: 20px; }
        .toggle-group { display: flex; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
        .toggle-group button { flex: 1; padding: 10px; border: none; background: white; cursor: pointer; font-weight: 600; }
        .toggle-group .active { background: var(--primary); color: white; }
        .input-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 15px; }
        .input-group label { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
        .input-group input, .input-group select, .input-group textarea {
          padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit;
        }
        .radio-group { display: flex; gap: 20px; margin-top: 5px; }
        .radio-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-main); font-size: 0.95rem;}
        .radio-group input { width: 18px; height: 18px; cursor: pointer; }
        .form-footer { display: flex; justify-content: flex-end; gap: 15px; margin-top: 25px; }
        .btn-success { background: var(--success); color: white; border: none; padding: 10px 16px; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;}
      `}</style>
    </div>
  );
};

export default TransactionForm;
