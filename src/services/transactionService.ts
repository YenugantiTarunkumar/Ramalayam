import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  Timestamp,
  getDocs
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, isDemoMode } from "@/lib/firebase";

export interface Transaction {
  id?: string;
  type: 'cash_in' | 'cash_out' | 'allocation';
  amount: number;
  category: string;
  
  // New workflow statuses
  status: 'pending' | 'approved' | 'rejected' | 'pending_submission' | 'submitted_to_admin' | 'pending_settlement' | 'settled_by_admin' | 'received_confirmed' | 'settled_reimbursement';
  
  // Recipient for allocations
  allocatedTo?: string;
  allocatedToName?: string;

  // New donor tracking fields
  donorType?: 'myself' | 'others';
  forWhom?: string;
  donationType?: 'cash' | 'other';
  otherDonationItem?: string;
  
  description: string;
  imageUrl?: string;
  paymentMethod?: string;
  customCategory?: string;
  customItem?: string;
  timestamp: Date;
  submittedBy: string;
  submittedByName: string;
  approvedBy?: string;
}

const DEMO_STORAGE_KEY = "temple_demo_transactions";

export const addTransaction = async (
  transaction: Omit<Transaction, 'id' | 'timestamp' | 'status'> & { status?: Transaction['status'] },
  imageFile?: File
) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return { id: "ssr" };
    const newTransaction: Transaction = {
      ...transaction,
      id: "demo_" + Date.now(),
      status: transaction.status || "pending",
      timestamp: new Date(),
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : ""
    };
    
    const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify([newTransaction, ...existing]));
    return { id: newTransaction.id };
  }

  let imageUrl = "";
  if (imageFile) {
    const storageRef = ref(storage, `receipts/${Date.now()}_${imageFile.name}`);
    const snapshot = await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(snapshot.ref);
  }

  return await addDoc(collection(db, "transactions"), {
    ...transaction,
    imageUrl,
    status: transaction.status || "pending",
    timestamp: Timestamp.now()
  });
};

export const approveTransaction = async (transactionId: string, adminId: string) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return;
    const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
    const updated = existing.map((t: any) => t.id === transactionId ? { ...t, status: "approved", approvedBy: adminId } : t);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    return;
  }

  const docRef = doc(db, "transactions", transactionId);
  return await updateDoc(docRef, {
    status: "approved",
    approvedBy: adminId
  });
};

export const rejectTransaction = async (transactionId: string, adminId: string) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return;
    const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
    const updated = existing.map((t: any) => t.id === transactionId ? { ...t, status: "rejected", approvedBy: adminId } : t);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    return;
  }

  const docRef = doc(db, "transactions", transactionId);
  return await updateDoc(docRef, {
    status: "rejected",
    approvedBy: adminId
  });
};

export const updateTransactionStatus = async (transactionId: string, newStatus: Transaction['status'], adminId?: string) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return;
    const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
    const updated = existing.map((t: any) => t.id === transactionId ? { ...t, status: newStatus, approvedBy: adminId || t.approvedBy } : t);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    // Trigger storage event manually for same-tab updates
    window.dispatchEvent(new Event('storage'));
    return;
  }

  const docRef = doc(db, "transactions", transactionId);
  return await updateDoc(docRef, {
    status: newStatus,
    ...(adminId ? { approvedBy: adminId } : {})
  });
};

import { deleteDoc } from "firebase/firestore";

export const deleteTransaction = async (transactionId: string) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return;
    const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
    const updated = existing.filter((t: any) => t.id !== transactionId);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    // Trigger storage event manually for same-tab updates
    window.dispatchEvent(new Event('storage'));
    return;
  }

  const docRef = doc(db, "transactions", transactionId);
  return await deleteDoc(docRef);
};

export const getTransactions = (callback: (transactions: Transaction[]) => void) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return () => {};
    const check = () => {
      const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
      callback(existing.map((t: any) => ({ ...t, timestamp: new Date(t.timestamp) })));
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }

  const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    })) as Transaction[];
    callback(transactions);
  });
};

export const calculateBalance = async () => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return 0;
    const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
    let balance = 0;
    existing.forEach((t: any) => {
      if (t.status === 'approved' || t.status === 'received_confirmed' || t.status === 'settled_by_admin' || t.status === 'settled_reimbursement') {
        if (t.type === 'cash_in') balance += (t.amount || 0);
        else if (t.type === 'cash_out' || t.type === 'allocation') balance -= (t.amount || 0);
      }
    });
    return balance;
  }

  const snapshot = await getDocs(collection(db, "transactions"));
  
  let balance = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.status === 'approved' || data.status === 'received_confirmed' || data.status === 'settled_by_admin' || data.status === 'settled_reimbursement') {
      if (data.type === 'cash_in') {
        balance += (data.amount || 0);
      } else if (data.type === 'cash_out' || data.type === 'allocation') {
        balance -= (data.amount || 0);
      }
    }
  });
  
  return balance;
};

// --- New Service for "My Cash" ---

export const calculatePersonalBalance = (uid: string, allTransactions: Transaction[]) => {
  let totalAllocated = 0;
  let pendingExpenses = 0;
  let totalExpenses = 0;
  let approvedExpenses = 0;

  allTransactions.forEach(t => {
    // 1. Sum money allocated TO the user
    if (t.type === 'allocation' && t.allocatedTo === uid) {
      // Include approved and settled reimbursements as part of the total allocated
      if (t.status === 'approved' || t.status === 'received_confirmed' || t.status === 'settled_reimbursement') {
        totalAllocated += t.amount;
      }
    }

    // 2. Track user's expenditures
    if (t.type === 'cash_out' && t.submittedBy === uid) {
      totalExpenses += t.amount;
      
      // Expenses not yet finalized (received_confirmed) are considered "pending" for personal balance
      if (t.status !== 'received_confirmed') {
        pendingExpenses += t.amount;
      } else {
        approvedExpenses += t.amount;
      }
    }
  });

  return {
    allocated: totalAllocated,
    pending: pendingExpenses,
    balanceLeft: totalAllocated - totalExpenses, // All logged expenses deducted
    finalBalance: totalAllocated - approvedExpenses // Only finalized expenses deducted
  };
};
