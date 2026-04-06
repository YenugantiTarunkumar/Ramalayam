import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAnnouncements, addAnnouncement, deleteAnnouncement, Announcement } from "@/services/announcementService";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

const AnnouncementsBoard: React.FC = () => {
  const { role, user } = useAuth();
  const { t, i18n } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [titleTe, setTitleTe] = useState("");
  const [detailsTe, setDetailsTe] = useState("");
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
      await addAnnouncement({ 
        title, 
        details,
        titleTe: titleTe || title,
        detailsTe: detailsTe || details
      });
      setShowForm(false);
      setTitle(""); setDetails(""); setTitleTe(""); setDetailsTe("");
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
        <h3>📢 {t('announcements.board')}</h3>
        {isAdmin && !showForm && (
          <button className="btn-text highlight" onClick={() => setShowForm(true)}>+ {t('announcements.new')}</button>
        )}
      </div>

      {showForm && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="admin-form"
        >
          <form onSubmit={handleCreate}>
            <div className="input-row">
              <input 
                type="text" 
                placeholder={t('announcements.titleEn')} 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
              />
              <input 
                type="text" 
                placeholder={t('announcements.titleTe')} 
                value={titleTe} 
                onChange={e => setTitleTe(e.target.value)} 
              />
            </div>
            <textarea 
              placeholder={t('announcements.detailsEn')} 
              value={details} 
              onChange={e => setDetails(e.target.value)} 
              required 
              rows={2} 
            />
            <textarea 
              placeholder={t('announcements.detailsTe')} 
              value={detailsTe} 
              onChange={e => setDetailsTe(e.target.value)} 
              rows={2} 
            />
            <div className="form-actions">
              <button type="button" className="btn-text" onClick={() => setShowForm(false)}>{t('cancel') || 'Cancel'}</button>
              <button type="submit" className="btn-success" disabled={submitting}>{t('announcements.post')}</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="messages-list">
        <AnimatePresence>
          {announcements.map((ann) => {
            const displayTitle = i18n.language === 'te' ? (ann.titleTe || ann.title) : ann.title;
            const displayDetails = i18n.language === 'te' ? (ann.detailsTe || ann.details) : ann.details;

            return (
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
                <h4 className="msg-title">{displayTitle}</h4>
                <p className="msg-desc">{displayDetails}</p>
                <span className="msg-date">{ann.createdAt?.toLocaleString()}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {announcements.length === 0 && !showForm && (
          <p className="empty-state">{t('announcements.empty')}</p>
        )}
      </div>

      <style jsx>{`
        .announcements-container { padding: 25px; margin-bottom: 30px; }
        .board-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;}
        .board-header h3 { color: var(--primary); font-size: 1.3rem; }
        .highlight { color: var(--primary); font-weight: bold; background: rgba(255,153,51,0.1); border-radius: 4px; padding: 4px 10px; }
        
        .admin-form { margin-bottom: 20px; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px dashed var(--primary); }
        .input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .admin-form input, .admin-form textarea { width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 10px; border-radius: 6px; margin-bottom: 10px; font-family: inherit; }
        .admin-form input::placeholder, .admin-form textarea::placeholder { color: rgba(255,255,255,0.5); }
        
        .form-actions { display: flex; justify-content: flex-end; gap: 10px; }
        .btn-success { background: var(--success); color: white; border: none; padding: 6px 16px; border-radius: 4px; font-weight: 600; cursor: pointer;}
        
        .messages-list { display: flex; flex-direction: column; gap: 15px; max-height: 400px; overflow-y: auto; padding-right: 5px;}
        .message-card { background: rgba(255,255,255,0.1); padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-left: 4px solid var(--primary); position: relative;}
        .msg-title { margin-bottom: 6px; color: var(--primary); font-size: 1.1rem;}
        .msg-desc { font-size: 0.95rem; color: #fff; line-height: 1.5; margin-bottom: 8px; white-space: pre-wrap; opacity: 0.9;}
        .msg-date { font-size: 0.75rem; color: rgba(255,255,255,0.5); }
        
        .del-btn { position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: var(--error); cursor: pointer; opacity: 0.5; transition: 0.2s;}
        .del-btn:hover { opacity: 1; transform: scale(1.2); }
        .empty-state { text-align: center; color: rgba(255,255,255,0.5); font-size: 0.9rem; padding: 20px 0;}
      `}</style>
    </div>
  );
};


export default AnnouncementsBoard;
