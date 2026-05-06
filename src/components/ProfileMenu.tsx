"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { User, Settings, ShieldCheck, LogOut, Camera, Bell, Check, X, UserPlus, HelpCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileMenuProps {
  show: boolean;
  onClose: () => void;
}


export default function ProfileMenu({ show, onClose }: ProfileMenuProps) {
  const { user, profile, logout, setProfile } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'menu' | 'settings' | 'alertas'>('menu');
  const [requestDetails, setRequestDetails] = useState<any[]>([]);

  // Fetch names/photos of people who sent requests
  useEffect(() => {
    if (show && profile?.friendRequests && profile.friendRequests.length > 0) {
      const fetchDetails = async () => {
        const details = await Promise.all(
          (profile.friendRequests || []).map(async (uid: string) => {
            const snap = await getDoc(doc(db, 'users', uid));
            return snap.exists() ? { uid, ...snap.data() } : null;
          })
        );
        setRequestDetails(details.filter(d => d !== null));
      };
      fetchDetails();
    }
  }, [show, profile?.friendRequests]);

  if (!profile) return null;

  const handleAcceptFriend = async (friendUid: string) => {
    if (!user) return;
    try {
      // 1. Add to my friends, remove from requests
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayUnion(friendUid),
        friendRequests: arrayRemove(friendUid)
      });
      // 2. Add me to their friends
      await updateDoc(doc(db, 'users', friendUid), {
        friends: arrayUnion(user.uid)
      });
      
      if (setProfile) {
        setProfile({
          ...profile,
          friends: [...(profile.friends || []), friendUid],
          friendRequests: (profile.friendRequests || []).filter(id => id !== friendUid)
        });
      }
    } catch (e) {
      alert("Erro ao aceitar pedido.");
    }
  };

  const handleDeclineFriend = async (friendUid: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friendRequests: arrayRemove(friendUid)
      });
      if (setProfile) {
        setProfile({
          ...profile,
          friendRequests: (profile.friendRequests || []).filter(id => id !== friendUid)
        });
      }
    } catch (e) {
      alert("Erro ao recusar pedido.");
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <div 
            onClick={onClose}
            style={{ 
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
              zIndex: 999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' 
            }}
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="glass"
            style={{ 
              position: 'absolute', top: '45px', right: '0px', width: '280px', zIndex: 1000, 
              borderRadius: '24px', padding: '10px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)', maxHeight: '85vh', overflowY: 'auto',
              transformOrigin: 'top right'
            }}
          >
            {activeTab === 'menu' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ padding: '8px 8px 12px 8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontWeight: '800', fontSize: '15px' }}>{profile.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '800' }}>{profile.role === 'admin' ? '⭐ ADMINISTRADOR' : '🏃 JOGADOR'}</p>
                </div>

                {[
                  { label: 'MEU PERFIL', icon: <User size={16} />, onClick: () => { onClose(); router.push(`/perfil/${profile.uid}`); }, color: '#3b82f6' },
                  { 
                    label: 'ALERTAS', 
                    icon: <Bell size={16} />, 
                    onClick: () => setActiveTab('alertas'), 
                    color: '#f87171',
                    badge: profile.friendRequests?.length
                  },
                  { label: 'AJUDA', icon: <HelpCircle size={16} />, onClick: () => { onClose(); router.push('/ajuda'); }, color: '#10b981' },
                  ...(profile.role === 'admin' ? [{ label: 'PAINEL ADMIN', icon: <ShieldCheck size={16} />, onClick: () => { onClose(); router.push('/admin'); }, color: '#f59e0b' }] : []),
                ].map((item, i) => (
                  <motion.button 
                    key={item.label}
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.1 + (i * 0.08) }}
                    onClick={item.onClick}
                    style={{ 
                      width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'none', border: 'none', 
                      display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '800', color: 'white',
                      textAlign: 'left', cursor: 'pointer', position: 'relative'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{ color: item.color }}>{item.icon}</div>
                    <span style={{ fontSize: '13px' }}>{item.label}</span>
                    {item.badge ? (
                      <span style={{ position: 'absolute', right: '14px', background: '#ef4444', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px', fontWeight: '900' }}>
                        {item.badge}
                      </span>
                    ) : null}
                  </motion.button>
                ))}

                <motion.button 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.1 + (4 * 0.08) }}
                  onClick={() => { logout(); onClose(); }}
                  style={{ 
                    width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: 'none', 
                    display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '800', color: '#ef4444',
                    textAlign: 'left', cursor: 'pointer', marginTop: '8px'
                  }}
                >
                  <LogOut size={16} />
                  <span style={{ fontSize: '13px' }}>SAIR DA CONTA</span>
                </motion.button>
              </div>
            ) : activeTab === 'alertas' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <button 
                    onClick={() => setActiveTab('menu')}
                    style={{ background: 'var(--surface)', color: 'white', padding: '8px', borderRadius: '10px', border: '1px solid var(--border)' }}
                  >
                    <X size={14} />
                  </button>
                  <h3 style={{ fontSize: '14px', fontWeight: '900' }}>Alertas & Convites</h3>
                </div>

                {requestDetails.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--secondary)' }}>
                    <Bell size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p style={{ fontSize: '12px' }}>Nenhum alerta novo.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {requestDetails.map((req) => (
                      <div key={req.uid} style={{ background: 'var(--surface)', padding: '12px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                            <img src={req.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '12px', fontWeight: '800' }}>{req.name}</p>
                            <p style={{ fontSize: '10px', color: 'var(--secondary)' }}>Quer ser seu amigo</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleAcceptFriend(req.uid)}
                            style={{ flex: 1, padding: '8px', borderRadius: '10px', background: 'var(--primary)', color: 'black', fontSize: '11px', fontWeight: '900', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                          >
                            <Check size={14} /> ACEITAR
                          </button>
                          <button 
                            onClick={() => handleDeclineFriend(req.uid)}
                            style={{ padding: '8px', borderRadius: '10px', background: 'var(--border)', color: 'white', fontSize: '11px', fontWeight: '900' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

