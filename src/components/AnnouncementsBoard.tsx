"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAnnouncements, addAnnouncement, deleteAnnouncement, Announcement } from "@/services/announcementService";
import { motion, AnimatePresence } from "framer-motion";

const AnnouncementsBoard: React.FC = () => {
  const { role, user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = role === "admin" || user?.email === "tarunkummaryenuganti07@gmail.com";

  useEffect(() => {
    const unsubscribe = getAnnouncements((all) => {
      setAnnouncements(all);
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !details) return;
    setSubmitting(true);
    
    try {
      await addAnnouncement({ title, details });
      setShowForm(false);
      setTitle(""); setDetails("");
    } catch(err) {
      console.error(err);
      alert("Failed to post announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this announcement?")) {
      await deleteAnnouncement(id);
    }
  };

  return (
    <div className="announcements-container glass">
      <div className="board-header">
        <h3>📢 Announcements</h3>
        {isAdmin && !showForm && (
          <button className="btn-text highlight" onClick={() => setShowForm(true)}>+ New</button>
        )}
      </div>

      {showForm && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="admin-form"
        >
          <form onSubmit={handleCreate}>
            <input 
              type="text" 
              placeholder="Announcement Title (e.g. Committee Meeting)" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required 
            />
            <textarea 
              placeholder="Details..." 
              value={details} 
              onChange={e => setDetails(e.target.value)} 
              required 
              rows={3} 
            />
            <div className="form-actions">
              <button type="button" className="btn-text" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-success" disabled={submitting}>Post</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="messages-list">
        <AnimatePresence>
          {announcements.map((ann) => (
            <motion.div 
              key={ann.id}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 10, opacity: 0 }}
              className="message-card"
            >
              {isAdmin && (
                <button className="del-btn" onClick={() => handleDelete(ann.id!)}>✕</button>
              )}
              <h4 className="msg-title">{ann.title}</h4>
              <p className="msg-desc">{ann.details}</p>
              <span className="msg-date">{ann.createdAt?.toLocaleString()}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {announcements.length === 0 && !showForm && (
          <p className="empty-state">No active announcements.</p>
        )}
      </div>

      <style jsx>{`
        .announcements-container { padding: 25px; margin-bottom: 30px; }
        .board-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 10px;}
        .board-header h3 { color: var(--primary); font-size: 1.3rem; }
        .highlight { color: var(--primary); font-weight: bold; background: rgba(255,153,51,0.1); border-radius: 4px; padding: 4px 10px; }
        
        .admin-form { margin-bottom: 20px; background: rgba(0,0,0,0.02); padding: 15px; border-radius: 8px; border: 1px dashed var(--primary); }
        .admin-form input, .admin-form textarea { width: 100%; border: 1px solid #ddd; padding: 10px; border-radius: 6px; margin-bottom: 10px; font-family: inherit; }
        .form-actions { display: flex; justify-content: flex-end; gap: 10px; }
        .btn-success { background: var(--success); color: white; border: none; padding: 6px 16px; border-radius: 4px; font-weight: 600; cursor: pointer;}
        
        .messages-list { display: flex; flex-direction: column; gap: 15px; max-height: 400px; overflow-y: auto; padding-right: 5px;}
        .message-card { background: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border-left: 4px solid var(--accent); position: relative;}
        .msg-title { margin-bottom: 6px; color: var(--text-main); font-size: 1.05rem;}
        .msg-desc { font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 8px; white-space: pre-wrap;}
        .msg-date { font-size: 0.75rem; color: #aaa; }
        
        .del-btn { position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: var(--error); cursor: pointer; opacity: 0.5; transition: 0.2s;}
        .del-btn:hover { opacity: 1; transform: scale(1.2); }
        .empty-state { text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 20px 0;}
      `}</style>
    </div>
  );
};

export default AnnouncementsBoard;
