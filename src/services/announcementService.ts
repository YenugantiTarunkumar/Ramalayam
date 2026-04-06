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

export interface Announcement {
  id?: string;
  title: string;
  details: string;
  titleTe?: string;
  detailsTe?: string;
  createdAt?: Date;
}

const DEMO_STORAGE_KEY = "temple_demo_announcements";

export const addAnnouncement = async (announcement: Omit<Announcement, 'id' | 'createdAt'>) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return { id: "ssr" };
    const newAnnouncement: Announcement = {
      ...announcement,
      id: "demo_ann_" + Date.now(),
      createdAt: new Date(),
    };
    
    const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify([newAnnouncement, ...existing]));
    // Dispatch event so hooks catch it
    window.dispatchEvent(new Event('announcements_updated'));
    return { id: newAnnouncement.id };
  }

  return await addDoc(collection(db, "announcements"), {
    ...announcement,
    createdAt: Timestamp.now()
  });
};

export const deleteAnnouncement = async (announcementId: string) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return;
    const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
    const updated = existing.filter((p: any) => p.id !== announcementId);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('announcements_updated'));
    return;
  }

  const docRef = doc(db, "announcements", announcementId);
  return await deleteDoc(docRef);
};

export const getAnnouncements = (callback: (announcements: Announcement[]) => void) => {
  if (isDemoMode) {
    if (typeof window === 'undefined') return () => {};
    const check = () => {
      const existing = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "[]");
      callback(existing.map((p: any) => ({ ...p, createdAt: new Date(p.createdAt) })));
    };
    check();
    window.addEventListener('storage', check);
    window.addEventListener('announcements_updated', check);
    return () => {
      window.removeEventListener('storage', check);
      window.removeEventListener('announcements_updated', check);
    };
  }

  const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    })) as Announcement[];
    callback(records);
  });
};
