"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Plus, Heart, MessageCircle, Share2, User, Trash2, PlayCircle, Maximize } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { transformMediaLink } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

function LancesContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [lances, setLances] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [newLink, setNewLink] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Fetch lances from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, 'lances'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lancesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLances(lancesData);
    });
    return () => unsubscribe();
  }, []);

  // Scroll to shared lance
  useEffect(() => {
    const lanceId = searchParams.get('id');
    if (lanceId && lances.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`lance-${lanceId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [searchParams, lances]);

  const handleAddLance = async () => {
    if (!newLink || !profile) return;
    const transformed = transformMediaLink(newLink, true);
    const isVideo = transformed.includes('drive.google.com') || transformed.includes('youtube.com/embed');
    
    try {
      await addDoc(collection(db, 'lances'), {
        uid: profile.uid,
        author: profile.name,
        authorPhoto: profile.photoURL || '',
        type: isVideo ? 'video' : 'image',
        url: transformed,
        description: newDesc,
        likes: 0,
        likedBy: [],
        time: 'Agora',
        createdAt: serverTimestamp()
      });
      
      setIsAdding(false);
      setNewLink('');
      setNewDesc('');
    } catch (error) {
      console.error("Error adding lance:", error);
      alert("Erro ao postar lance.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja excluir este lance permanentemente?")) {
      try {
        await deleteDoc(doc(db, 'lances', id));
      } catch (e) {
        alert("Erro ao excluir lance.");
      }
    }
  };

  const handleLike = async (id: string) => {
    if (!profile || !profile.uid) return;
    const lance = lances.find(l => l.id === id);
    if (!lance) return;

    const lanceRef = doc(db, 'lances', id);
    const hasLiked = lance.likedBy?.includes(profile.uid);

    try {
      if (hasLiked) {
        await updateDoc(lanceRef, {
          likes: increment(-1),
          likedBy: arrayRemove(profile.uid)
        });
      } else {
        await updateDoc(lanceRef, {
          likes: increment(1),
          likedBy: arrayUnion(profile.uid)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async (lance: any) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?id=${lance.id}`;
    
    const shareData = {
      title: 'Show de Resenha FC - Lance Épico',
      text: `Confira esse lance de ${lance.author}: ${lance.description}`,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link do lance copiado!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Agora';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('pt-BR');
  };

  const handleComment = async (id: string, text: string) => {
    if (!text || !profile) return;
    try {
      const lanceRef = doc(db, 'lances', id);
      const lanceDoc = lances.find(l => l.id === id);
      const newComment = {
        author: profile.name,
        text: text,
        createdAt: new Date().toISOString()
      };
      
      const updatedComments = [...(lanceDoc.comments || []), newComment];
      
      await updateDoc(lanceRef, {
        comments: updatedComments
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fade-in">
      <header style={{ 
        marginBottom: '1.5rem', 
        paddingTop: '1rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Lances</h1>
          <p style={{ color: 'var(--secondary)' }}>Momentos épicos da pelada</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '50%', 
            background: 'var(--primary)', 
            color: 'black',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px var(--primary-glow)'
          }}
        >
          <Plus size={24} strokeWidth={3} />
        </button>
      </header>

      {/* Add Modal */}
      {isAdding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '20px', borderRadius: '24px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Novo Lance</h3>
            <input 
              placeholder="Link do Google Drive ou Imagem" 
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white', marginBottom: '10px' }}
            />
            <textarea 
              placeholder="Descrição" 
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white', marginBottom: '20px', height: '80px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsAdding(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--border)' }}>Cancelar</button>
              <button onClick={handleAddLance} style={{ flex: 2, padding: '12px', borderRadius: '12px', background: 'var(--primary)', color: 'black', fontWeight: '700' }}>Postar</button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {lances.map((lance) => (
          <motion.div 
            key={lance.id} 
            id={`lance-${lance.id}`}
            className="glass" 
            style={{ 
              borderRadius: '24px', 
              overflow: 'hidden', 
              border: searchParams.get('id') === lance.id ? '2px solid var(--primary)' : '1px solid var(--border)' 
            }}
          >
            {/* Author Header */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {lance.authorPhoto ? (
                    <img src={lance.authorPhoto} alt={lance.author} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={16} color="var(--secondary)" />
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '700' }}>{lance.author}</p>
                  <p style={{ fontSize: '10px', color: 'var(--secondary)' }}>
                    {formatTime(lance.createdAt)}
                  </p>
                </div>
              </div>
              
              { (profile?.uid === lance.uid || profile?.role === 'admin') && (
                <button onClick={() => handleDelete(lance.id)} style={{ color: 'var(--error)', opacity: 0.6 }}>
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* Media Content */}
            <div style={{ width: '100%', aspectRatio: lance.type === 'video' ? '16/9' : '1/1', background: '#000', position: 'relative' }}>
              {lance.type === 'video' ? (
                <>
                  <iframe 
                    src={lance.url} 
                    style={{ width: '100%', height: '100%', border: 'none' }} 
                    allow="autoplay; encrypted-media; picture-in-picture"
                    referrerPolicy="no-referrer"
                    allowFullScreen
                  />
                  <button 
                    onClick={() => setFullscreenVideo(lance.url)}
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 'bold', zIndex: 10 }}
                  >
                    <Maximize size={14} /> EXPANDIR
                  </button>
                </>
              ) : (
                <img 
                  src={lance.url} 
                  alt="Highlight" 
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              )}
            </div>

            {/* Interaction Footer */}
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <button 
                  onClick={() => handleLike(lance.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'white' }}
                >
                  <Heart 
                    size={22} 
                    color={lance.likedBy?.includes(profile?.uid) ? "var(--primary)" : "white"} 
                    fill={lance.likedBy?.includes(profile?.uid) ? "var(--primary)" : "none"} 
                  />
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{lance.likes || 0}</span>
                </button>
                <button style={{ background: 'none', border: 'none', color: 'white' }}>
                  <MessageCircle size={22} />
                </button>
                <button 
                  onClick={() => handleShare(lance)}
                  style={{ background: 'none', border: 'none', color: 'white' }}
                >
                  <Share2 size={22} />
                </button>
              </div>
              
              <p style={{ fontSize: '14px', lineHeight: '1.4', marginBottom: '16px' }}>
                <span style={{ fontWeight: '700', marginRight: '8px' }}>{lance.author}</span>
                {lance.description}
              </p>

              {/* Comments Display */}
              {lance.comments && lance.comments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginBottom: '16px' }}>
                  {lance.comments.map((c: any, i: number) => (
                    <div key={i} style={{ fontSize: '12px' }}>
                      <span style={{ fontWeight: '700', marginRight: '6px' }}>{c.author}</span>
                      <span style={{ color: 'var(--secondary)' }}>{c.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment Input */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Adicione um comentário..."
                  onKeyDown={(e: any) => {
                    if (e.key === 'Enter') {
                      handleComment(lance.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  style={{ 
                    flex: 1, 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    padding: '8px 12px', 
                    fontSize: '12px', 
                    color: 'white' 
                  }} 
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--secondary)' }}>
        <p style={{ fontSize: '14px' }}>Você chegou ao fim dos lances.</p>
        <button style={{ color: 'var(--primary)', fontWeight: '600', marginTop: '8px', background: 'none', border: 'none' }}>
          Ver lances antigos
        </button>
      </div>

      {/* Fullscreen Video Overlay */}
      {fullscreenVideo && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 9999999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', paddingTop: 'env(safe-area-inset-top, 20px)' }}>
            <button onClick={() => setFullscreenVideo(null)} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold' }}>
              FECHAR
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <iframe 
              src={fullscreenVideo} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function LancesPage() {
  return (
    <React.Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--primary)' }}>Carregando Lances...</div>}>
      <LancesContent />
    </React.Suspense>
  );
}
