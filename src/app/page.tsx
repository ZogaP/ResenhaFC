"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, DollarSign, CheckCircle2, UserCheck, AlertCircle, ShieldCheck, Plus, Cake, PartyPopper, Camera, CheckCircle, Trash2, Users, Lock, Globe, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';
import PlayerCard from '@/components/PlayerCard';
import { doc, updateDoc, collection, query, where, orderBy, limit, onSnapshot, arrayUnion, arrayRemove, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { transformMediaLink } from '@/lib/utils';
import Link from 'next/link';

const EMPTY_MATCH = {
  id: '',
  location: 'Buscando partida...',
  address: 'Carregando informações...',
  date: '',
  time: '',
  timeEnd: '',
  totalCost: '0',
  maxPlayers: 20,
  participants: [],
  waitingList: []
};

export default function Home() {
  const { user, profile, setProfile, loading } = useAuth();
  const router = useRouter();
  const [activeMatch, setActiveMatch] = useState<any>(EMPTY_MATCH);
  const [confirming, setConfirming] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPosition, setGuestPosition] = useState('MEI');
  const [guestLevel, setGuestLevel] = useState(5);
  
  const [setupUsername, setSetupUsername] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'info' | 'success' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSaveUsername = async () => {
    if (!user || !profile) return;
    if (setupUsername.length < 3) {
      setUsernameError('Mínimo 3 caracteres');
      return;
    }
    setCheckingUsername(true);
    const cleanUsername = setupUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    try {
      const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setUsernameError('Nome já em uso!');
        setCheckingUsername(false);
        return;
      }
      
      await updateDoc(doc(db, 'users', user.uid), { username: cleanUsername });
      setProfile({ ...profile, username: cleanUsername });
    } catch (e) {
      setUsernameError('Erro ao salvar.');
    }
    setCheckingUsername(false);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Increase limit to 50 to find the specific upcoming match if many were created
    const q = query(
      collection(db, 'matches'), 
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Strategy: 
        // 1. Filter out known mock/test matches
        // 2. Find matches where user is already confirmed
        // 3. Find matches with real-looking names (like "Garcia" or "Campo")
        // 4. Fallback to the first non-mock scheduled match
        
        const realMatches = matches.filter((m: any) => {
          const loc = (m.location || '').toLowerCase();
          const isMock = loc.includes('fictícia') || loc.includes('teste') || loc.includes('mock');
          if (isMock) return false;

          // Privacy Filter
          const isCreator = m.createdBy === user?.uid;
          const isParticipant = (m.participants || []).some((p: any) => p.uid === user?.uid);
          const isInvitee = (m.invitedUids || []).includes(user?.uid) || (m.invitedEmails || []).includes(user?.email);
          const isAdmin = profile?.role === 'admin';
          
          return !m.visibility || m.visibility === 'publica' || isCreator || isParticipant || isInvitee || isAdmin;
        });

        const myConfirmedMatch = realMatches.find((m: any) => 
          m.status === 'scheduled' && 
          (m.participants || []).some((p: any) => p.uid === user?.uid)
        );

        const garciaMatch = realMatches.find((m: any) => 
          m.status === 'scheduled' && 
          (m.location || '').toLowerCase().includes('garcia')
        );

        const anyScheduledMatch = realMatches.find((m: any) => m.status === 'scheduled');
        
        const scheduledMatch = myConfirmedMatch || garciaMatch || anyScheduledMatch || realMatches[0];

        if (scheduledMatch) {
          setActiveMatch(scheduledMatch);
        } else {
          setActiveMatch(EMPTY_MATCH);
        }
      } else {
        setActiveMatch(EMPTY_MATCH);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Admin Notification Watcher
  useEffect(() => {
    if (profile?.role !== 'admin' || !activeMatch.id) return;

    // Check for new pending players
    if (activeMatch.pendingPlayers?.length > 0) {
      showToast(`${activeMatch.pendingPlayers.length} nova(s) solicitação(ões) de entrada!`, 'info');
    }

    // Check for new payment notifications
    const notifiedCount = activeMatch.participants?.filter((p: any) => p.paymentStatus === 'notified').length || 0;
    if (notifiedCount > 0) {
      showToast(`${notifiedCount} jogador(es) avisaram que pagaram!`, 'warning');
    }
  }, [activeMatch.pendingPlayers?.length, activeMatch.participants?.map((p: any) => p.paymentStatus).join(','), profile?.role]);

  // Handle shared match link
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('matchId');
    if (matchId && user) {
      const fetchMatch = async () => {
        const { getDoc, doc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'matches', matchId));
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setActiveMatch(data);
          setShowDetails(true);
        }
      };
      fetchMatch();
    }
  }, [user]);

  const isUserConfirmed = activeMatch.participants?.some((p: any) => p.uid === user?.uid);
  const isWaiting = activeMatch.waitingList?.some((p: any) => p.uid === user?.uid);
  const isPending = activeMatch.pendingPlayers?.some((p: any) => p.uid === user?.uid);

  const isBirthday = () => {
    if (!profile?.birthDate) return false;
    const today = new Date();
    const [day, month, year] = profile.birthDate.split('/').map(Number);
    return today.getDate() === day && (today.getMonth() + 1) === month;
  };

  const updatePhoto = async () => {
    const rawUrl = prompt("Cole o link da sua nova foto (ex: link do Google Drive ou Imgur):", profile?.photoURL || '');
    if (rawUrl !== null && user) {
      const newUrl = transformMediaLink(rawUrl);
      try {
        await updateDoc(doc(db, 'users', user.uid), { photoURL: newUrl });
        if (profile) setProfile({ ...profile, photoURL: newUrl });
      } catch (e) {
        alert("Erro ao atualizar foto.");
      }
    }
  };

  const addHighlight = async () => {
    const url = prompt("Cole o link do seu lance (Google Drive ou YouTube):");
    if (!url) return;
    const description = prompt("Dê uma breve descrição para este lance (ex: Golaço de falta):");
    
    if (user && profile) {
      const transformed = transformMediaLink(url, true);
      const newHighlight = {
        id: Date.now().toString(),
        url: transformed,
        description: description || 'Destaque'
      };
      
      const updatedHighlights = [...(profile.highlights || []), newHighlight];
      
      try {
        await updateDoc(doc(db, 'users', user.uid), { highlights: updatedHighlights });
        setProfile({ ...profile, highlights: updatedHighlights });
        alert("Lance adicionado com sucesso!");
      } catch (e) {
        alert("Erro ao salvar lance.");
      }
    }
  };

  const removeHighlight = async (id: string) => {
    if (!user || !profile) return;
    if (confirm("Deseja remover este lance?")) {
      const updatedHighlights = (profile.highlights || []).filter((h: any) => h.id !== id);
      try {
        await updateDoc(doc(db, 'users', user.uid), { highlights: updatedHighlights });
        setProfile({ ...profile, highlights: updatedHighlights });
      } catch (e) {
        alert("Erro ao remover lance.");
      }
    }
  };

  const handleConfirm = async () => {
    if (!user || !profile || !activeMatch.id || confirming) return;
    
    setConfirming(true);
    const matchRef = doc(db, 'matches', activeMatch.id);

    try {
      if (isUserConfirmed || isWaiting || isPending) {
        const listField = isUserConfirmed ? 'participants' : isWaiting ? 'waitingList' : 'pendingPlayers';
        const participantToRemove = (isUserConfirmed ? activeMatch.participants : isWaiting ? activeMatch.waitingList : activeMatch.pendingPlayers)
          .find((p: any) => p.uid === user.uid);
        
        await updateDoc(matchRef, {
          [listField]: arrayRemove(participantToRemove)
        });

        if (isUserConfirmed && activeMatch.waitingList?.length > 0) {
          const nextPlayer = activeMatch.waitingList[0];
          await updateDoc(matchRef, {
            waitingList: arrayRemove(nextPlayer),
            participants: arrayUnion({ ...nextPlayer, paymentStatus: 'pending' })
          });
        }
      } else {
        const playerLimit = activeMatch.maxPlayers || 18;
        const currentCount = activeMatch.participants?.length || 0;
        
        const newPlayer = { 
          uid: user.uid, 
          name: profile.name, 
          photoURL: profile.photoURL || '',
          overall: profile.overall || 70,
          attributes: profile.attributes || { velocidade: 50, defesa: 50, passe: 50, ataque: 50, fisico: 50, finalizacao: 50 },
          position: profile.position || 'MEI',
          playStyles: profile.playStyles || [],
          paymentStatus: 'pending',
          secondaryPosition: profile.secondaryPosition || null
        };

        const isInvited = (activeMatch.invitedEmails || []).includes(user.email?.toLowerCase()) || 
                          (activeMatch.invitedUids || []).includes(user.uid) ||
                          activeMatch.createdBy === user.uid;

        if (activeMatch.visibility === 'privada' && !isInvited) {
          await updateDoc(matchRef, {
            pendingPlayers: arrayUnion(newPlayer)
          });
          alert("Sua solicitação foi enviada ao administrador!");
          setConfirming(false);
          return;
        }

        if (currentCount < playerLimit) {
          await updateDoc(matchRef, {
            participants: arrayUnion(newPlayer)
          });
        } else {
          await updateDoc(matchRef, {
            waitingList: arrayUnion(newPlayer)
          });
          alert("A lista está cheia! Você entrou na lista de espera.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao confirmar presença.");
    } finally {
      setConfirming(false);
    }
  };

  const handleNotifyPayment = async () => {
    if (!user || !activeMatch.id) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    const updatedParticipants = activeMatch.participants.map((p: any) => 
      p.uid === user.uid ? { ...p, paymentStatus: 'notified' } : p
    );
    try {
      await updateDoc(matchRef, { participants: updatedParticipants });
      alert("Aviso de pagamento enviado ao administrador!");
    } catch (e) {
      alert("Erro ao notificar pagamento.");
    }
  };

  const handleVerifyPayment = async (playerId: string) => {
    if (profile?.role !== 'admin' || !activeMatch.id) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    const updatedParticipants = activeMatch.participants.map((p: any) => 
      p.uid === playerId ? { ...p, paymentStatus: 'verified' } : p
    );
    try {
      await updateDoc(matchRef, { participants: updatedParticipants });
    } catch (e) {
      alert("Erro ao verificar pagamento.");
    }
  };

  const handleUndoPayment = async (playerId: string) => {
    if (!activeMatch.id) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    const updatedParticipants = activeMatch.participants.map((p: any) => 
      p.uid === playerId ? { ...p, paymentStatus: 'pending' } : p
    );
    try {
      await updateDoc(matchRef, { participants: updatedParticipants });
    } catch (e) {
      alert("Erro ao desfazer pagamento.");
    }
  };

  const handleApprovePlayer = async (player: any) => {
    if (profile?.role !== 'admin' || !activeMatch.id) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    try {
      await updateDoc(matchRef, {
        pendingPlayers: arrayRemove(player),
        participants: arrayUnion({ ...player, paymentStatus: 'pending' })
      });
      showToast(`${player.name} aprovado!`, 'success');
    } catch (e) {
      alert("Erro ao aprovar jogador.");
    }
  };

  const handleRejectPlayer = async (player: any) => {
    if (profile?.role !== 'admin' || !activeMatch.id) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    try {
      await updateDoc(matchRef, {
        pendingPlayers: arrayRemove(player)
      });
      showToast(`${player.name} recusado.`, 'warning');
    } catch (e) {
      alert("Erro ao recusar jogador.");
    }
  };

  const handleRemoveParticipant = async (player: any, fromList: 'participants' | 'waitingList') => {
    if (profile?.role !== 'admin' || !activeMatch.id) return;
    if (!confirm(`Remover ${player.name} da lista?`)) return;
    
    const matchRef = doc(db, 'matches', activeMatch.id);
    try {
      await updateDoc(matchRef, {
        [fromList]: arrayRemove(player)
      });
      
      if (fromList === 'participants' && activeMatch.waitingList?.length > 0) {
        const nextPlayer = activeMatch.waitingList[0];
        await updateDoc(matchRef, {
          waitingList: arrayRemove(nextPlayer),
          participants: arrayUnion({ ...nextPlayer, paymentStatus: 'pending' })
        });
      }
      showToast(`${player.name} removido.`, 'warning');
    } catch (e) {
      alert("Erro ao remover jogador.");
    }
  };

  const handleShareMatch = async () => {
    if (!activeMatch.id) return;
    const shareUrl = `${window.location.origin}/?matchId=${activeMatch.id}`;
    const shareText = `⚽ *PARTIDA MARCADA!* ⚽\n\n📍 Local: ${activeMatch.location}\n📅 Data: ${activeMatch.date}\n⏰ Hora: ${activeMatch.time}\n\nConfirme sua presença no site:\n${shareUrl}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'LineUp - Convite',
          text: shareText,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link do convite copiado para o WhatsApp!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddGuest = () => {
    if (!activeMatch.id) return;
    setShowInviteModal(true);
  };

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
      const cleanQ = q.toLowerCase().replace('@', '');
      const usersRef = collection(db, 'users');
      const queryRef = query(
        usersRef, 
        where('username', '>=', cleanQ), 
        where('username', '<=', cleanQ + '\uf8ff'),
        limit(5)
      );
      const snap = await getDocs(queryRef);
      setSearchResults(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    }
    setSearching(false);
  };

  const handleInviteUserByUid = async (targetUser: any) => {
    if (!activeMatch.id || !targetUser.uid) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    try {
      await updateDoc(matchRef, {
        invitedUids: arrayUnion(targetUser.uid)
      });
      showToast(`${targetUser.name} convidado!`, 'success');
      setSearchResults([]);
      setSearchQuery('');
      setShowSearchModal(false);
    } catch (e) {
      alert("Erro ao convidar usuário.");
    }
  };

  const handleAddGuestPlayer = async () => {
    if (!activeMatch.id || !guestName.trim()) return;
    const matchRef = doc(db, 'matches', activeMatch.id);
    const visualOverall = 50;
    const rafflePower = Math.round(guestLevel * 9.9);
    const guestPlayer = {
      uid: `guest_${Date.now()}`,
      name: guestName.trim(),
      photoURL: '',
      overall: visualOverall,
      skillLevel: guestLevel, // Hidden parameter for raffle
      attributes: {
        velocidade: rafflePower,
        defesa: rafflePower,
        passe: rafflePower,
        ataque: rafflePower,
        fisico: rafflePower,
        finalizacao: rafflePower,
        overall: rafflePower // Real power for internal logic
      },
      position: guestPosition,
      playStyles: [],
      paymentStatus: 'pending',
      isGuest: true
    };

    try {
      const playerLimit = activeMatch.maxPlayers || 18;
      const currentCount = activeMatch.participants?.length || 0;
      if (currentCount < playerLimit) {
        await updateDoc(matchRef, { participants: arrayUnion(guestPlayer) });
      } else {
        await updateDoc(matchRef, { waitingList: arrayUnion(guestPlayer) });
        alert("Lista cheia! Convidado entrou na espera.");
      }
      setGuestName('');
      setGuestPosition('MEI');
      setGuestLevel(5);
      setShowGuestModal(false);
      setShowInviteModal(false);
    } catch (e) {
      alert("Erro ao adicionar convidado.");
    }
  };

  const handleCloseList = async () => {
    if (!activeMatch.id || !activeMatch.participants || activeMatch.participants.length === 0) {
      alert("É necessário ter pelo menos 1 participante para fechar a lista.");
      return;
    }
    
    if (confirm("Deseja fechar a lista e gerar o valor final para cada jogador?")) {
      const finalPrice = (parseFloat(activeMatch.totalCost) / activeMatch.participants.length).toFixed(2);
      
      try {
        const matchRef = doc(db, 'matches', activeMatch.id);
        await updateDoc(matchRef, {
          isClosed: true,
          price: finalPrice
        });
        alert(`Lista fechada! Valor final por pessoa: R$ ${finalPrice}`);
      } catch (e) {
        alert("Erro ao fechar lista.");
      }
    }
  };

  const handleToggleVisibility = async () => {
    if (profile?.role !== 'admin' || !activeMatch.id) return;
    const newVisibility = activeMatch.visibility === 'privada' ? 'publica' : 'privada';
    try {
      await updateDoc(doc(db, 'matches', activeMatch.id), { visibility: newVisibility });
      showToast(`Partida agora está ${newVisibility === 'privada' ? 'PRIVADA' : 'PÚBLICA'}`, 'success');
    } catch (e) {
      alert("Erro ao mudar visibilidade.");
    }
  };

  const updatePosition = async (pos: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { position: pos });
      if (profile) setProfile({ ...profile, position: pos as any });
    } catch (e) {
      console.error(e);
    }
  };
  
  const updateSecondaryPosition = async (pos: string | null) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { secondaryPosition: pos });
      if (profile) setProfile({ ...profile, secondaryPosition: pos as any });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', height: '80vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
        <motion.img 
          src="/logo.png" 
          alt="LineUp" 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: '80px', height: '80px', objectFit: 'contain' }} 
        />
        <div className="loader-spinner" />
        <p style={{ color: 'var(--secondary)', fontSize: '14px', fontWeight: '600', letterSpacing: '1px' }}>PREPARANDO CAMPO...</p>
        <style jsx>{`
          .loader-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.05);
            border-top: 3px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }



  if (profile && !profile.username) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--background)' }}>
        <div style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '24px', width: '100%', maxWidth: '400px', border: '1px solid var(--border)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1rem' }}>Crie seu @Username</h2>
          <p style={{ color: 'var(--secondary)', marginBottom: '2rem', fontSize: '14px' }}>Para que seus amigos possam te encontrar no novo sistema, você precisa de um nome de usuário único.</p>
          
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontWeight: 'bold' }}>@</span>
            <input
              type="text"
              placeholder="ex: ronaldinho10"
              value={setupUsername}
              onChange={(e) => { setSetupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setUsernameError(''); }}
              style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
            />
          </div>
          {usernameError && <p style={{ color: 'var(--error)', fontSize: '12px', marginBottom: '1rem', fontWeight: 'bold' }}>{usernameError}</p>}
          
          <button 
            onClick={handleSaveUsername}
            disabled={checkingUsername || setupUsername.length < 3}
            style={{ width: '100%', padding: '16px', background: 'var(--primary-gradient)', color: 'black', borderRadius: '12px', fontWeight: '900', opacity: (checkingUsername || setupUsername.length < 3) ? 0.5 : 1 }}
          >
            {checkingUsername ? 'Verificando...' : 'SALVAR E ENTRAR'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="fade-in pb-24" style={{ paddingBottom: '100px' }}>
      {/* Header removed here as it is now in layout/globally */}

      {/* Greeting Section */}
      <div style={{ marginBottom: '0.5rem', marginTop: '0.5rem' }}>
        <p style={{ fontSize: '14px', color: 'var(--secondary)', fontWeight: '500' }}>Olá,</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.5px' }}>{profile?.name?.split(' ').slice(0, 2).join(' ') || 'Jogador'}</h2>
          <span style={{ fontSize: '1.5rem' }}>👋</span>
          {profile?.username && (
            <div style={{ background: 'rgba(29, 185, 84, 0.15)', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="2"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Player Card Section */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3.5rem', marginTop: '1rem' }}>
        <PlayerCard 
          name={profile?.name || 'Jogador'}
          overall={profile?.overall || 70}
          position={profile?.position || 'MEI'}
          attributes={profile?.attributes || { velocidade: 70, finalizacao: 70, passe: 70, drible: 70, defesa: 70, fisico: 70 }}
          photoURL={profile?.photoURL}
          size="md"
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: '700' }}>Meus Destaques</h3>
          <button style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: '600' }}>Ver todos</button>
        </div>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px' }}>
          {profile?.highlights?.map((h: any) => (
            <div key={h.id} style={{ flex: '0 0 140px', position: 'relative' }}>
              <div style={{ width: '140px', height: '180px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                <button 
                  onClick={() => removeHighlight(h.id)}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,0,0,0.8)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                >
                  <Trash2 size={14} />
                </button>
                {h.url.includes('drive.google.com') ? (
                  <iframe src={h.url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', objectFit: 'cover' }} />
                ) : (
                  <img src={h.url} alt={h.description} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '8px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', fontSize: '10px', fontWeight: '600' }}>
                  {h.description}
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={addHighlight}
            style={{ flex: '0 0 140px', height: '180px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--secondary)', background: 'var(--surface)' }}
          >
            <Plus size={24} />
            <span style={{ fontSize: '12px' }}>Novo Lance</span>
          </button>
        </div>
      </div>

      {isBirthday() && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass"
          style={{ padding: '1.5rem', borderRadius: '24px', marginBottom: '2rem', background: 'linear-gradient(135deg, var(--primary) 0%, #ffcc00 100%)', color: 'black', display: 'flex', alignItems: 'center', gap: '15px' }}
        >
          <div style={{ background: 'white', padding: '10px', borderRadius: '50%' }}><Cake size={32} color="var(--primary)" /></div>
          <div>
            <h3 style={{ fontWeight: '900', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>Parabéns, Craque! <PartyPopper size={20} /></h3>
            <p style={{ fontSize: '13px', fontWeight: '600', opacity: 0.8 }}>Hoje é o seu dia! Que venham muitos gols e vitórias. 🎂⚽</p>
          </div>
        </motion.div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: '700' }}>Próxima Pelada</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeMatch.id && (
            <button onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'LineUp',
                  text: `Bora pro futebol em ${activeMatch.location}? Data: ${activeMatch.date} às ${activeMatch.time}`,
                  url: window.location.href
                });
              }
            }} style={{ background: 'var(--surface)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: '1px solid var(--border)' }}>COMPARTILHAR</button>
          )}
          {profile?.role === 'admin' && (
            <button onClick={() => router.push('/admin/nova-partida')} style={{ background: 'var(--primary-gradient)', color: 'black', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}> <Plus size={16} /> NOVA</button>
          )}
        </div>
      </div>

      {activeMatch.id && (
        <CountdownTimer date={activeMatch.date} time={activeMatch.time} />
      )}

      <motion.div 
        className="glass"
        whileTap={{ scale: 0.98 }}
        onClick={() => activeMatch.id && setShowDetails(true)}
        style={{ padding: '1.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden', marginBottom: '2rem', cursor: activeMatch.id ? 'pointer' : 'default' }}
      >
        {activeMatch.id && (
          <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px', alignItems: 'center', zIndex: 50 }}>
            <span 
              onClick={(e) => { 
                if (profile?.role === 'admin' || profile?.isAdmin) {
                  e.stopPropagation();
                  handleToggleVisibility();
                }
              }}
              className={`badge-visibility ${activeMatch.visibility === 'privada' ? 'private' : 'public'}`}
              style={{ 
                cursor: (profile?.role === 'admin' || profile?.isAdmin) ? 'pointer' : 'default',
                zIndex: 100,
                padding: '6px 12px',
                pointerEvents: 'auto'
              }}
            >
              {activeMatch.visibility === 'privada' ? <><Lock size={12} /> PRIVADA</> : <><Globe size={12} /> PÚBLICA</>}
            </span>
            <span style={{ color: 'var(--primary)', fontSize: '10px', fontWeight: '800', opacity: 0.8 }}>VER DETALHES</span>
          </div>
        )}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '4px' }}>{activeMatch.id ? activeMatch.location : 'Nenhuma pelada marcada'}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary)', fontSize: '13px' }}>
            <MapPin size={14} />
            <span>{activeMatch.id ? (activeMatch.address || activeMatch.location) : 'Aguardando organizador'}</span>
          </div>
        </div>

        {activeMatch.id && (activeMatch.address || activeMatch.location) && !activeMatch.location.includes('Buscando') && (
          <div style={{ width: '100%', height: '150px', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
            <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen referrerPolicy="no-referrer" src={`https://maps.google.com/maps?q=${encodeURIComponent(activeMatch.address || activeMatch.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}></iframe>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '8px', background: 'var(--surface)', borderRadius: '8px', color: 'var(--primary)' }}><Calendar size={18} /></div>
            <div>
              <p style={{ fontSize: '10px', color: 'var(--secondary)' }}>DATA</p>
              <p style={{ fontSize: '13px', fontWeight: '600' }}>{activeMatch.date || '--/--'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '8px', background: 'var(--surface)', borderRadius: '8px', color: 'var(--primary)' }}><Clock size={18} /></div>
            <div>
              <p style={{ fontSize: '10px', color: 'var(--secondary)' }}>HORÁRIO</p>
              <p style={{ fontSize: '13px', fontWeight: '600' }}>{activeMatch.time || '--:--'}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <DollarSign size={20} color="var(--primary)" />
             <div style={{ display: 'flex', flexDirection: 'column' }}>
               <span style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '600' }}>{activeMatch.isClosed ? 'PREÇO FINAL' : 'PREÇO ESTIMADO'}</span>
               <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>{activeMatch.id ? `R$ ${activeMatch.isClosed ? activeMatch.price : (activeMatch.participants?.length > 0 ? (parseFloat(activeMatch.totalCost) / activeMatch.participants.length).toFixed(2) : parseFloat(activeMatch.totalCost).toFixed(2))}` : '--'}</span>
             </div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <p style={{ fontSize: '11px', color: 'var(--secondary)' }}>CONFIRMADOS</p>
             <p style={{ fontSize: '14px', fontWeight: '700' }}>{activeMatch.participants?.length || 0}/{activeMatch.maxPlayers}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); handleConfirm(); }}
              disabled={!activeMatch.id || activeMatch.isClosed || confirming}
              style={{
                flex: 2, padding: '16px', borderRadius: '16px',
                background: isUserConfirmed ? 'var(--surface)' : 'var(--primary)',
                color: isUserConfirmed ? 'white' : 'black',
                fontWeight: '800', fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                border: isUserConfirmed ? '1px solid var(--border)' : 'none',
                opacity: (activeMatch.id && !activeMatch.isClosed && !confirming) ? 1 : 0.6
              }}
            >
              {confirming ? 'Processando...' : (
                activeMatch.isClosed ? <><ShieldCheck size={20} /> LISTA FECHADA</> :
                isUserConfirmed ? <><AlertCircle size={20} /> Vou Faltar</> :
                isWaiting ? <><Clock size={20} /> NA ESPERA (CANCELAR)</> :
                <><CheckCircle size={20} /> Confirmar Presença</>
              )}
            </button>
            {activeMatch.id && !activeMatch.isClosed && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleAddGuest(); }}
                style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'var(--surface)', color: 'var(--primary)', fontWeight: '800', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >CONVIDAR</button>
            )}
          </div>
          {activeMatch.id && (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
              style={{ width: '100%', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--primary)', borderRadius: '16px', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid var(--primary-glow)' }}
            >
              <Users size={18} /> VER LISTA E PAGAMENTOS
            </button>
          )}

          {activeMatch.liveMatch?.isLive && (
            <button 
              onClick={(e) => { e.stopPropagation(); router.push(`/partida/${activeMatch.id}`); }}
              style={{ 
                width: '100%', padding: '1.2rem', 
                background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)', 
                color: 'white', borderRadius: '16px', fontWeight: '900', fontSize: '1rem', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)',
                border: 'none',
                marginTop: '0.5rem'
              }}
            >
              <div className="badge-live-dot" />
              🎮 ACOMPANHAR PARTIDA AO VIVO
            </button>
          )}

          {profile?.role === 'admin' && activeMatch.id && !activeMatch.isClosed && (
            <button onClick={handleCloseList} style={{ width: '100%', padding: '14px', borderRadius: '16px', background: 'var(--error)', color: 'white', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>FECHAR LISTA E GERAR PREÇO</button>
          )}
        </div>
      </motion.div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-backdrop">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'var(--surface)', width: '100%', maxWidth: '380px', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border)', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: '800', fontSize: '1.2rem' }}>Convidar Jogadores</h3>
            <p style={{ color: 'var(--secondary)', fontSize: '12px', marginBottom: '1.5rem' }}>Escolha como adicionar jogadores à partida</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => { handleShareMatch(); setShowInviteModal(false); }} style={{ padding: '16px', background: 'var(--primary)', color: 'black', borderRadius: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>🔗 COPIAR LINK DA PARTIDA</button>
              <button onClick={() => { setShowInviteModal(false); setShowSearchModal(true); }} style={{ padding: '16px', background: 'var(--surface)', color: 'white', borderRadius: '16px', fontWeight: '700', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>🔍 BUSCAR @USERNAME</button>
              <button onClick={() => { setShowInviteModal(false); setShowGuestModal(true); }} style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))', color: '#a78bfa', borderRadius: '16px', fontWeight: '800', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><UserPlus size={18} /> CONVIDADO SEM CONTA</button>
              <button onClick={() => setShowInviteModal(false)} style={{ marginTop: '10px', color: 'var(--secondary)', fontSize: '14px', fontWeight: '600' }}>FECHAR</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Search Users Modal */}
      {showSearchModal && (
        <div className="modal-backdrop">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'var(--surface)', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: '800', fontSize: '1.2rem', textAlign: 'center' }}>Convidar por @Username</h3>
            
            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input
                type="text"
                autoFocus
                placeholder="Ex: @ronaldinho"
                value={searchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
              />
              {searching && <div style={{ position: 'absolute', right: '16px', top: '16px' }} className="loader-spinner-small" />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {searchResults.length === 0 && searchQuery.length >= 3 && !searching && (
                <p style={{ textAlign: 'center', color: 'var(--secondary)', fontSize: '14px', padding: '1rem' }}>Nenhum usuário encontrado.</p>
              )}
              {searchResults.map(u => (
                <div key={u.uid} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' }}>
                    <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: '800' }}>{u.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--primary)' }}>@{u.username}</p>
                  </div>
                  <button onClick={() => handleInviteUserByUid(u)} style={{ background: 'var(--primary)', color: 'black', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '900' }}>CONVIDAR</button>
                </div>
              ))}
            </div>

            <button onClick={() => setShowSearchModal(false)} style={{ width: '100%', marginTop: '1.5rem', padding: '14px', borderRadius: '14px', color: 'var(--secondary)', fontWeight: '700' }}>Fechar</button>
          </motion.div>
          <style jsx>{`
            .loader-spinner-small {
              width: 20px; height: 20px;
              border: 2px solid rgba(255,255,255,0.1);
              border-top: 2px solid var(--primary);
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
          `}</style>
        </div>
      )}
      {showGuestModal && (
        <div className="modal-backdrop">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'var(--surface)', width: '100%', maxWidth: '380px', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '0.5rem', fontWeight: '800', fontSize: '1.2rem', textAlign: 'center' }}>Adicionar Convidado</h3>
            <p style={{ color: 'var(--secondary)', fontSize: '12px', marginBottom: '1.5rem', textAlign: 'center' }}>Jogador sem conta no app</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Nome do Convidado *</label>
                <input
                  type="text"
                  placeholder="Ex: João"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', outline: 'none' }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Posição</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'CA'].map(pos => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setGuestPosition(pos)}
                      style={{
                        padding: '10px 0', borderRadius: '10px',
                        background: guestPosition === pos ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: guestPosition === pos ? 'black' : 'var(--secondary)',
                        fontSize: '11px', fontWeight: '800',
                        border: guestPosition === pos ? 'none' : '1px solid var(--border)'
                      }}
                    >{pos}</button>
                  ))}
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Nível Estimado: <span style={{ color: 'var(--primary)', fontSize: '16px' }}>{guestLevel}</span>/10</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={guestLevel}
                  onChange={e => setGuestLevel(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--secondary)', marginTop: '4px' }}>
                  <span>Iniciante</span>
                  <span>Craque</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
              <button onClick={() => setShowGuestModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--border)', fontWeight: '700' }}>Cancelar</button>
              <button onClick={handleAddGuestPlayer} disabled={!guestName.trim()} style={{ flex: 2, padding: '14px', borderRadius: '14px', background: 'var(--primary)', color: 'black', fontWeight: '900', opacity: guestName.trim() ? 1 : 0.5 }}>ADICIONAR</button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
      
      <MatchDetailsModal 
        show={showDetails} 
        onClose={() => setShowDetails(false)}
        match={activeMatch}
        user={user}
        profile={profile}
        handleNotifyPayment={handleNotifyPayment}
        handleVerifyPayment={handleVerifyPayment}
        handleUndoPayment={handleUndoPayment}
        handleApprovePlayer={handleApprovePlayer}
        handleRejectPlayer={handleRejectPlayer}
        handleRemoveParticipant={handleRemoveParticipant}
      />

      {/* Toast Notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          style={{
            position: 'fixed', bottom: '100px', left: '50%',
            background: toast.type === 'success' ? 'var(--primary)' : toast.type === 'warning' ? 'var(--warning)' : 'var(--surface)',
            color: toast.type === 'success' ? 'black' : 'white',
            padding: '16px 24px', borderRadius: '16px', zIndex: 10000000,
            fontWeight: '800', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'
          }}
        >
          {toast.type === 'info' && <AlertCircle size={20} />}
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.type === 'warning' && <AlertCircle size={20} />}
          {toast.message}
        </motion.div>
      )}
    </>
  );
}



function MatchDetailsModal({ show, onClose, match, user, profile, handleNotifyPayment, handleVerifyPayment, handleUndoPayment, handleApprovePlayer, handleRejectPlayer, handleRemoveParticipant }: any) {
  if (!show || !match?.id) return null;

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
      background: 'rgba(0,0,0,0.98)', zIndex: 999999, 
      display: 'flex', justifyContent: 'center',
      color: 'white', overflowY: 'auto', backdropFilter: 'blur(15px)'
    }}>
      <div style={{ 
        width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', paddingTop: 'env(safe-area-inset-top, 20px)' }}>
          <h2 style={{ fontWeight: '900', fontSize: '1.6rem', letterSpacing: '-0.5px' }}>Detalhes da Pelada</h2>
          <button 
            onClick={onClose} 
            style={{ background: 'var(--surface)', color: 'white', padding: '10px 20px', borderRadius: '14px', fontWeight: '800', border: '1px solid var(--border)', fontSize: '14px' }}
          >
            FECHAR
          </button>
        </div>

        <div style={{ flex: 1, paddingBottom: '60px' }}>
          {/* Admin: Pending Approvals */}
          {profile?.role === 'admin' && match.pendingPlayers?.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={22} /> Solicitações ({match.pendingPlayers.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {match.pendingPlayers.map((player: any) => (
                  <div key={player.uid} style={{ background: 'var(--surface)', padding: '16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden' }}>
                      <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: '700' }}>{player.name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--secondary)' }}>Solicitou entrada via link</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleRejectPlayer(player)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}><Trash2 size={18} /></button>
                      <button onClick={() => handleApprovePlayer(player)} style={{ background: 'var(--primary)', color: 'black', padding: '8px 16px', borderRadius: '10px', fontWeight: '800' }}>ACEITAR</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Your Status Section */}
          {match.participants?.some((p: any) => p.uid === user?.uid) && (
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)', 
              padding: '1.5rem', borderRadius: '24px', marginBottom: '2.5rem', 
              border: '1px solid var(--primary-glow)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}>
              <h4 style={{ fontSize: '11px', marginBottom: '10px', color: 'var(--primary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>Sua Situação</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '16px', fontWeight: '800' }}>
                  {match.participants.find((p: any) => p.uid === user?.uid)?.paymentStatus === 'verified' ? '✅ Pagamento Confirmado' : 
                   match.participants.find((p: any) => p.uid === user?.uid)?.paymentStatus === 'notified' ? '🟡 Aguardando Admin' : 
                   '🔴 Pendente'}
                </p>
                {match.participants.find((p: any) => p.uid === user?.uid)?.paymentStatus === 'pending' && (
                  <button 
                    onClick={handleNotifyPayment}
                    style={{ background: 'var(--primary)', color: 'black', padding: '12px 24px', borderRadius: '14px', fontSize: '14px', fontWeight: '900', boxShadow: '0 4px 15px var(--primary-glow)' }}
                  >
                    JÁ PAGUEI
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Confirmed List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={22} color="var(--primary)" /> Confirmados
            </h3>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--secondary)', background: 'var(--surface)', padding: '4px 12px', borderRadius: '10px' }}>
              {match.participants?.length || 0}/{match.maxPlayers || 18}
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '3rem' }}>
            {match.participants?.map((player: any, index: number) => (
              <div key={player.uid} style={{ 
                background: 'var(--surface)', padding: '16px', borderRadius: '22px', 
                display: 'flex', alignItems: 'center', gap: '16px', 
                border: '1px solid var(--border)',
                transition: 'transform 0.2s'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--secondary)', width: '28px', textAlign: 'center' }}>{index + 1}</span>
                <div style={{ 
                  width: '50px', height: '50px', borderRadius: '50%', 
                  background: 'var(--border)', overflow: 'hidden', 
                  border: '2px solid ' + (player.paymentStatus === 'verified' ? 'var(--primary)' : 'transparent'),
                  boxShadow: player.paymentStatus === 'verified' ? '0 0 10px var(--primary-glow)' : 'none'
                }}>
                  <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {player.isGuest ? (
                      <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px', color: 'white' }}>{player.name}</span>
                    ) : (
                      <Link href={`/perfil/${player.uid}`} style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px', color: 'white', textDecoration: 'none' }}>{player.name}</Link>
                    )}
                    {player.isGuest && <span className="badge-guest">CONVIDADO</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: player.paymentStatus === 'verified' ? 'var(--primary)' : player.paymentStatus === 'notified' ? 'var(--warning)' : 'var(--error)' }} />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--secondary)', textTransform: 'uppercase' }}>
                      {player.paymentStatus === 'verified' ? 'Pago' : player.paymentStatus === 'notified' ? 'Avisou' : 'Pendente'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {profile?.role === 'admin' && player.paymentStatus === 'notified' && (
                    <button 
                      onClick={() => handleVerifyPayment(player.uid)}
                      style={{ background: 'var(--primary)', color: 'black', padding: '10px 16px', borderRadius: '12px', fontSize: '11px', fontWeight: '900' }}
                    >
                      VALIDAR
                    </button>
                  )}
                  
                  {(profile?.role === 'admin' || profile?.uid === player.uid) && (player.paymentStatus === 'notified' || player.paymentStatus === 'verified') && (
                    <button 
                      onClick={() => { if (confirm('Tem certeza que deseja desfazer a confirmação de pagamento?')) handleUndoPayment(player.uid) }}
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--secondary)', padding: '10px 16px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', border: '1px solid var(--border)' }}
                    >
                      DESFAZER
                    </button>
                  )}

                  {profile?.role === 'admin' && (
                    <button 
                      onClick={() => handleRemoveParticipant(player, 'participants')}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Waiting List */}
          {match.waitingList?.length > 0 && (
            <>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={22} /> Lista de Espera
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {match.waitingList.map((player: any, index: number) => (
                  <div key={player.uid} style={{ opacity: 0.8, background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--secondary)', width: '25px' }}>{index + 1}</span>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--border)', overflow: 'hidden' }}>
                      <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <Link href={`/perfil/${player.uid}`} style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: 'white', textDecoration: 'none' }}>{player.name}</Link>
                    {profile?.role === 'admin' && (
                      <button 
                        onClick={() => handleRemoveParticipant(player, 'waitingList')}
                        style={{ color: 'var(--error)', padding: '8px', opacity: 0.6 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CountdownTimer({ date, time }: { date: string, time: string }) {
  const [timeLeft, setTimeLeft] = useState<any>({ d: 0, h: 0, m: 0, s: 0 });
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (!date) return;
      const [day, month, year] = date.split('/').map(Number);
      const [hours, minutes] = (time || '00:00').split(':').map(Number);
      const target = new Date(year, month - 1, day, hours, minutes);
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      
      if (diff > 0) {
        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff / (1000 * 60 * 60)) % 24),
          m: Math.floor((diff / 1000 / 60) % 60),
          s: Math.floor((diff / 1000) % 60)
        });
      } else {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [date, time]);

  return (
    <div style={{ 
      background: 'var(--surface)', 
      padding: '1.5rem', 
      borderRadius: '24px', 
      marginBottom: '1rem', 
      textAlign: 'center',
      border: '1px solid var(--border)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
    }}>
      <p style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '1px' }}>CONTAGEM REGRESSIVA</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
        {[
          { label: 'DIAS', val: timeLeft.d },
          { label: 'HORAS', val: timeLeft.h },
          { label: 'MIN', val: timeLeft.m },
          { label: 'SEG', val: timeLeft.s }
        ].map((unit, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--primary)', lineHeight: '1' }}>{unit.val.toString().padStart(2, '0')}</div>
            <div style={{ fontSize: '9px', color: 'var(--secondary)', fontWeight: '700', marginTop: '4px' }}>{unit.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
