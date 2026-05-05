"use client";

import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if it's iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      setShowIOSPrompt(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  if (!isVisible) return null;
  if (!installPrompt && !showIOSPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '400px',
      zIndex: 2000,
      animation: 'slideUp 0.5s ease-out'
    }}>
      <div className="glass" style={{
        padding: '16px',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        border: '1px solid var(--primary)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'black'
        }}>
          {showIOSPrompt ? <Share size={20} /> : <Download size={20} />}
        </div>
        
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', margin: 0 }}>Instalar LineUp</h4>
          <p style={{ fontSize: '11px', color: 'var(--secondary)', margin: '2px 0 0 0' }}>
            {showIOSPrompt 
              ? 'Toque em compartilhar e "Adicionar à Tela de Início"'
              : 'Tenha a melhor experiência no celular!'}
          </p>
        </div>

        {installPrompt && (
          <button 
            onClick={handleInstallClick}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              background: 'var(--primary)',
              color: 'black',
              fontSize: '12px',
              fontWeight: '800'
            }}
          >
            INSTALAR
          </button>
        )}

        <button 
          onClick={() => setIsVisible(false)}
          style={{ color: 'var(--secondary)', padding: '4px' }}
        >
          <X size={18} />
        </button>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
