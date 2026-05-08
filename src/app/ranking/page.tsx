"use client";

import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, Trophy, Plus, ChevronRight, 
  Settings, UserPlus, Star, Calendar, 
  MoreHorizontal, LogOut, ArrowLeft,
  Mail, Search, Trash2, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, onSnapshot, doc, 
  addDoc, updateDoc, arrayUnion, arrayRemove, 
  orderBy, limit, getDocs, getDoc
} from 'firebase/firestore';
import Link from 'next/link';
import PlayerCard from '@/components/PlayerCard';
import LancesFeed from '@/components/LancesFeed';

export default function GroupsPage() {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupMatches, setGroupMatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'ranking' | 'matches' | 'lances'>('members');

  // Search users state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'groups'),
      where('memberIds', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const groupsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(groupsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedGroup) return;

    const q = query(
      collection(db, 'matches'),
      where('groupId', '==', selectedGroup.id)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const matches = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      matches.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setGroupMatches(matches);
    });

    return () => unsubscribe();
  }, [selectedGroup]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !user || !profile) return;
    
    try {
      const newGroup = {
        name: newGroupName.trim(),
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        memberIds: [user.uid],
        members: [{
          uid: user.uid,
          name: profile.name,
          photoURL: profile.photoURL || '',
          role: 'admin',
          type: 'mensalista'
        }],
        invitedUids: [],
        matches: [],
        visibility: 'private'
      };

      await addDoc(collection(db, 'groups'), newGroup);
      setNewGroupName('');
      setShowCreateModal(false);
    } catch (e) {
      alert("Erro ao criar grupo.");
    }
  };

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const cleanQ = q.toLowerCase().trim();
      const usersRef = collection(db, 'users');
      // Fetch a broader set and filter client-side for better name matching
      const snap = await getDocs(query(usersRef, limit(50)));
      const filtered = snap.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter((u: any) => 
          u.name?.toLowerCase().includes(cleanQ) || 
          u.username?.toLowerCase().includes(cleanQ)
        )
        .slice(0, 5);
      setSearchResults(filtered);
    } catch (e) {
      console.error(e);
    }
    setSearching(false);
  };

  const handleAddMember = async (targetUser: any, type: 'mensalista' | 'avulso') => {
    if (!selectedGroup || !targetUser.uid) return;
    
    const groupRef = doc(db, 'groups', selectedGroup.id);
    const newMember = {
      uid: targetUser.uid,
      name: targetUser.name,
      photoURL: targetUser.photoURL || '',
      role: 'player',
      type: type
    };

    try {
      await updateDoc(groupRef, {
        memberIds: arrayUnion(targetUser.uid),
        members: arrayUnion(newMember)
      });
      setShowInviteModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      alert("Erro ao adicionar membro.");
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!selectedGroup || memberUid === selectedGroup.createdBy) return;
    if (!confirm("Remover este membro do grupo?")) return;

    const groupRef = doc(db, 'groups', selectedGroup.id);
    const memberToRemove = selectedGroup.members.find((m: any) => m.uid === memberUid);

    try {
      await updateDoc(groupRef, {
        memberIds: arrayRemove(memberUid),
        members: arrayRemove(memberToRemove)
      });
    } catch (e) {
      alert("Erro ao remover membro.");
    }
  };

  const handlePromoteToMensalista = async (memberUid: string) => {
    if (!selectedGroup) return;
    const groupRef = doc(db, 'groups', selectedGroup.id);
    const updatedMembers = selectedGroup.members.map((m: any) => 
      m.uid === memberUid ? { ...m, type: 'mensalista' } : m
    );

    try {
      await updateDoc(groupRef, { members: updatedMembers });
    } catch (e) {
      alert("Erro ao promover membro.");
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--surface)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (selectedGroup) {
    const isAdmin = selectedGroup.createdBy === user?.uid || selectedGroup.members.find((m: any) => m.uid === user?.uid)?.role === 'admin';
    const mensalistas = selectedGroup.members.filter((m: any) => m.type === 'mensalista');
    const avulsos = selectedGroup.members.filter((m: any) => m.type === 'avulso');

    return (
      <div className="fade-in" style={{ paddingBottom: '100px' }}>
        <header style={{ marginBottom: '2rem', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setSelectedGroup(null)} style={{ padding: '10px', background: 'var(--surface)', borderRadius: '12px', color: 'white' }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '900' }}>{selectedGroup.name}</h1>
            <p style={{ color: 'var(--secondary)', fontSize: '13px' }}>{selectedGroup.members.length} membros</p>
          </div>
          {isAdmin && (
            <button style={{ padding: '10px', color: 'var(--secondary)' }}>
              <Settings size={20} />
            </button>
          )}
        </header>

        {/* Group Tabs */}
        <div 
          className="no-scrollbar"
          style={{ 
            display: 'flex', 
            gap: '6px', 
            background: 'var(--surface)', 
            padding: '6px', 
            borderRadius: '20px', 
            marginBottom: '2rem',
            overflowX: 'auto',
            width: '100%'
          }}
        >
          {[
            { id: 'members', label: 'Membros', icon: Users },
            { id: 'ranking', label: 'Ranking', icon: Trophy },
            { id: 'matches', label: 'Partidas', icon: Calendar },
            { id: 'lances', label: 'Lances', icon: Camera }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 16px', borderRadius: '14px',
                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.id ? 'black' : 'var(--secondary)',
                fontWeight: '900', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <tab.icon size={14} /> {tab.label.toUpperCase()}
            </button>
          ))}
        </div>

        {activeTab === 'members' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>Mensalistas ({mensalistas.length})</h3>
              {isAdmin && (
                <button onClick={() => setShowInviteModal(true)} style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UserPlus size={16} /> ADICIONAR
                </button>
              )}
            </div>
            
            <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden', marginBottom: '2rem' }}>
              {mensalistas.map((m: any) => (
                <div key={m.uid} style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                    <img src={m.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '700', fontSize: '14px' }}>{m.name}</p>
                    {m.role === 'admin' && <span style={{ fontSize: '9px', color: 'var(--primary)', fontWeight: '900' }}>ORGANIZADOR</span>}
                  </div>
                  {isAdmin && m.uid !== user?.uid && (
                    <button onClick={() => handleRemoveMember(m.uid)} style={{ color: 'var(--error)', padding: '8px' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--secondary)' }}>Avulsos / Convidados ({avulsos.length})</h3>
              {isAdmin && (
                <button onClick={() => setShowInviteModal(true)} style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UserPlus size={16} /> ADICIONAR
                </button>
              )}
            </div>
            <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden' }}>
              {avulsos.length === 0 ? (
                <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary)', fontSize: '13px' }}>Nenhum convidado avulso.</p>
              ) : avulsos.map((m: any) => (
                <div key={m.uid} style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--secondary)' }}>
                    <img src={m.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '700', fontSize: '14px' }}>{m.name}</p>
                    <button onClick={() => handlePromoteToMensalista(m.uid)} style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '700' }}>Tornar Mensalista</button>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleRemoveMember(m.uid)} style={{ color: 'var(--error)', padding: '8px' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="fade-in">
             <p style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--secondary)' }}>Ranking do grupo será gerado após as partidas.</p>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="fade-in">
             {groupMatches.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <Calendar size={48} color="var(--secondary)" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--secondary)', fontWeight: '600' }}>Nenhuma partida agendada para este grupo.</p>
                  {isAdmin && (
                    <button onClick={() => window.location.href = '/admin/nova-partida'} style={{ marginTop: '1.5rem', background: 'var(--primary)', color: 'black', padding: '12px 24px', borderRadius: '12px', fontWeight: '900' }}>MARCAR PELADA</button>
                  )}
               </div>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 {groupMatches.map(match => (
                   <div key={match.id} className="glass" style={{ padding: '1rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                         <p style={{ fontSize: '14px', fontWeight: '800' }}>{match.location}</p>
                         <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>{match.date} às {match.time}</p>
                       </div>
                       <Link href={`/?matchId=${match.id}`} style={{ background: 'var(--primary)', color: 'black', padding: '8px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', textDecoration: 'none' }}>
                         VER PARTIDA
                       </Link>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {activeTab === 'lances' && (
          <div className="fade-in">
             <LancesFeed groupId={selectedGroup.id} />
          </div>
        )}

        {/* Invite Member Modal */}
        {showInviteModal && (
          <div className="modal-backdrop">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'var(--surface)', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border)' }}>
              <h3 style={{ marginBottom: '1.5rem', fontWeight: '800', fontSize: '1.2rem', textAlign: 'center' }}>Adicionar ao Grupo</h3>
              
              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar nome ou username..."
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                {searchResults.map(u => (
                  <div key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' }}>
                      <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: '800' }}>{u.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--primary)' }}>@{u.username}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => handleAddMember(u, 'mensalista')} style={{ background: 'var(--primary)', color: 'black', padding: '6px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900' }}>MEN</button>
                      <button onClick={() => handleAddMember(u, 'avulso')} style={{ background: 'var(--surface)', color: 'white', padding: '6px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900', border: '1px solid var(--border)' }}>AVU</button>
                    </div>
                  </div>
                ))}

                {searchQuery.trim().length >= 2 && (
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border)', textAlign: 'center', marginTop: '8px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--secondary)', marginBottom: '10px' }}>Não encontrou o jogador?</p>
                    <button 
                      onClick={() => handleAddMember({ uid: 'guest_' + Date.now().toString(), name: searchQuery.trim(), photoURL: '', username: 'convidado' }, 'avulso')}
                      style={{ background: 'var(--surface)', color: 'white', padding: '12px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', width: '100%', border: '1px solid var(--border)' }}
                    >
                      CRIAR "{searchQuery.trim().toUpperCase()}" COMO AVULSO
                    </button>
                  </div>
                )}
              </div>

              <button onClick={() => setShowInviteModal(false)} style={{ width: '100%', marginTop: '1.5rem', padding: '14px', borderRadius: '14px', color: 'var(--secondary)', fontWeight: '700' }}>Fechar</button>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '2.5rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900' }}>Meus Grupos</h1>
          <p style={{ color: 'var(--secondary)' }}>Sua comunidade do futebol</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          style={{ background: 'var(--primary)', color: 'black', width: '45px', height: '45px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px var(--primary-glow)' }}
        >
          <Plus size={24} />
        </button>
      </header>

      {groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Shield size={64} color="var(--surface)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>Nenhum grupo ainda</h2>
          <p style={{ color: 'var(--secondary)', fontSize: '14px', marginBottom: '2rem' }}>Crie um grupo para gerenciar seus mensalistas, avulsos e partidas em um só lugar.</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            style={{ background: 'var(--primary-gradient)', color: 'black', padding: '16px 32px', borderRadius: '16px', fontWeight: '900', fontSize: '1rem' }}
          >
            CRIAR MEU PRIMEIRO GRUPO
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groups.map(group => (
            <motion.div
              key={group.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedGroup(group)}
              className="glass"
              style={{ padding: '1.5rem', borderRadius: '24px', cursor: 'pointer', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '18px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={24} color="black" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800' }}>{group.name}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: '600' }}>{group.members.length} Jogadores</p>
                  </div>
                </div>
                <ChevronRight size={24} color="var(--border)" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <motion.div 
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            style={{ background: 'var(--surface)', width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '2rem', border: '1px solid var(--border)' }}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem', textAlign: 'center' }}>Novo Grupo</h2>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Nome do Futebol / Grupo</label>
              <input
                type="text"
                autoFocus
                placeholder="Ex: Futebol de Quarta"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', outline: 'none', fontSize: '1.1rem', fontWeight: '600' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', color: 'var(--secondary)', fontWeight: '700' }}>CANCELAR</button>
              <button 
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                style={{ flex: 2, padding: '16px', borderRadius: '16px', background: 'var(--primary-gradient)', color: 'black', fontWeight: '900', opacity: newGroupName.trim() ? 1 : 0.5 }}
              >CRIAR GRUPO</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
