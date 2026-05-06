"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Settings, Users, CreditCard, ShieldCheck, Edit3, Trash2, Check, X, ChevronRight, Globe, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, limit, setDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { generatePixPayload } from '@/lib/pix';

export default function AdminPage() {
  const { user, profile, setProfile } = useAuth();
  const [view, setView] = useState<'players' | 'payments' | 'matches'>('players');
  const [allMatches, setAllMatches] = React.useState<any[]>([]);

  const [allUsers, setAllUsers] = React.useState<any[]>([]);
  const [activeMatch, setActiveMatch] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [pixConfig, setPixConfig] = useState({ key: '', name: '', city: '' });
  const [isSavingPix, setIsSavingPix] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);
  const router = useRouter();

  React.useEffect(() => {
    // 1. Fetch All Users
    const qUsers = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Fetch Latest Match for Payments
    const qMatch = query(collection(db, 'matches'), orderBy('createdAt', 'desc'), limit(1));
    const unsubMatch = onSnapshot(qMatch, (snap) => {
      if (!snap.empty) {
        setActiveMatch({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
      setLoading(false);
    });

    // 3. Fetch All Matches
    const qAllMatches = query(collection(db, 'matches'), orderBy('createdAt', 'desc'), limit(50));
    const unsubAllMatches = onSnapshot(qAllMatches, (snap) => {
      setAllMatches(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Fetch PIX Config
    const unsubPix = onSnapshot(doc(db, 'settings', 'pix'), (snap) => {
      if (snap.exists()) {
        setPixConfig(snap.data() as any);
      }
    });

    return () => { unsubUsers(); unsubMatch(); unsubAllMatches(); unsubPix(); };
  }, []);

  const handleSavePix = async () => {
    console.log('Saving PIX Config:', pixConfig);
    if (!pixConfig.key || !pixConfig.name || !pixConfig.city) {
      alert("Por favor, preencha todos os campos do PIX.");
      return;
    }

    setIsSavingPix(true);
    try {
      await setDoc(doc(db, 'settings', 'pix'), pixConfig, { merge: true });
      console.log('PIX Config saved successfully');
      alert("Configuração PIX salva com sucesso!");
    } catch (e) {
      console.error("Erro ao salvar PIX:", e);
      alert("Erro ao salvar configuração PIX.");
    } finally {
      setIsSavingPix(false);
    }
  };

  const handleUpdateRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'player' : 'admin';
    if (!confirm(`Mudar cargo do usuário para ${newRole}?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { 
        role: newRole,
        isAdmin: newRole === 'admin'
      });
    } catch (e) {
      alert("Erro ao atualizar cargo.");
    }
  };

  const handleVerifyPayment = async (playerId: string) => {
    if (!activeMatch) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    const participant = activeMatch.participants.find((p: any) => p.uid === playerId);
    const sponsoredUids = participant?.payingFor || [];

    const updatedParticipants = activeMatch.participants.map((p: any) => {
      if (p.uid === playerId || sponsoredUids.includes(p.uid)) {
        return { ...p, paymentStatus: 'paid' };
      }
      return p;
    });

    try {
      await updateDoc(matchRef, { participants: updatedParticipants });
    } catch (e) {
      alert("Erro ao verificar pagamento.");
    }
  };

  const handleRejectPayment = async (playerId: string) => {
    if (!activeMatch) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    const participant = activeMatch.participants.find((p: any) => p.uid === playerId);
    const sponsoredUids = participant?.payingFor || [];

    const updatedParticipants = activeMatch.participants.map((p: any) => {
      if (p.uid === playerId || sponsoredUids.includes(p.uid)) {
        return { ...p, paymentStatus: 'pending', payingFor: [], sponsoredBy: null };
      }
      return p;
    });

    try {
      await updateDoc(matchRef, { participants: updatedParticipants });
    } catch (e) {
      alert("Erro ao recusar pagamento.");
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm("TEM CERTEZA? Isso excluirá a partida e todos os dados vinculados permanentemente.")) return;
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'matches', matchId));
      alert("Partida excluída.");
    } catch (e) {
      alert("Erro ao excluir partida.");
    }
  };
  
  const handleToggleVisibility = async (matchId: string, currentVisibility: string) => {
    if (profile?.role !== 'admin' && !profile?.isAdmin) return;
    const newVisibility = currentVisibility === 'privada' ? 'publica' : 'privada';
    try {
      await updateDoc(doc(db, 'matches', matchId), { visibility: newVisibility });
    } catch (e) {
      alert("Erro ao mudar visibilidade.");
    }
  };

  React.useEffect(() => {
    const promoteMe = async () => {
      if (user && profile && !profile.isAdmin) {
        try {
          await updateDoc(doc(db, 'users', user.uid), { 
            role: 'admin',
            isAdmin: true
          });
          // Update local profile state if possible
          if (setProfile) setProfile({ ...profile, role: 'admin', isAdmin: true });
          alert("Você agora é um Administrador do LineUp!");
        } catch (e) {
          console.error("Erro ao se promover:", e);
        }
      }
    };
    promoteMe();
  }, [user, profile]);

  // Temporarily commented out for setup
  /*
  if (profile && !profile.isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', textAlign: 'center', padding: '2rem' }}>
        <ShieldCheck size={48} color="var(--error)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <h2 style={{ fontWeight: '800', marginBottom: '1rem' }}>Acesso Negado</h2>
        <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>Esta área é restrita a administradores do LineUp.</p>
        <button onClick={() => router.push('/')} style={{ marginTop: '2rem', color: 'var(--primary)', fontWeight: '700' }}>Voltar ao Início</button>
      </div>
    );
  }
  */

  const handleCopyPreview = (payload: string) => {
    navigator.clipboard.writeText(payload);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--surface)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Painel Admin</h1>
          <p style={{ color: 'var(--secondary)' }}>Controle total do sistema</p>
        </div>
        <ShieldCheck color="var(--primary)" size={32} />
      </header>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        <button 
          onClick={() => setView('players')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            borderRadius: '12px', 
            background: view === 'players' ? 'var(--primary)' : 'var(--surface)',
            color: view === 'players' ? 'black' : 'white',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Users size={18} /> Jogadores
        </button>
        <button 
          onClick={() => setView('payments')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            borderRadius: '12px', 
            background: view === 'payments' ? 'var(--primary)' : 'var(--surface)',
            color: view === 'payments' ? 'black' : 'white',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <CreditCard size={18} /> Pagamentos
        </button>
        <button 
          onClick={() => setView('matches')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            borderRadius: '12px', 
            background: view === 'matches' ? 'var(--primary)' : 'var(--surface)',
            color: view === 'matches' ? 'black' : 'white',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Settings size={18} /> Partidas
        </button>
      </div>

      {view === 'players' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={async () => {
              if (!confirm("Isso vai resetar TODAS as notas de TODOS os jogadores para 50 (exceto posição). Usar apenas para corrigir o bug de notas elevadas! Continuar?")) return;
              try {
                const { writeBatch } = await import('firebase/firestore');
                const batch = writeBatch(db);
                for (const player of allUsers) {
                  const playerRef = doc(db, 'users', player.id);
                  batch.update(playerRef, {
                    overall: 50,
                    hasInitialRating: false,
                    attributes: { velocidade: 50, finalizacao: 50, passe: 50, drible: 50, defesa: 50, fisico: 50 }
                  });
                }
                await batch.commit();
                alert("Todas as notas foram resetadas com sucesso!");
                window.location.reload();
              } catch (e) {
                console.error(e);
                alert("Erro ao resetar notas.");
              }
            }}
            style={{ width: '100%', padding: '12px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', border: '1px dashed var(--error)', borderRadius: '12px', fontWeight: '800' }}
          >
            RESETAR TODAS AS NOTAS (FIX BUG)
          </button>
          
          <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden' }}>
          {allUsers.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary)' }}>Nenhum usuário cadastrado.</p>
          ) : allUsers.map((player, i) => (
            <div key={i} style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: '700' }}>{player.name}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: player.isAdmin ? 'rgba(34, 197, 94, 0.1)' : 'var(--border)', color: player.isAdmin ? 'var(--primary)' : 'var(--secondary)' }}>
                    {player.role === 'admin' ? 'ADMIN' : 'JOGADOR'}
                  </span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'white' }}>OVR: {player.overall || '--'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => handleUpdateRole(player.id, player.role)}
                  title="Mudar cargo"
                  style={{ padding: '8px', background: 'var(--surface)', borderRadius: '8px', color: player.isAdmin ? 'var(--primary)' : 'white' }}
                >
                  <ShieldCheck size={16} />
                </button>
                <button onClick={() => router.push(`/perfil/${player.id}`)} style={{ padding: '8px', background: 'var(--surface)', borderRadius: '8px' }}><Edit3 size={16} /></button>
                <button 
                  onClick={async () => {
                    if (confirm(`Deseja realmente EXCLUIR permanentemente o usuário ${player.name}?`)) {
                      try {
                        await deleteDoc(doc(db, 'users', player.id));
                        alert("Usuário excluído com sucesso!");
                        window.location.reload();
                      } catch (e) {
                        alert("Erro ao excluir usuário.");
                      }
                    }
                  }}
                  style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>
      ) : view === 'payments' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* PIX Settings */}
          <section className="glass" style={{ padding: '1.5rem', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={20} color="var(--primary)" /> Configuração de Pagamento
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '6px' }}>CHAVE PIX (QUALQUER FORMATO)</label>
                <input 
                  value={pixConfig.key}
                  onChange={e => setPixConfig({...pixConfig, key: e.target.value})}
                  placeholder="E-mail, CPF, Celular ou Aleatória"
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '6px' }}>NOME DO RECEBEDOR</label>
                  <input 
                    value={pixConfig.name}
                    onChange={e => setPixConfig({...pixConfig, name: e.target.value})}
                    placeholder="Ex: João Silva"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '6px' }}>CIDADE</label>
                  <input 
                    value={pixConfig.city}
                    onChange={e => setPixConfig({...pixConfig, city: e.target.value})}
                    placeholder="Ex: Salvador"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                  />
                </div>
              </div>
              <button 
                onClick={handleSavePix}
                disabled={isSavingPix}
                style={{ marginTop: '8px', padding: '14px', borderRadius: '12px', background: 'var(--primary-gradient)', color: 'black', fontWeight: '800', fontSize: '14px' }}
              >
                {isSavingPix ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÃO PIX'}
              </button>
            </div>
            {pixConfig.key && (
              <div style={{ marginTop: '1rem', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <p style={{ fontSize: '9px', fontWeight: '900', color: 'var(--secondary)' }}>PREVIEW DO PIX COPIA E COLA (TESTE R$ 20,00)</p>
                  <button 
                    onClick={() => handleCopyPreview(generatePixPayload({
                      key: pixConfig.key,
                      name: pixConfig.name,
                      city: pixConfig.city,
                      amount: 20,
                      transactionId: "***"
                    }))}
                    style={{ fontSize: '9px', fontWeight: '900', color: copyStatus ? 'var(--primary)' : 'white', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {copyStatus ? 'COPIADO!' : 'COPIAR'}
                  </button>
                </div>
                <code style={{ fontSize: '10px', color: 'var(--primary)', wordBreak: 'break-all', display: 'block', lineHeight: '1.4' }}>
                  {generatePixPayload({
                    key: pixConfig.key,
                    name: pixConfig.name,
                    city: pixConfig.city,
                    amount: 20,
                    transactionId: "***"
                  })}
                </code>
              </div>
            )}
          </section>

          {/* Active Match Cost */}
          {activeMatch && (
            <section className="glass" style={{ padding: '1.5rem', borderRadius: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.2rem' }}>Custo da Pelada Atual</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '6px' }}>VALOR TOTAL (R$)</label>
                  <input 
                    type="number"
                    value={activeMatch.totalCost || ''}
                    onChange={async (e) => {
                      const val = e.target.value;
                      await updateDoc(doc(db, 'matches', activeMatch.id), { totalCost: val });
                    }}
                    placeholder="Ex: 200.00"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
                  />
                </div>
                <div style={{ flex: 1, padding: '12px', background: 'rgba(29, 185, 84, 0.1)', borderRadius: '12px', border: '1px solid rgba(29, 185, 84, 0.2)' }}>
                  <p style={{ fontSize: '9px', color: 'var(--primary)', fontWeight: '900', marginBottom: '4px' }}>VALOR POR JOGADOR</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: '900' }}>
                    R$ {activeMatch.participants?.length > 0 
                        ? (parseFloat(activeMatch.totalCost || '0') / activeMatch.participants.length).toFixed(2)
                        : '0.00'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Player Payments List */}
          <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <p style={{ fontSize: '12px', fontWeight: '900', color: 'var(--secondary)' }}>GERENCIAR PAGAMENTOS</p>
            </div>
            {!activeMatch ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary)' }}>Nenhuma partida agendada.</p>
            ) : (activeMatch.participants || []).length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary)' }}>Nenhum jogador confirmado.</p>
            ) : (activeMatch.participants || []).map((item: any, i: number) => {
              const individualValue = (parseFloat(activeMatch.totalCost || '0') / activeMatch.participants.length).toFixed(2);
              const status = item.paymentStatus || 'pending';
              
              return (
                <div key={i} style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--surface)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={item.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ 
                        position: 'absolute', bottom: '-4px', right: '-4px', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid black',
                        background: status === 'paid' ? 'var(--primary)' : status === 'waiting' ? 'var(--warning)' : 'var(--error)'
                      }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: '800', fontSize: '14px' }}>{item.name}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <p style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '700' }}>
                          Individual: R$ {individualValue}
                        </p>
                        {item.payingFor?.length > 0 && (
                          <p style={{ fontSize: '9px', color: 'var(--primary)', fontWeight: '900', textTransform: 'uppercase' }}>
                            + PAGANDO PARA: {item.payingFor.map((uid: string) => activeMatch.participants.find((p: any) => p.uid === uid)?.name || '...').join(', ')}
                          </p>
                        )}
                        {item.sponsoredBy && (
                          <p style={{ fontSize: '9px', color: 'var(--warning)', fontWeight: '900', textTransform: 'uppercase' }}>
                            PAGO POR: {activeMatch.participants.find((p: any) => p.uid === item.sponsoredBy)?.name || '...'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {status !== 'paid' && (
                      <button 
                        onClick={() => handleVerifyPayment(item.uid)}
                        style={{ padding: '8px 12px', background: status === 'waiting' ? 'var(--warning)' : 'var(--primary)', color: 'black', borderRadius: '10px', fontWeight: '900', fontSize: '10px' }}
                      >
                        {status === 'waiting' ? 'APROVAR' : 'MARCAR PAGO'}
                      </button>
                    )}
                    {status !== 'pending' && (
                      <button 
                        onClick={() => handleRejectPayment(item.uid)}
                        style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.1)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden' }}>
          {allMatches.length === 0 ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--secondary)' }}>Nenhuma partida encontrada.</p>
          ) : allMatches.map((m, i) => (
            <div key={i} style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: '700' }}>{m.location}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--secondary)', margin: 0 }}>{m.date} - {m.time}</p>
                  <button 
                    onClick={() => handleToggleVisibility(m.id, m.visibility)}
                    style={{ 
                      fontSize: '10px', 
                      padding: '2px 8px', 
                      borderRadius: '6px', 
                      background: m.visibility === 'privada' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)', 
                      color: m.visibility === 'privada' ? 'var(--warning)' : 'var(--primary)',
                      border: m.visibility === 'privada' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(34, 197, 94, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: '800'
                    }}
                  >
                    {m.visibility === 'privada' ? <><Lock size={10} /> PRIVADA</> : <><Globe size={10} /> PÚBLICA</>}
                  </button>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteMatch(m.id)}
                style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px' }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Global Config */}
      <h3 style={{ margin: '2rem 0 1rem', fontWeight: '700' }}>Configurações Globais</h3>
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span>Abrir confirmações</span>
          <div style={{ width: '40px', height: '20px', background: 'var(--primary)', borderRadius: '10px', position: 'relative' }}>
             <div style={{ width: '16px', height: '16px', background: 'black', borderRadius: '50%', position: 'absolute', right: '2px', top: '2px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Resetar notas (Temporada)</span>
          <button style={{ color: 'var(--error)', fontSize: '14px', fontWeight: '600' }}>Resetar</button>
        </div>
      </div>
    </div>
  );
}
