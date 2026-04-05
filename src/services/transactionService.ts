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
  type: 'cash_in' | 'cash_out';
  amount: number;
  category: string;
  
  // New workflow statuses
  status: 'pending' | 'approved' | 'rejected' | 'pending_submission' | 'submitted_to_admin' | 'pending_settlement' | 'settled_by_admin' | 'received_confirmed';
  
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
      if (t.status === 'approved' || t.status === 'received_confirmed') {
        if (t.type === 'cash_in') balance += (t.amount || 0);
        else balance -= (t.amount || 0);
      }
    });
    return balance;
  }

  const snapshot = await getDocs(collection(db, "transactions"));
  
  let balance = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.status === 'approved' || data.status === 'received_confirmed') {
      if (data.type === 'cash_in') {
        balance += (data.amount || 0);
      } else {
        balance -= (data.amount || 0);
      }
    }
  });
  
  return balance;
};
