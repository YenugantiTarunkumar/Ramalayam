import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  doc, 
  deleteDoc, 
  Timestamp
} from "firebase/firestore";
import { db, isDemoMode } from "@/lib/firebase";

export interface Puja {
  id?: string;
  name: string;
  date: string;       // e.g. YYYY-MM-DD
  time: string;       // e.g. HH:MM AM/PM
  venue: string;
  fee: number;
  items: string[];
  description: string;
  isOpenForAll?: boolean;
  createdAt?: Date;
}

const DEMO_STORAGE_KEY = "temple_demo_pujas";

export const addPuja = async (puja: Omit<Puja, 'id' | 'createdAt'>) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return { id: "ssr" };
    const newPuja: Puja = {
      ...puja,
      id: "demo_puja_" + Date.now(),
      createdAt: new Date(),
    };
    
    const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify([newPuja, ...existing]));
    // Dispatch event so hooks catch it
    window.dispatchEvent(new Event('pujas_updated'));
    return { id: newPuja.id };
  }

  return await addDoc(collection(db, "pujas"), {
    ...puja,
    createdAt: Timestamp.now()
  });
};

export const deletePuja = async (pujaId: string) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return;
    const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
    const updated = existing.filter((p: any) => p.id !== pujaId);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('pujas_updated'));
    return;
  }

  const docRef = doc(db, "pujas", pujaId);
  return await deleteDoc(docRef);
};

export const getPujas = (callback: (pujas: Puja[]) => void) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return () => {};
    const check = () => {
      const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
      callback(existing.map((p: any) => ({ ...p, createdAt: new Date(p.createdAt) })));
    };
    check();
    window.addEventListener('storage', check);
    window.addEventListener('pujas_updated', check);
    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener('pujas_updated', check);
    };
  }

  const q = query(collection(db, "pujas"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const pujas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    })) as Puja[];
    callback(pujas);
  });
};
