"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { getPujas, addPuja, deletePuja, Puja } from "@/services/pujaService";
import { addAnnouncement } from "@/services/announcementService";
import { motion, AnimatePresence } from "framer-motion";

const PujaBrowser: React.FC = () => {
  const { role, user } = useAuth();
  const { t } = useTranslation();
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [fee, setFee] = useState("0");
  const [itemsText, setItemsText] = useState("");
  const [description, setDescription] = useState("");
  const [isOpenForAll, setIsOpenForAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPrivileged = role === "admin" || role === "committee";
  const isMasterAdmin = user?.email === "tarunkummaryenuganti07@gmail.com";

  useEffect(() => {
    const unsubscribe = getPujas((all) => {
      setPujas(all);
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const itemsList = itemsText.split(",").map(i => i.trim()).filter(i => i);
      await addPuja({
        name,
        date,
        time,
        venue,
        fee: parseFloat(fee) || 0,
        items: itemsList,
        description,
        isOpenForAll
      });
      
      // Automatically post an Announcement for this new Puja
      await addAnnouncement({
        title: `🗓️ New Puja Scheduled: ${name}`,
        details: `We have scheduled a new Puja on ${date} at ${time}. \nVenue: ${venue}\nDescription: ${description}`
      });

      setShowForm(false);
      // Reset form
      setName(""); setDate(""); setTime(""); setVenue(""); setFee("0"); setItemsText(""); setDescription(""); setIsOpenForAll(false);
    } catch(err) {
      console.error(err);
      alert("Failed to create Puja");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this Puja?")) {
      await deletePuja(id);
    }
  };

  return (
    <div className="puja-container fade-in">
      <div className="puja-header">
        <h2>Pujas</h2>
        {isPrivileged && !showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Create New Puja</button>
        )}
      </div>

      {showForm && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass create-form"
        >
          <h3>Create Puja Listing</h3>
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="input-group">
                <label>Puja Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Maha ShivaRathri Abhishekam" />
              </div>
              <div className="input-group">
                <label>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Venue / Location</label>
                <input type="text" value={venue} onChange={e => setVenue(e.target.value)} required placeholder="Main Temple Hall" />
              </div>
              <div className="input-group">
                <label>Entry Fee (₹)</label>
                <input type="number" value={fee} onChange={e => setFee(e.target.value)} min="0" required />
              </div>
              <div className="input-group full-width">
                <label>Required Items (Comma separated)</label>
                <input type="text" value={itemsText} onChange={e => setItemsText(e.target.value)} placeholder="Flowers, Coconuts, Incense sticks" required />
              </div>
              <div className="input-group full-width">
                <label>Description & Restrictions (Dress code, etc.)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} required placeholder="Traditional wear mandatory. Please arrive 15 minutes early." />
              </div>
              <div className="input-group full-width checkbox-group">
                <label>
                  <input type="checkbox" checked={isOpenForAll} onChange={e => setIsOpenForAll(e.target.checked)} />
                  Open for all (Hide booking requirement)
                </label>
              </div>
            </div>
            <div className="form-footer">
              <button type="button" onClick={() => setShowForm(false)} className="btn-text">Cancel</button>
              <button type="submit" className="btn-success" disabled={submitting}>
                {submitting ? "Saving..." : "Publish Puja"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {!showForm && pujas.length === 0 && (
        <div className="empty-state glass">
          <h3>No Pujas Available</h3>
          <p>There are currently no scheduled pujas. Please check back later.</p>
        </div>
      )}

      {!showForm && pujas.length > 0 && (
        <div className="puja-grid">
          <AnimatePresence>
            {pujas.map((puja) => (
              <motion.div 
                key={puja.id}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="puja-card glass-dark"
              >
                {(isMasterAdmin || role === 'admin') && (
                  <button className="del-btn" onClick={() => handleDelete(puja.id!)}>✕</button>
                )}
                
                <div className="pc-header">
                  <h3>{puja.name}</h3>
                  <span className="fee badge cash_in">
                    {puja.fee > 0 ? `₹ ${puja.fee}` : 'Free Entry'}
                  </span>
                </div>
                
                <div className="pc-meta">
                  <div className="meta-item">📅 {puja.date}</div>
                  <div className="meta-item">⏰ {puja.time}</div>
                  <div className="meta-item">📍 {puja.venue}</div>
                </div>

                <div className="pc-body">
                  <div className="desc">
                    <strong>Details:</strong>
                    <p>{puja.description}</p>
                  </div>
                  
                  {puja.items && puja.items.length > 0 && (
                    <div className="items-list">
                      <strong>Required Items:</strong>
                      <ul>
                        {puja.items.map((it, idx) => <li key={idx}>✅ {it}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                {!puja.isOpenForAll && (
                  <div className="pc-footer">
                    <button className="btn-primary full-width" onClick={() => alert("Reservation functionality coming soon!")}>
                      Reserve Spot
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <style jsx>{`
        .puja-container { padding: 20px 0; }
        .puja-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .puja-header h2 { font-size: 1.8rem; color: var(--text-main); }
        
        .create-form { padding: 30px; margin-bottom: 30px; }
        .create-form h3 { margin-bottom: 20px; font-size: 1.4rem; color: var(--accent); }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .full-width { grid-column: 1 / -1; }
        .input-group label { font-size: 0.9rem; font-weight: 600; color: var(--text-muted); }
        .input-group input, .input-group textarea { padding: 12px; border: 1px solid #ddd; border-radius: 8px; background: white; font-family: inherit;}
        .checkbox-group label { display: flex; align-items: center; gap: 10px; cursor: pointer; color: var(--text-main); }
        .checkbox-group input { width: 18px; height: 18px; cursor: pointer; }
        .form-footer { display: flex; justify-content: flex-end; gap: 15px; margin-top: 25px; }
        .btn-success { background: var(--success); color: white; border: none; padding: 10px 24px; border-radius: var(--radius-sm); font-weight: 600; cursor: pointer;}
        
        .empty-state { text-align: center; padding: 60px 20px; }
        .empty-state h3 { color: var(--error); margin-bottom: 10px; }
        .empty-state p { color: var(--text-muted); }

        .puja-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; }
        .puja-card { padding: 25px; position: relative; display: flex; flex-direction: column; }
        .del-btn { position: absolute; top: 15px; right: 15px; background: rgba(255,0,0,0.1); border: none; color: var(--error); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;}
        .del-btn:hover { background: var(--error); color: white; }
        
        .pc-header { padding-right: 40px; margin-bottom: 15px; }
        .pc-header h3 { font-size: 1.3rem; margin-bottom: 8px; color: var(--primary); }
        
        .pc-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .meta-item { font-size: 0.85rem; background: rgba(0,0,0,0.03); padding: 4px 10px; border-radius: 20px; color: var(--text-muted); font-weight: 500;}
        
        .pc-body { flex: 1; }
        .desc p { font-size: 0.9rem; margin-top: 4px; line-height: 1.5; color: var(--text-muted); }
        .items-list { margin-top: 15px; }
        .items-list ul { list-style: none; padding-left: 0; margin-top: 5px; }
        .items-list li { font-size: 0.9rem; color: var(--text-main); margin-bottom: 4px; display: flex; align-items: flex-start; gap: 6px; }
        
        .pc-footer { margin-top: 25px; }
        .full-width { width: 100%; text-align: center; }

        @media (max-width: 768px) {
          .form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default PujaBrowser;
