"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Plus, Heart, MessageCircle, Share2, User, Trash2, PlayCircle, Maximize, X, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  collection, addDoc, query, orderBy, onSnapshot, 
  serverTimestamp, doc, deleteDoc, updateDoc, 
  increment, arrayUnion, arrayRemove, where 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { transformMediaLink } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import FriendSuggestions from './FriendSuggestions';

interface LancesFeedProps {
  groupId?: string;
  isSocial?: boolean;
}

export default function LancesFeed({ groupId, isSocial }: LancesFeedProps) {
  const { profile, user } = useAuth();
  const searchParams = useSearchParams();
  const [lances, setLances] = useState<any[]>([]);
  const [groupMatches, setGroupMatches] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [fullscreenVideo, setFullscreenVideo] = useState<string | null>(null);
  const [newLink, setNewLink] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'gol' | 'assistencia' | 'engracado' | 'outro'>('outro');
  
  // Navigation states for Folder view
  const [activeFolder, setActiveFolder] = useState<string | null>(null); // Match ID
  const [activePlayer, setActivePlayer] = useState<string | null>(null); // Player UID

  // Fetch matches if it's a group feed
  useEffect(() => {
    if (!groupId) return;
    const q = query(collection(db, 'matches'), where('groupId', '==', groupId));
    const unsubscribe = onSnapshot(q, (snap) => {
      const matches = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      matches.sort((a: any, b: any) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      });
      setGroupMatches(matches);
    });
    return () => unsubscribe();
  }, [groupId]);

  // Fetch lances from Firestore in real-time
  useEffect(() => {
    if (!profile && !groupId) return;

    let q;
    if (groupId) {
      // Group Feed
      q = query(
        collection(db, 'lances'), 
        where('groupId', '==', groupId)
      );
    } else if (isSocial) {
      // Social Feed (Friends only)
      const allowedUids = [...(profile?.friends || []), profile?.uid || ''];
      q = query(
        collection(db, 'lances'),
        where('uid', 'in', allowedUids.slice(0, 30))
      );
    } else {
      // Default (All)
      q = query(collection(db, 'lances'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lancesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort client-side
      lancesData.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setLances(lancesData);
    });
    return () => unsubscribe();
  }, [profile, groupId, isSocial]);

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
        createdAt: serverTimestamp(),
        groupId: groupId || null,
        matchId: selectedMatchId || null,
        category: selectedCategory
      });
      
      setIsAdding(false);
      setNewLink('');
      setNewDesc('');
      setSelectedMatchId(null);
      setSelectedCategory('outro');
    } catch (error) {
      console.error(error);
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

  // Logic to group lances for Group view by PLAYER (Global for group)
  const groupPlayers = Array.from(new Set(lances.map(l => l.uid))).map(uid => {
    const l = lances.find(l => l.uid === uid);
    return { 
      uid, 
      name: l.author, 
      photoURL: l.authorPhoto,
      totalLances: lances.filter(lan => lan.uid === uid).length
    };
  });

  const currentPlayerLances = activePlayer ? lances.filter(l => l.uid === activePlayer) : [];

  return (
    <div className="fade-in" style={{ paddingTop: '1rem' }}>
      {isSocial && !groupId && <FriendSuggestions />}
      
      {!groupId && (
        <header style={{ marginBottom: '1.5rem', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Lances</h1>
            <p style={{ color: 'var(--secondary)' }}>Momentos épicos da rede</p>
          </div>
          <button onClick={() => setIsAdding(true)} style={{ width: '45px', height: '45px', borderRadius: '14px', background: 'var(--primary-gradient)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px var(--primary-glow)' }}>
            <Plus size={24} strokeWidth={3} />
          </button>
        </header>
      )}

      {groupId && (
         <div style={{ marginBottom: '1.5rem', padding: '0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Galeria de Craques</h3>
              <button 
                onClick={() => setIsAdding(true)}
                style={{ background: 'var(--primary)', color: 'black', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '900' }}
              >
                POSTAR LANCE
              </button>
            </div>
            
            {activePlayer && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', alignItems: 'center', fontSize: '12px', fontWeight: '800' }}>
                <button onClick={() => setActivePlayer(null)} style={{ color: 'var(--primary)', background: 'none', border: 'none' }}>TODOS JOGADORES</button>
                <ChevronRight size={14} color="var(--secondary)" />
                <span style={{ color: 'white' }}>Lances de {groupPlayers.find(p => p.uid === activePlayer)?.name.split(' ')[0]}</span>
              </div>
            )}
         </div>
      )}

      {/* Group Player Folders (General/All-time) */}
      {groupId && !activePlayer && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {groupPlayers.map(p => (
            <motion.div 
              key={p.uid} 
              whileTap={{ scale: 0.95 }}
              onClick={() => setActivePlayer(p.uid)}
              className="glass" 
              style={{ padding: '1.5rem', borderRadius: '24px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--border)' }}
            >
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--surface)', overflow: 'hidden', margin: '0 auto', border: '2px solid var(--primary)' }}>
                  <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
              <p style={{ fontWeight: '900', fontSize: '14px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name.split(' ')[0]}</p>
              <p style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '700' }}>{p.totalLances} Momentos</p>
            </motion.div>
          ))}
          {groupPlayers.length === 0 && <p style={{ gridColumn: 'span 2', textAlign: 'center', padding: '4rem 2rem', color: 'var(--secondary)' }}>Ainda não há lances registrados neste grupo.</p>}
        </div>
      )}


      {/* Player Highlights (Grouped by Category) */}
      {groupId && activePlayer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {['gol', 'assistencia', 'engracado', 'outro'].map(cat => {
            const catLances = currentPlayerLances.filter(l => l.category === cat);
            if (catLances.length === 0) return null;
            
            return (
              <div key={cat}>
                <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {cat === 'gol' && '⚽ GOLS HISTÓRICOS'}
                  {cat === 'assistencia' && '👟 ASSISTÊNCIAS'}
                  {cat === 'engracado' && '🤣 MELHORES RESENHAS'}
                  {cat === 'outro' && '🎥 OUTROS LANCES'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {catLances.map(lance => (
                    <LanceCard 
                      key={lance.id} 
                      lance={lance} 
                      profile={profile} 
                      handleDelete={handleDelete} 
                      handleLike={handleLike} 
                      setFullscreenVideo={setFullscreenVideo} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!groupId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {lances.map((lance) => (
            <LanceCard 
              key={lance.id} 
              lance={lance} 
              profile={profile} 
              handleDelete={handleDelete} 
              handleLike={handleLike} 
              setFullscreenVideo={setFullscreenVideo} 
            />
          ))}
        </div>
      )}

      {isAdding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '28px' }}>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: '900' }}>Postar Novo Lance</h3>
            
            {groupId && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '6px' }}>SELECIONE A PARTIDA</label>
                <select 
                  value={selectedMatchId || ''} 
                  onChange={e => setSelectedMatchId(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                >
                  <option value="">Escolher Pelada...</option>
                  {groupMatches.map(m => <option key={m.id} value={m.id}>{m.date} - {m.location}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '6px' }}>CATEGORIA</label>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {[
                  { id: 'gol', label: 'Gol', icon: '⚽' },
                  { id: 'assistencia', label: 'Assis.', icon: '👟' },
                  { id: 'engracado', label: 'Resenha', icon: '🤣' },
                  { id: 'outro', label: 'Lance', icon: '🎥' }
                ].map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    style={{ 
                      flexShrink: 0, padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800',
                      background: selectedCategory === cat.id ? 'var(--primary)' : 'var(--surface)',
                      color: selectedCategory === cat.id ? 'black' : 'white',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

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
              <button onClick={handleAddLance} style={{ flex: 2, padding: '12px', borderRadius: '12px', background: 'var(--primary-gradient)', color: 'black', fontWeight: '700' }}>Postar</button>
            </div>
          </div>
        </div>
      )}

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {lances.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--secondary)', padding: '2rem' }}>Nenhum lance por aqui ainda.</p>
        )}
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
                  <Link href={`/perfil/${lance.uid}`} style={{ fontSize: '14px', fontWeight: '700', color: 'white', textDecoration: 'none' }}>{lance.author}</Link>
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
            <div style={{ 
              width: '100%', 
              position: 'relative',
              paddingTop: lance.type === 'video' ? '56.25%' : '100%',
              background: '#000', 
              borderRadius: '20px',
              overflow: 'hidden',
              marginBottom: '16px',
              border: '1px solid var(--border)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
            }}>
              {lance.type === 'video' ? (
                <>
                  <iframe 
                    src={transformMediaLink(lance.url, true)} 
                    style={{ 
                      position: 'absolute', top: 0, left: 0,
                      width: '100%', height: '100%', border: 'none',
                      objectFit: 'contain'
                    }} 
                    allow="autoplay; encrypted-media; picture-in-picture"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={() => setFullscreenVideo(transformMediaLink(lance.url, true))}
                    style={{
                      position: 'absolute', top: '12px', right: '12px',
                      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                      color: 'white', padding: '8px 12px', borderRadius: '10px',
                      fontSize: '10px', fontWeight: '800', display: 'flex',
                      alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10
                    }}
                  >
                    <Maximize size={14} /> EXPANDIR
                  </button>
                </>
              ) : (
                <img 
                  src={lance.url} 
                  alt="Highlight" 
                  referrerPolicy="no-referrer"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
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
              </div>
              
              <p style={{ fontSize: '14px', lineHeight: '1.4', marginBottom: '16px' }}>
                <span style={{ fontWeight: '700', marginRight: '8px' }}>{lance.author}</span>
                {lance.description}
              </p>

              {/* Comment Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                      flex: 1, background: 'var(--surface)', 
                      border: '1px solid var(--border)', borderRadius: '8px', 
                      padding: '8px 12px', fontSize: '12px', color: 'white' 
                    }} 
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {fullscreenVideo && (
        <VideoOverlay url={fullscreenVideo} onClose={() => setFullscreenVideo(null)} />
      )}
    </div>
  );
}

// Sub-components and Helpers
function LanceCard({ lance, profile, handleDelete, handleLike, setFullscreenVideo }: any) {
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !profile) return;
    
    try {
      const lanceRef = doc(db, 'lances', lance.id);
      await updateDoc(lanceRef, {
        comments: arrayUnion({
          uid: profile.uid,
          author: profile.name,
          text: commentText,
          createdAt: new Date().toISOString()
        })
      });
      setCommentText('');
      setIsCommenting(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'LineUp - Lance Épico',
      text: `${lance.author} postou um lance: ${lance.description}`,
      url: window.location.href.split('?')[0] + `?id=${lance.id}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copiado!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div 
      id={`lance-${lance.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass" 
      style={{ 
        borderRadius: '24px', 
        overflow: 'hidden', 
        border: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.02)'
      }}
    >
      {/* Author Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <img 
              src={lance.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${lance.author}`} 
              alt="" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          <div>
            <Link href={`/perfil/${lance.uid}`} style={{ fontSize: '14px', fontWeight: '800', color: 'white', textDecoration: 'none' }}>{lance.author}</Link>
            <p style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '600' }}>{formatTime(lance.createdAt)}</p>
          </div>
        </div>
        
        { (profile?.uid === lance.uid || profile?.role === 'admin') && (
          <button onClick={() => handleDelete(lance.id)} style={{ color: 'rgba(255,100,100,0.5)', background: 'none', border: 'none' }}>
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Media Content */}
      <div style={{ 
        width: '100%', 
        position: 'relative',
        paddingTop: lance.type === 'video' ? '56.25%' : '100%',
        background: '#000'
      }}>
        {lance.type === 'video' ? (
          <>
            <iframe 
              src={transformMediaLink(lance.url, true)} 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} 
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => setFullscreenVideo(transformMediaLink(lance.url, true))}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                color: 'white', padding: '8px 12px', borderRadius: '12px',
                fontSize: '10px', fontWeight: '800', display: 'flex',
                alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10
              }}
            >
              <Maximize size={14} /> EXPANDIR
            </button>
          </>
        ) : (
          <img 
            src={lance.url} 
            alt="" 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
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
              size={24} 
              color={lance.likedBy?.includes(profile?.uid) ? "var(--primary)" : "white"} 
              fill={lance.likedBy?.includes(profile?.uid) ? "var(--primary)" : "none"} 
            />
            <span style={{ fontSize: '14px', fontWeight: '800' }}>{lance.likes || 0}</span>
          </button>
          <button onClick={() => setIsCommenting(!isCommenting)} style={{ background: 'none', border: 'none', color: 'white' }}>
            <MessageCircle size={24} />
          </button>
          <button onClick={handleShare} style={{ background: 'none', border: 'none', color: 'white', marginLeft: 'auto' }}>
            <Share2 size={24} />
          </button>
        </div>
        
        {lance.description && (
          <p style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
            <span style={{ fontWeight: '900', marginRight: '8px' }}>{lance.author}</span>
            {lance.description}
          </p>
        )}

        {/* Comments Section */}
        {lance.comments?.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '10px', marginTop: '10px' }}>
            {lance.comments.slice(-2).map((c: any, i: number) => (
              <p key={i} style={{ fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: '800', marginRight: '6px' }}>{c.author}</span>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{c.text}</span>
              </p>
            ))}
            {lance.comments.length > 2 && (
              <button style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '11px', fontWeight: '700', padding: 0 }}>Ver todos os {lance.comments.length} comentários</button>
            )}
          </div>
        )}

        {isCommenting && (
          <form onSubmit={handleComment} style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <input 
              autoFocus
              placeholder="Escreva um comentário..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: 'white' }}
            />
            <button type="submit" style={{ background: 'var(--primary)', color: 'black', border: 'none', borderRadius: '10px', padding: '0 12px', fontWeight: '800', fontSize: '11px' }}>POSTAR</button>
          </form>
        )}
      </div>
    </motion.div>
  );
}

function VideoOverlay({ url, onClose }: { url: string, onClose: () => void }) {
  return (
    <div 
      style={{ 
        position: 'fixed', inset: 0, background: '#000', zIndex: 9999999, 
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <button 
        onClick={onClose} 
        style={{ 
          position: 'absolute', top: 'env(safe-area-inset-top, 20px)', right: '20px', zIndex: 10,
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
          color: 'white', border: '1px solid rgba(255,255,255,0.2)',
          width: '40px', height: '40px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <X size={24} />
      </button>
      <div style={{ width: '100%', maxWidth: '100vw', maxHeight: '100vh', position: 'relative', paddingTop: '56.25%' }}>
        <iframe 
          src={url} 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} 
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="no-referrer"
          allowFullScreen
        />
      </div>
    </div>
  );
}

function formatTime(timestamp: any) {
  if (!timestamp) return 'Agora mesmo';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return 'Agora mesmo';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return date.toLocaleDateString('pt-BR');
}
