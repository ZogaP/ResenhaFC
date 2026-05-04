"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Clock, DollarSign, CheckCircle2, UserCheck, AlertCircle, ShieldCheck, Plus, Cake, PartyPopper, Camera, CheckCircle, Trash2, Users } from 'lucide-react';
import { clsx } from 'clsx';
import PlayerCard from '@/components/PlayerCard';
import { doc, updateDoc, collection, query, where, orderBy, limit, onSnapshot, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { transformMediaLink } from '@/lib/utils';

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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const q = query(
      collection(db, 'matches'), 
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const scheduledMatch = snapshot.docs.find(doc => doc.data().status === 'scheduled');
        if (scheduledMatch) {
          const data = { id: scheduledMatch.id, ...scheduledMatch.data() };
          setActiveMatch(data);
        } else {
          setActiveMatch(EMPTY_MATCH);
        }
      } else {
        setActiveMatch(EMPTY_MATCH);
      }
    });

    return () => unsubscribe();
  }, []);

  const isUserConfirmed = activeMatch.participants?.some((p: any) => p.uid === user?.uid);
  const isWaiting = activeMatch.waitingList?.some((p: any) => p.uid === user?.uid);

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
      if (isUserConfirmed || isWaiting) {
        const listField = isUserConfirmed ? 'participants' : 'waitingList';
        const participantToRemove = (isUserConfirmed ? activeMatch.participants : activeMatch.waitingList)
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
          paymentStatus: 'pending'
        };

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

  const handleShareMatch = async () => {
    if (!activeMatch.id) return;
    const shareUrl = `${window.location.origin}/?matchId=${activeMatch.id}`;
    const shareText = `⚽ *PARTIDA MARCADA!* ⚽\n\n📍 Local: ${activeMatch.location}\n📅 Data: ${activeMatch.date}\n⏰ Hora: ${activeMatch.time}\n\nConfirme sua presença no site:\n${shareUrl}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Show de Resenha FC - Convite',
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

  const handleInviteByEmail = async () => {
    setShowInviteModal(false);
    const email = prompt("Digite o e-mail do convidado para ele ser reconhecido ao entrar:");
    if (email && email.includes('@')) {
      const matchRef = doc(db, 'matches', activeMatch.id);
      const newInvitation = {
        email: email.toLowerCase(),
        invitedBy: user!.uid,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      try {
        await updateDoc(matchRef, {
          invitations: arrayUnion(newInvitation)
        });
        alert("E-mail cadastrado! Assim que ele logar, será convidado automaticamente.");
      } catch (e) {
        alert("Erro ao convidar.");
      }
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

  const updatePosition = async (pos: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { position: pos });
      if (profile) setProfile({ ...profile, position: pos as any });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader">Carregando...</div>
      </div>
    );
  }

  return (
    <>
    <div className="fade-in container" style={{ paddingBottom: '100px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingTop: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '400', color: 'var(--secondary)' }}>Olá,</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>{profile?.name} 👋</h1>
            {profile?.role === 'admin' && (
              <button 
                onClick={() => router.push('/admin')}
                style={{ padding: '4px', background: 'var(--surface)', borderRadius: '8px', color: 'var(--primary)' }}
              >
                <ShieldCheck size={20} />
              </button>
            )}
          </div>
        </div>
        <div 
          onClick={() => setShowProfileModal(true)}
          style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--primary)', overflow: 'hidden', position: 'relative', cursor: 'pointer', boxShadow: '0 0 15px var(--primary-glow)' }}
        >
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Perfil" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⚽</div>
          )}
        </div>
      </header>

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
                  <iframe src={h.url} style={{ width: '100%', height: '100%', border: 'none' }} />
                ) : (
                  <img src={h.url} alt={h.description} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  title: 'Show de Resenha FC',
                  text: `Bora pro futebol em ${activeMatch.location}? Data: ${activeMatch.date} às ${activeMatch.time}`,
                  url: window.location.href
                });
              }
            }} style={{ background: 'var(--surface)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: '1px solid var(--border)' }}>COMPARTILHAR</button>
          )}
          {profile?.role === 'admin' && (
            <button onClick={() => router.push('/admin/nova-partida')} style={{ background: 'var(--primary)', color: 'black', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}> <Plus size={16} /> NOVA</button>
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
          <div style={{ position: 'absolute', top: '15px', right: '15px', color: 'var(--primary)', fontSize: '10px', fontWeight: '800' }}>VER DETALHES</div>
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

          {profile?.role === 'admin' && activeMatch.id && !activeMatch.isClosed && (
            <button onClick={handleCloseList} style={{ width: '100%', padding: '14px', borderRadius: '16px', background: 'var(--error)', color: 'white', fontWeight: '800', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>FECHAR LISTA E GERAR PREÇO</button>
          )}
        </div>
      </motion.div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'var(--surface)', width: '100%', maxWidth: '350px', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border)', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: '800' }}>Como deseja convidar?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => { handleShareMatch(); setShowInviteModal(false); }} style={{ padding: '16px', background: 'var(--primary)', color: 'black', borderRadius: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>🔗 COPIAR LINK DA PARTIDA</button>
              <button onClick={handleInviteByEmail} style={{ padding: '16px', background: 'var(--surface)', color: 'white', borderRadius: '16px', fontWeight: '700', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>📧 CHAMAR PELO SITE (E-MAIL)</button>
              <button onClick={() => setShowInviteModal(false)} style={{ marginTop: '10px', color: 'var(--secondary)', fontSize: '14px', fontWeight: '600' }}>FECHAR</button>
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
      />

      <ProfileModal 
        show={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={profile}
        updatePhoto={updatePhoto}
        updatePosition={updatePosition}
        user={user}
      />
    </>
  );
}

{/* Profile Management Modal */}
function ProfileModal({ show, onClose, profile, updatePhoto, updatePosition, user }: any) {
  const { logout } = useAuth();
  if (!show) return null;

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
      background: 'rgba(0,0,0,0.98)', zIndex: 1000000, 
      display: 'flex', justifyContent: 'center',
      color: 'white', overflowY: 'auto', backdropFilter: 'blur(15px)'
    }}>
      <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', paddingTop: 'env(safe-area-inset-top, 20px)' }}>
          <h2 style={{ fontWeight: '900', fontSize: '1.6rem' }}>Meu Perfil</h2>
          <button onClick={onClose} style={{ background: 'var(--surface)', color: 'white', padding: '10px 20px', borderRadius: '14px', fontWeight: '800', border: '1px solid var(--border)' }}>FECHAR</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
          <div 
            onClick={updatePhoto}
            style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--surface)', border: '4px solid var(--primary)', overflow: 'hidden', position: 'relative', cursor: 'pointer', marginBottom: '1.5rem', boxShadow: '0 0 30px var(--primary-glow)' }}
          >
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>⚽</div>
            )}
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '4px' }}>{profile?.name}</h3>
          <p style={{ color: 'var(--secondary)', fontSize: '14px', fontWeight: '600' }}>{profile?.role === 'admin' ? '⭐ Administrador' : '🏃 Jogador'}</p>
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <h4 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '1px' }}>Minha Posição</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'CA'].map((pos) => (
              <button
                key={pos}
                onClick={() => updatePosition(pos)}
                style={{
                  padding: '12px 0', borderRadius: '16px',
                  background: profile?.position === pos ? 'var(--primary)' : 'var(--surface)',
                  color: profile?.position === pos ? 'black' : 'var(--secondary)',
                  fontSize: '12px', fontWeight: '800', border: '1px solid var(--border)',
                  transition: 'all 0.2s'
                }}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            onClick={updatePhoto}
            style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--surface)', color: 'white', fontWeight: '800', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            <Camera size={20} /> ALTERAR FOTO DE PERFIL
          </button>
          
          <button 
            onClick={() => { logout(); onClose(); }}
            style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: '800', border: '1px solid rgba(239, 68, 68, 0.2)', marginTop: '2rem' }}
          >
            SAIR DA CONTA
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchDetailsModal({ show, onClose, match, user, profile, handleNotifyPayment, handleVerifyPayment }: any) {
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
                  <p style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px' }}>{player.name}</p>
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
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '10px 16px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    >
                      DESFAZER
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
                    <p style={{ fontSize: '14px', fontWeight: '600' }}>{player.name}</p>
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
