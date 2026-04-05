"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { 
  getTransactions, 
  approveTransaction, 
  rejectTransaction, 
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
import { motion } from "framer-motion";

const AdminPanel: React.FC = () => {
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    if (role !== "admin") return;

    // Fetch pending transactions
    const unsubscribe = getTransactions((all) => {
      setPendingTransactions(all.filter(t => t.status === "pending"));
    });

    // Fetch users
    const fetchUsers = async () => {
      if (isDemoMode) {
        let storedUsers = JSON.parse(localStorage.getItem("temple_demo_users_list") || "[]");
        if (storedUsers.length === 0) {
          storedUsers = [
            { id: "demo_1", name: "Tarun Kumar", role: "admin", email: "tarunkummaryenuganti07@gmail.com" },
            { id: "demo_2", name: "Committee Member", role: "committee", email: "committee@temple.com" },
            { id: "demo_3", name: "General User", role: "viewer", email: "user@temple.com" }
          ];
          localStorage.setItem("temple_demo_users_list", JSON.stringify(storedUsers));
        }
        setUsers(storedUsers);
        return;
      }
      const snapshot = await getDocs(collection(db, "users"));
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchUsers();
    return () => unsubscribe();
  }, [role]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (isDemoMode) {
      const updatedUsers = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
      setUsers(updatedUsers);
      localStorage.setItem("temple_demo_users_list", JSON.stringify(updatedUsers));
      return;
    }
    await updateDoc(doc(db, "users", userId), { role: newRole });
    // Update local state instantly so a refresh isn't needed
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure?")) {
      if (isDemoMode) {
        const filteredUsers = users.filter(u => u.id !== userId);
        setUsers(filteredUsers);
        localStorage.setItem("temple_demo_users_list", JSON.stringify(filteredUsers));
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
                const isSelf = user?.uid === u.id; // Prevent a user from removing their own power

                return (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>
                      <select 
                        value={u.role} 
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        disabled={isMasterAdmin || isSelf}
                        title={isMasterAdmin ? "Master Admin role cannot be changed" : isSelf ? "You cannot edit your own role" : ""}
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
