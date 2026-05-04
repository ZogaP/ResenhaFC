"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, UserPlus, Check, X, Users, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AmigosPage() {
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [requestsList, setRequestsList] = useState<any[]>([]);

  // Real-time listener for friends and requests
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const fIds = data.friends || [];
        const rIds = data.friendRequests || [];

        // Fetch Friend Details
        if (fIds.length > 0) {
          const fProfiles = await Promise.all(fIds.map(async (id: string) => {
            const snap = await getDoc(doc(db, 'users', id));
            return snap.exists() ? snap.data() : null;
          }));
          setFriendsList(fProfiles.filter(Boolean));
        } else {
          setFriendsList([]);
        }

        // Fetch Requests Details
        if (rIds.length > 0) {
          const rProfiles = await Promise.all(rIds.map(async (id: string) => {
            const snap = await getDoc(doc(db, 'users', id));
            return snap.exists() ? snap.data() : null;
          }));
          setRequestsList(rProfiles.filter(Boolean));
        } else {
          setRequestsList([]);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleSearch = async () => {
    if (searchTerm.trim().length < 3) {
      alert("Digite pelo menos 3 caracteres.");
      return;
    }
    
    setIsSearching(true);
    const cleanSearch = searchTerm.trim().toLowerCase().replace('@', '');
    
    try {
      const q = query(collection(db, 'users'), where('username', '==', cleanSearch));
      const snap = await getDocs(q);
      
      const results: any[] = [];
      snap.forEach(d => {
        if (d.id !== user?.uid) results.push(d.data());
      });
      
      setSearchResults(results);
      if (results.length === 0) alert("Usuário não encontrado.");
    } catch (e) {
      console.error(e);
      alert("Erro ao buscar usuário.");
    }
    setIsSearching(false);
  };

  const sendRequest = async (targetUid: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        friendRequests: arrayUnion(user.uid)
      });
      alert("Pedido enviado!");
    } catch (e) {
      alert("Erro ao enviar pedido.");
    }
  };

  const acceptRequest = async (targetUid: string) => {
    if (!user) return;
    try {
      // Remove from my requests, add to my friends
      await updateDoc(doc(db, 'users', user.uid), {
        friendRequests: arrayRemove(targetUid),
        friends: arrayUnion(targetUid)
      });
      // Add me to their friends
      await updateDoc(doc(db, 'users', targetUid), {
        friends: arrayUnion(user.uid)
      });
    } catch (e) {
      alert("Erro ao aceitar pedido.");
    }
  };

  const declineRequest = async (targetUid: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friendRequests: arrayRemove(targetUid)
      });
    } catch (e) {
      alert("Erro ao recusar.");
    }
  };

  const removeFriend = async (targetUid: string) => {
    if (!user || !confirm("Desfazer amizade?")) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        friends: arrayRemove(targetUid)
      });
      await updateDoc(doc(db, 'users', targetUid), {
        friends: arrayRemove(user.uid)
      });
    } catch (e) {
      alert("Erro ao remover amigo.");
    }
  };

  return (
    <div className="fade-in pb-24" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '2rem', paddingTop: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-1px' }}>Amigos</h1>
        <p style={{ color: 'var(--secondary)', marginTop: '0.5rem' }}>Conecte-se com seus parceiros de pelada</p>
      </header>

      {/* Buscar Usuário */}
      <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '20px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontWeight: 'bold' }}>@</span>
            <input 
              type="text" 
              placeholder="buscar username"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
            />
          </div>
          <button 
            onClick={handleSearch}
            style={{ padding: '0 20px', background: 'var(--primary)', color: 'black', borderRadius: '12px', fontWeight: '900' }}
          >
            <Search size={20} />
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '12px', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: '800' }}>Resultados</h4>
            {searchResults.map(p => (
              <div key={p.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <p style={{ fontWeight: '700', fontSize: '14px' }}>{p.name}</p>
                    <p style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: '800' }}>@{p.username}</p>
                  </div>
                </div>
                {profile?.friends?.includes(p.uid) ? (
                  <span style={{ color: 'var(--secondary)', fontSize: '12px', fontWeight: 'bold' }}>AMIGO</span>
                ) : (
                  <button onClick={() => sendRequest(p.uid)} style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.2)', color: 'var(--primary)', borderRadius: '10px' }}>
                    <UserPlus size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pedidos Recebidos */}
      {requestsList.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Pedidos Recebidos ({requestsList.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {requestsList.map(p => (
              <div key={p.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', padding: '16px', borderRadius: '20px', border: '1px solid var(--warning)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <p style={{ fontWeight: '800', fontSize: '15px' }}>{p.name}</p>
                    <p style={{ color: 'var(--secondary)', fontSize: '12px', fontWeight: '600' }}>@{p.username}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => acceptRequest(p.uid)} style={{ padding: '10px', background: 'var(--primary)', color: 'black', borderRadius: '12px' }}>
                    <Check size={18} />
                  </button>
                  <button onClick={() => declineRequest(p.uid)} style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error)', borderRadius: '12px' }}>
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Amigos */}
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={20} color="var(--primary)" /> Meus Amigos
        </h3>
        {friendsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
            <Users size={48} color="var(--secondary)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--secondary)', fontWeight: '600' }}>Você ainda não adicionou ninguém.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {friendsList.map(p => (
              <div key={p.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', padding: '16px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <p style={{ fontWeight: '800', fontSize: '16px' }}>{p.name}</p>
                    <p style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: '800' }}>@{p.username}</p>
                  </div>
                </div>
                <button onClick={() => removeFriend(p.uid)} style={{ padding: '8px', background: 'transparent', color: 'var(--error)', borderRadius: '10px' }}>
                  <UserPlus size={18} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
