"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { uploadVideo, getGalleryItems, deleteGalleryItem, GalleryItem } from "@/services/galleryService";
import { motion, AnimatePresence } from "framer-motion";
import { FaVideo, FaFolder, FaTrash, FaPlus, FaTimes } from "react-icons/fa";

const Gallery: React.FC = () => {
  const { role, user } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = getGalleryItems((all) => {
      setItems(all);
    });
    return () => unsubscribe();
  }, []);

  const isAdminOrCommittee = role === 'admin' || role === 'committee' || user?.email === "tarunkummaryenuganti07@gmail.com";

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !title || !category) return;
    setUploading(true);

    try {
      await uploadVideo({
        title,
        category,
        uploadedBy: user!.uid,
        uploadedByName: user!.displayName || user!.email || "User"
      }, videoFile);
      
      setShowUpload(false);
      setTitle(""); setCategory(""); setVideoFile(null);
    } catch (err) {
      console.error(err);
      alert("Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(items.map(item => item.category)))];
  const filteredItems = activeCategory === "All" ? items : items.filter(item => item.category === activeCategory);

  return (
    <div className="gallery-container fade-in">
      <div className="gallery-header glass">
        <div>
          <h1>Temple Gallery</h1>
          <p>Memories of our sacred events</p>
        </div>
        {isAdminOrCommittee && (
          <button className="btn-primary" onClick={() => setShowUpload(true)}>
            <FaPlus /> Post Video
          </button>
        )}
      </div>

      <div className="category-bar">
        {categories.map(cat => (
          <button 
            key={cat} 
            className={`cat-tab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === "All" ? <FaFolder /> : null} {cat}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }}
            className="modal-overlay"
          >
            <div className="modal-content glass">
              <div className="modal-header">
                <h3>Post New Event Video</h3>
                <button className="btn-close" onClick={() => setShowUpload(false)}><FaTimes /></button>
              </div>
              <form onSubmit={handleUpload}>
                <div className="input-group">
                  <label>Event Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Maha Shivaratri 2024" />
                </div>
                <div className="input-group">
                  <label>Folder / Category</label>
                  <input type="text" value={category} onChange={e => setCategory(e.target.value)} required placeholder="e.g. Festivals, Daily Puja" />
                </div>
                <div className="input-group">
                  <label>Video File</label>
                  <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} required />
                </div>
                <button type="submit" className="btn-success full-width" disabled={uploading}>
                  {uploading ? "Uploading..." : "Share Video"}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="video-grid">
        {filteredItems.map(item => (
          <motion.div layout key={item.id} className="video-card glass">
            <div className="video-wrapper">
              <video src={item.videoUrl} controls poster={item.thumbnailUrl} />
            </div>
            <div className="video-info">
              <div className="vi-top">
                <h4>{item.title}</h4>
                {isAdminOrCommittee && (
                  <button className="btn-icon-danger" onClick={() => deleteGalleryItem(item.id!, item.videoUrl)}>
                    <FaTrash />
                  </button>
                )}
              </div>
              <div className="vi-meta">
                <span><FaFolder /> {item.category}</span>
                <span>{item.timestamp.toLocaleDateString()}</span>
              </div>
              <p className="vi-by">By {item.uploadedByName}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="empty-state">
          <FaVideo size={48} />
          <p>No videos found in this category.</p>
        </div>
      )}

      <style jsx>{`
        .gallery-container { padding-bottom: 50px; }
        .gallery-header { display: flex; justify-content: space-between; align-items: center; padding: 25px; border-radius: 12px; margin-bottom: 25px; }
        .gallery-header h1 { color: var(--primary); font-size: 1.8rem; }
        .gallery-header p { color: var(--text-muted); font-size: 0.95rem; }
        
        .category-bar { display: flex; gap: 10px; overflow-x: auto; padding: 10px 0; margin-bottom: 25px; scrollbar-width: none; }
        .cat-tab { padding: 8px 16px; border-radius: 20px; border: 1px solid #ddd; background: white; white-space: nowrap; cursor: pointer; color: var(--text-muted); font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 6px; }
        .cat-tab.active { background: var(--primary); border-color: var(--primary); color: white; }
        
        .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .video-card { border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
        .video-wrapper { width: 100%; aspect-ratio: 16/9; background: #000; }
        .video-wrapper video { width: 100%; height: 100%; object-fit: contain; }
        
        .video-info { padding: 15px; }
        .vi-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .vi-top h4 { font-size: 1.1rem; color: var(--text-main); margin: 0; }
        .vi-meta { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; }
        .vi-by { font-size: 0.85rem; color: var(--primary); font-weight: 500; font-style: italic; }
        
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-content { width: 100%; max-width: 450px; padding: 30px; border-radius: 12px; }
        .modal-header { display: flex; justify-content: space-between; margin-bottom: 25px; }
        .modal-header h3 { color: var(--primary); }
        .btn-close { background: none; border: none; cursor: pointer; color: #999; font-size: 1.2rem; }
        
        .input-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
        .input-group label { font-size: 0.9rem; font-weight: 600; color: var(--text-muted); }
        .input-group input { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; }
        
        .btn-primary { display: flex; align-items: center; gap: 8px; background: var(--primary); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .btn-success { background: var(--success); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; }
        .btn-icon-danger { background: none; border: none; color: var(--error); cursor: pointer; padding: 4px; }
        .full-width { width: 100%; }
        
        .empty-state { text-align: center; padding: 60px; color: var(--text-muted); }
        .empty-state p { margin-top: 15px; }
      `}</style>
    </div>
  );
};

export default Gallery;
