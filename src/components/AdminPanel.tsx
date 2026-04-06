"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { 
  getTransactions, 
  approveTransaction, 
  rejectTransaction, 
  addTransaction,
  calculatePersonalBalance,
  Transaction 
} from "@/services/transactionService";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc 
} from "firebase/firestore";
import { db, isDemoMode } from "@/lib/firebase";
import { generateTransactionReport } from "@/utils/pdfGenerator";
import { motion, AnimatePresence } from "framer-motion";
import { FaExclamationCircle, FaHandHoldingUsd } from "react-icons/fa";

const AdminPanel: React.FC = () => {
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [overspentUsers, setOverspentUsers] = useState<any[]>([]);

  useEffect(() => {
    if (role !== "admin") return;

    // Fetch transactions
    const unsubscribe = getTransactions((all) => {
      setAllTransactions(all);
      setPendingTransactions(all.filter(t => t.status === "pending"));
    });

    // Fetch users
    const fetchUsers = async () => {
      let fetchedUsers: any[] = [];
      if (isDemoMode) {
        fetchedUsers = JSON.parse(localStorage.getItem("temple_demo_users_list") || "[]");
      } else {
        const snapshot = await getDocs(collection(db, "users"));
        fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      setUsers(fetchedUsers);
    };

    fetchUsers();
    return () => unsubscribe();
  }, [role]);

  // Update overspent users whenever transactions or users change
  useEffect(() => {
    if (users.length > 0 && allTransactions.length > 0) {
      const overspent = users
        .filter(u => u.role === 'admin' || u.role === 'committee')
        .map(u => {
          const stats = calculatePersonalBalance(u.id, allTransactions);
          return { ...u, stats };
        })
        .filter(u => u.stats.balanceLeft < 0);
      setOverspentUsers(overspent);
    }
  }, [users, allTransactions]);

  const handleSettleReimbursement = async (targetUser: any) => {
    const amount = Math.abs(targetUser.stats.balanceLeft);
    if (!confirm(`Settle reimbursement of ₹${amount} for ${targetUser.name}?`)) return;

    try {
      await addTransaction({
        type: 'allocation',
        amount: amount,
        category: "Reimbursement",
        description: `Reimbursement for extra expenses spent by ${targetUser.name}`,
        status: 'settled_reimbursement',
        submittedBy: user!.uid,
        submittedByName: user!.displayName || user!.email || "Admin",
        allocatedTo: targetUser.id,
        allocatedToName: targetUser.name
      });
      alert("Reimbursement settled. Waiting for member to confirm receipt.");
    } catch (err) {
      console.error(err);
      alert("Failed to settle reimbursement");
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    // Optimistic UI update
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    
    if (isDemoMode) {
      const updatedUsers = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
      localStorage.setItem("temple_demo_users_list", JSON.stringify(updatedUsers));
      return;
    }
    
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
    } catch (error) {
      console.error("Failed to update user role:", error);
      alert("Failed to update role in database.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure?")) {
      if (isDemoMode) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        const current = JSON.parse(localStorage.getItem("temple_demo_users_list") || "[]");
        localStorage.setItem("temple_demo_users_list", JSON.stringify(current.filter((u: any) => u.id !== userId)));
        return;
      }
      await deleteDoc(doc(db, "users", userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  if (role !== "admin") return <p className="error">Access Denied</p>;

  return (
    <div className="admin-container fade-in">
      <h2>{t('adminPanel')}</h2>

      {/* Overspent Members Notification */}
      <AnimatePresence>
        {overspentUsers.length > 0 && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            className="admin-section overspent-section glass"
          >
            <div className="section-header danger">
              <FaExclamationCircle /> <h3>Overspent Members (Needs Reimbursement)</h3>
            </div>
            <div className="overspent-list">
              {overspentUsers.map(u => (
                <div key={u.id} className="overspent-card glass-dark">
                  <div className="oc-info">
                    <strong>{u.name}</strong>
                    <span className="text-danger">Extra Spent: ₹{Math.abs(u.stats.balanceLeft)}</span>
                  </div>
                  <button 
                    className="btn-success btn-sm" 
                    onClick={() => handleSettleReimbursement(u)}
                  >
                    <FaHandHoldingUsd /> Settle Extra
                  </button>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Approval Queue */}
      <section className="admin-section">
        <h3>Approval Queue</h3>
        <div className="card-grid">
          {pendingTransactions.map(tr => (
            <div key={tr.id} className="glass transaction-card">
              <div className="tr-header">
                <span className={`badge ${tr.type}`}>{tr.type}</span>
                <span className="tr-amount">₹ {tr.amount}</span>
              </div>
              <p className="tr-desc">{tr.description}</p>
              <div className="tr-footer">
                <button 
                  onClick={() => approveTransaction(tr.id!, user!.uid)}
                  className="btn-success"
                >{t('approve')}</button>
                <button 
                  onClick={() => rejectTransaction(tr.id!, user!.uid)}
                  className="btn-danger"
                >{t('reject')}</button>
              </div>
            </div>
          ))}
          {pendingTransactions.length === 0 && <p className="empty">No pending approvals</p>}
        </div>
      </section>

      {/* User Management */}
      <section className="admin-section">
        <h3>User Management</h3>
        <div className="user-table glass">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const safeStoreEmail = u.email?.trim().toLowerCase() || "";
                const isMasterAdmin = safeStoreEmail === "tarunkummaryenuganti07@gmail.com" || safeStoreEmail === "tarunkumaryenuganti07@gmail.com";
                const isSelf = user?.uid === u.id;

                return (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>
                      <select 
                        value={u.role} 
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        disabled={isMasterAdmin || isSelf}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="committee">Committee</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      {!isMasterAdmin ? (
                        <>
                          {!isSelf && <button onClick={() => handleDeleteUser(u.id)} className="btn-text danger">Delete</button>}
                          {isSelf && <span className="badge cash_in">You</span>}
                        </>
                      ) : (
                        <span className="badge cash_in">Master</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <style jsx>{`
        .admin-container { padding-bottom: 50px; }
        h2 { margin-bottom: 30px; }
        .admin-section { margin-bottom: 40px; }
        .overspent-section { border-left: 5px solid var(--error); padding: 25px; margin-bottom: 30px; background: rgba(255, 82, 82, 0.05); }
        .section-header.danger { display: flex; align-items: center; gap: 10px; color: var(--error); margin-bottom: 20px; }
        .overspent-list { display: flex; flex-direction: column; gap: 15px; }
        .overspent-card { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-radius: 10px; border-left: 4px solid var(--error); }
        .oc-info { display: flex; flex-direction: column; gap: 4px; }
        .btn-sm { padding: 6px 12px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
        .transaction-card { padding: 20px; }
        .tr-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .tr-amount { font-weight: 700; color: var(--accent); }
        .badge { font-size: 0.7rem; text-transform: uppercase; padding: 2px 8px; border-radius: 10px; }
        .cash_in { background: #e8f5e9; color: var(--success); }
        .cash_out { background: #ffebee; color: var(--error); }
        .tr-footer { display: flex; gap: 10px; margin-top: 15px; }
        .btn-success { background: var(--success); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
        .btn-danger { background: var(--error); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
        .user-table { width: 100%; overflow-x: auto; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; border-bottom: 1px solid #eee; padding: 10px; }
        td { padding: 10px; border-bottom: 1px solid #f9f9f9; }
        .danger { color: var(--error); }
      `}</style>
    </div>
  );
};

export default AdminPanel;
