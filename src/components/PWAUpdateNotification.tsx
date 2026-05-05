"use client";

import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAUpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('pwa-update-available', handleUpdate);
    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '400px',
            zIndex: 9999,
          }}
        >
          <div className="glass" style={{
            padding: '16px',
            borderRadius: '20px',
            background: 'var(--primary-gradient)',
            color: 'black',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(29, 185, 84, 0.4)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RefreshCw size={20} className="spin-slow" />
            </div>
            
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '14px', fontWeight: '900', margin: 0 }}>Atualização Pronta!</h4>
              <p style={{ fontSize: '11px', fontWeight: '600', opacity: 0.8, margin: 0 }}>Novidades chegaram no LineUp.</p>
            </div>

            <button 
              onClick={handleRefresh}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                background: 'black',
                color: 'white',
                fontSize: '11px',
                fontWeight: '900'
              }}
            >
              REINICIAR
            </button>

            <button 
              onClick={() => setUpdateAvailable(false)}
              style={{ opacity: 0.5 }}
            >
              <X size={18} />
            </button>
          </div>
          
          <style jsx>{`
            .spin-slow {
              animation: spin 3s linear infinite;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
