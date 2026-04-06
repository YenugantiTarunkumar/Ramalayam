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
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage, isDemoMode } from "@/lib/firebase";

export interface GalleryItem {
  id?: string;
  title: string;
  type: 'video' | 'image';
  mediaUrl: string;
  thumbnailUrl?: string;
  category: string;
  timestamp: Date;
  uploadedBy: string;
  uploadedByName: string;
}

const DEMO_GALLERY_KEY = "temple_demo_gallery";

export const uploadMedia = async (
  item: Omit<GalleryItem, 'id' | 'timestamp' | 'mediaUrl'>,
  file: File
) => {
  if (isDemoMode) {
    const newItem: GalleryItem = {
      ...item,
      id: "demo_med_" + Date.now(),
      mediaUrl: URL.createObjectURL(file),
      timestamp: new Date()
    };
    const existing = JSON.parse(localStorage.getItem(DEMO_GALLERY_KEY) || "[]");
    localStorage.setItem(DEMO_GALLERY_KEY, JSON.stringify([newItem, ...existing]));
    return { id: newItem.id };
  }

  // 1. Upload to Storage
  const folder = item.type === 'video' ? 'videos' : 'images';
  const storageRef = ref(storage, `gallery/${folder}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const mediaUrl = await getDownloadURL(snapshot.ref);

  // 2. Save Metadata to Firestore
  return await addDoc(collection(db, "gallery"), {
    ...item,
    mediaUrl,
    timestamp: Timestamp.now()
  });
};

export const getGalleryItems = (callback: (items: GalleryItem[]) => void) => {
  if (isDemoMode) {
    const check = () => {
      const existing = JSON.parse(localStorage.getItem(DEMO_GALLERY_KEY) || "[]");
      callback(existing.map((i: any) => ({ ...i, timestamp: new Date(i.timestamp) })));
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }

  const q = query(collection(db, "gallery"), orderBy("timestamp", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate()
    })) as GalleryItem[]);
  });
};

export const deleteGalleryItem = async (id: string, mediaUrl: string) => {
  if (isDemoMode) {
    const existing = JSON.parse(localStorage.getItem(DEMO_GALLERY_KEY) || "[]");
    localStorage.setItem(DEMO_GALLERY_KEY, JSON.stringify(existing.filter((i: any) => i.id !== id)));
    return;
  }

  // Delete from Firestore
  await deleteDoc(doc(db, "gallery", id));

  // Delete from Storage if possible
  try {
    const mediaRef = ref(storage, mediaUrl);
    await deleteObject(mediaRef);
  } catch (err) {
    console.error("Storage delete failed:", err);
  }
};
