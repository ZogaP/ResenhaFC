"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Trophy, Star, Calendar, Ruler, Weight, Footprints, TrendingUp, TrendingDown, Minus, Info, Sparkles, UserPlus, CheckCircle, Lock, X, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { transformMediaLink } from '@/lib/utils';
import PlayerCard from '@/components/PlayerCard';
import { getEvolutionTrend, getStyleMetadata, getPlayStyleMetadata, type PlayerStyle, type PlayStyle } from '@/lib/evolution';

export default function PerfilPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const uid = params.uid as string;
  const isOwnProfile = user?.uid === uid;

  const [profileData, setProfileData] = useState<any>(null);
  const [lances, setLances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [matchesList, setMatchesList] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'info' | 'success' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSendRequest = async () => {
    if (!user || isOwnProfile) return;
    try {
      const { arrayUnion, updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', uid), {
        friendRequests: arrayUnion(user.uid)
      });
      // Refresh local state to show "Sent"
      setProfileData((prev: any) => ({
        ...prev,
        friendRequests: [...(prev.friendRequests || []), user.uid]
      }));
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar pedido.");
    }
  };

  useEffect(() => {
    if (!uid) return;

    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          setProfileData(snap.data());
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [uid]);

  // Fetch lances by this user
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'lances'),
      where('uid', '==', uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenação manual no cliente para evitar erro de índice
      items.sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setLances(items);
    });

    return () => unsubscribe();
  }, [uid]);

  // Fetch friends details
  useEffect(() => {
    if (showFriendsModal && profileData?.friends) {
      const fetchFriends = async () => {
        const friends = await Promise.all(
          profileData.friends.map(async (fUid: string) => {
            const snap = await getDoc(doc(db, 'users', fUid));
            return snap.exists() ? { uid: fUid, ...snap.data() } : null;
          })
        );
        setFriendsList(friends.filter((f: any) => f !== null));
      };
      fetchFriends();
    }
  }, [showFriendsModal, profileData?.friends]);

  // Fetch matches history
  useEffect(() => {
    if (showMatchesModal && uid) {
      const q = query(
        collection(db, 'matches'),
        orderBy('date', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const filtered = all.filter((m: any) => 
          m.participants?.some((p: any) => p.uid === uid) ||
          m.waitingList?.some((p: any) => p.uid === uid)
        );
        setMatchesList(filtered);
      });
      return () => unsubscribe();
    }
  }, [showMatchesModal, uid]);

  const handleDeleteMatch = async (matchId: string) => {
    if (profile?.role !== 'admin') return;
    if (!confirm("Tem certeza que deseja excluir esta partida permanentemente? Isso afetará o histórico de todos os participantes.")) return;
    
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'matches', matchId));
      showToast("Partida excluída!", "success");
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir partida.");
    }
  };

  const handleClearAllMatches = async () => {
    if (profile?.role !== 'admin') return;
    if (!confirm("⚠️ PERIGO: Isso excluirá TODAS as partidas do banco de dados para TODO MUNDO. Esta ação não pode ser desfeita. Continuar?")) return;
    if (!confirm("CONFIRMAÇÃO FINAL: Você tem certeza absoluta?")) return;

    try {
      const { getDocs, collection, deleteDoc, doc } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'matches'));
      const batch = snap.docs.map(d => deleteDoc(doc(db, 'matches', d.id)));
      await Promise.all(batch);
      showToast("Histórico global limpo!", "success");
    } catch (e) {
      console.error(e);
      alert("Erro ao limpar histórico.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--surface)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ fontWeight: '800', marginBottom: '1rem' }}>Jogador não encontrado</h2>
        <button onClick={() => router.back()} style={{ color: 'var(--primary)', fontWeight: '700' }}>Voltar</button>
      </div>
    );
  }

  const positionLabels: Record<string, string> = {
    GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante',
    MEI: 'Meia', PON: 'Ponta', CA: 'Centroavante'
  };

  const attrs = profileData.attributes || {};
  const isGoalkeeper = profileData.position === 'GOL';

  // Privacy: determine if the viewer can see the full profile
  const isFriend = profile?.friends?.includes(uid) || false;
  const isProfilePrivate = profileData.profileVisibility === 'privado';
  const canViewFull = isOwnProfile || !isProfilePrivate || isFriend;



  return (
    <>
    <div className="fade-in" style={{ paddingBottom: '100px' }}>
      {/* Back Button */}
      <button onClick={() => router.back()} style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '1.5rem', paddingTop: '1rem' }}>
        <ArrowLeft size={20} /> Voltar
      </button>

      {/* Profile Header & Card */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ transform: 'scale(1.1)', marginBottom: '1.5rem' }}>
          <PlayerCard 
            name={profileData.name}
            overall={profileData.overall || 50}
            position={profileData.position || 'MEI'}
            photoURL={profileData.photoURL}
            attributes={profileData.attributes || { velocidade: 50, finalizacao: 50, passe: 50, drible: 50, defesa: 50, fisico: 50 }}
            size="md"
            variant={profileData.isInform ? 'inform' : undefined}
            playStyle={profileData.playStyle as PlayerStyle}
            playStyles={profileData.playStyles as PlayStyle[]}
          />
        </div>

        {/* Trend Badge */}
        {profileData.overallHistory && profileData.overallHistory.length > 1 && (
          <div style={{ 
            padding: '8px 16px', 
            borderRadius: '20px', 
            background: 'var(--surface)', 
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '1rem'
          }}>
            {getEvolutionTrend(profileData.overallHistory) === 'rising' && (
              <><TrendingUp size={16} color="var(--primary)" /> <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>EM ASCENSÃO</span></>
            )}
            {getEvolutionTrend(profileData.overallHistory) === 'falling' && (
              <><TrendingDown size={16} color="#ef4444" /> <span style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444' }}>EM QUEDA</span></>
            )}
            {getEvolutionTrend(profileData.overallHistory) === 'stable' && (
              <><Minus size={16} color="var(--secondary)" /> <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--secondary)' }}>ESTÁVEL</span></>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>
              {profileData.name}
            </h1>
            {profileData.isAdmin && (
              <span title="Administrador" style={{ color: '#22c55e' }}>
                <CheckCircle size={20} fill="#22c55e" color="black" />
              </span>
            )}
          </div>
          <p style={{ color: 'var(--secondary)', margin: 0, fontSize: '14px' }}>
            {profileData.username ? `@${profileData.username}` : 'Jogador LineUp'}
          </p>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {isOwnProfile ? (
              <>
                <Link href="/amigos" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: 'var(--primary)',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '800',
                  textDecoration: 'none',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <UserPlus size={16} /> MEUS AMIGOS
                </Link>
                <Link href="/setup-profile" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--surface)',
                  color: 'var(--secondary)',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '800',
                  textDecoration: 'none',
                  border: '1px solid var(--border)'
                }}>
                  CONFIGURAÇÕES
                </Link>
              </>
            ) : (
              <button 
                onClick={handleSendRequest}
                disabled={profile?.friends?.includes(uid) || profileData.friendRequests?.includes(user?.uid)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: profile?.friends?.includes(uid) ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                  color: profile?.friends?.includes(uid) ? 'var(--secondary)' : 'black',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '900',
                  border: 'none',
                  cursor: (profile?.friends?.includes(uid) || profileData.friendRequests?.includes(user?.uid)) ? 'default' : 'pointer',
                  opacity: (profileData.friendRequests?.includes(user?.uid)) ? 0.7 : 1
                }}
              >
                <UserPlus size={18} />
                {profile?.friends?.includes(uid) ? 'AMIGOS' : 
                 profileData.friendRequests?.includes(user?.uid) ? 'PEDIDO ENVIADO' : 'ADICIONAR AMIGO'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', width: '100%', marginTop: '1rem' }}>
            <button 
              onClick={() => setShowMatchesModal(true)}
              style={{ background: 'none', border: 'none', color: 'white', textAlign: 'center', cursor: 'pointer' }}
            >
              <p style={{ fontSize: '1.4rem', fontWeight: '900' }}>{profileData.totalGames || 0}</p>
              <p style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '700' }}>PARTIDAS</p>
            </button>
            <button 
              onClick={() => setShowFriendsModal(true)}
              style={{ background: 'none', border: 'none', color: 'white', textAlign: 'center', cursor: 'pointer' }}
            >
              <p style={{ fontSize: '1.4rem', fontWeight: '900' }}>{profileData.friends?.length || 0}</p>
              <p style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '700' }}>AMIGOS</p>
            </button>
          </div>

          {/* Privacy Badge */}
          {isProfilePrivate && !isOwnProfile && (
            <div style={{ marginTop: '12px' }}>
              <span className="badge-visibility private" style={{ fontSize: '11px' }}>
                <Lock size={12} /> PERFIL PRIVADO
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Locked Profile Message */}
      {!canViewFull && (
        <div className="glass" style={{ 
          padding: '2rem', borderRadius: '24px', marginBottom: '1.5rem', textAlign: 'center',
          borderLeft: '6px solid var(--warning)'
        }}>
          <Lock size={36} color="var(--warning)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontWeight: '800', marginBottom: '8px' }}>Perfil Privado</h3>
          <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.5' }}>
            Este jogador tem o perfil privado. Adicione como amigo para ver atributos, estatísticas e lances.
          </p>
        </div>
      )}

      {/* Evolution Graph (SVG) — Only when viewable */}
      {canViewFull && profileData.overallHistory && profileData.overallHistory.length > 1 && (
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '800', marginBottom: '1.5rem', fontSize: '14px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} /> EVOLUÇÃO DE OVERALL
          </h3>
          <div style={{ width: '100%', height: '120px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: 'var(--primary)', stopOpacity: 0.3 }} />
                  <stop offset="100%" style={{ stopColor: 'var(--primary)', stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              {/* Path */}
              <path 
                d={`M ${profileData.overallHistory.map((h: any, i: number) => 
                  `${(i / (profileData.overallHistory.length - 1)) * 100},${40 - ((h.value - 40) / 60) * 40}`
                ).join(' L ')}`}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Area */}
              <path 
                d={`M 0,40 L ${profileData.overallHistory.map((h: any, i: number) => 
                  `${(i / (profileData.overallHistory.length - 1)) * 100},${40 - ((h.value - 40) / 60) * 40}`
                ).join(' L ')} L 100,40 Z`}
                fill="url(#grad)"
              />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '700' }}>INÍCIO</span>
              <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '900' }}>OVR {profileData.overall}</span>
            </div>
          </div>
        </div>
      )}

      {/* Play Style Card — Only when viewable */}
      {canViewFull && profileData.playStyle && (
        <div className="glass" style={{ 
          padding: '1.5rem', 
          borderRadius: '24px', 
          marginBottom: '1.5rem',
          borderLeft: `6px solid ${getStyleMetadata(profileData.playStyle as PlayerStyle).color}`,
          background: `linear-gradient(90deg, ${getStyleMetadata(profileData.playStyle as PlayerStyle).color}11 0%, transparent 100%)`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <span style={{ fontSize: '2rem' }}>{getStyleMetadata(profileData.playStyle as PlayerStyle).icon}</span>
            <div>
              <h3 style={{ fontWeight: '900', fontSize: '1.2rem', color: 'white' }}>
                ESTILO: {getStyleMetadata(profileData.playStyle as PlayerStyle).label}
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '800' }}>IDENTIDADE TÁTICA</p>
            </div>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5', fontWeight: '500' }}>
            {getStyleMetadata(profileData.playStyle as PlayerStyle).desc}
          </p>
        </div>
      )}

      {/* PlayStyles List — Only when viewable */}
      {canViewFull && profileData.playStyles && profileData.playStyles.length > 0 && (
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '800', marginBottom: '1rem', fontSize: '14px', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} /> HABILIDADES ESPECIAIS
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {profileData.playStyles.map((ps: any, i: number) => (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '12px', 
                background: ps.plus ? 'linear-gradient(90deg, rgba(255,215,0,0.1) 0%, transparent 100%)' : 'rgba(255,255,255,0.03)',
                borderRadius: '16px',
                border: ps.plus ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.05)'
              }}>
                <span style={{ 
                  fontSize: '1.5rem', 
                  width: '40px', height: '40px', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: ps.plus ? '#FFD700' : 'var(--surface)',
                  borderRadius: '10px',
                  boxShadow: ps.plus ? '0 0 10px rgba(255,215,0,0.3)' : 'none'
                }}>
                  {getPlayStyleMetadata(ps.id).icon}
                </span>
                <div>
                  <h4 style={{ fontWeight: '800', fontSize: '14px', color: ps.plus ? '#FFD700' : 'white' }}>
                    {getPlayStyleMetadata(ps.id).label}{ps.plus ? ' PLUS' : ''}
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--secondary)' }}>CARACTERÍSTICA ESPECIAL</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bio / Physical — Only when viewable */}
      {canViewFull && (profileData.altura || profileData.peso || profileData.chuteira) && (
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '800', marginBottom: '1rem', fontSize: '14px', color: 'var(--secondary)' }}>INFORMAÇÕES</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
            {profileData.altura && (
              <div>
                <Ruler size={20} color="var(--primary)" style={{ margin: '0 auto 6px' }} />
                <p style={{ fontWeight: '900', fontSize: '1.1rem' }}>{profileData.altura}cm</p>
                <p style={{ fontSize: '10px', color: 'var(--secondary)' }}>ALTURA</p>
              </div>
            )}
            {profileData.peso && (
              <div>
                <Weight size={20} color="var(--primary)" style={{ margin: '0 auto 6px' }} />
                <p style={{ fontWeight: '900', fontSize: '1.1rem' }}>{profileData.peso}kg</p>
                <p style={{ fontSize: '10px', color: 'var(--secondary)' }}>PESO</p>
              </div>
            )}
            {profileData.chuteira && (
              <div>
                <Footprints size={20} color="var(--primary)" style={{ margin: '0 auto 6px' }} />
                <p style={{ fontWeight: '900', fontSize: '1.1rem' }}>{profileData.chuteira}</p>
                <p style={{ fontSize: '10px', color: 'var(--secondary)' }}>CHUTEIRA</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attributes — Only when viewable */}
      {canViewFull && 
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '20px', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '800', marginBottom: '1rem', fontSize: '14px', color: 'var(--secondary)' }}>ATRIBUTOS</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {isGoalkeeper ? (
              <>
                {[
                  { label: 'Elasticidade', val: attrs.elasticidade },
                  { label: 'Reflexo', val: attrs.reflexo },
                  { label: 'Manejo', val: attrs.manejo },
                  { label: 'Posicionamento', val: attrs.posicionamento },
                ].map(a => a.val != null && (
                  <div key={a.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>{a.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--primary)' }}>{a.val}</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--surface)', borderRadius: '3px' }}>
                      <div style={{ height: '100%', width: `${a.val}%`, background: 'var(--primary-gradient)', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {[
                  { label: 'Velocidade', val: attrs.velocidade },
                  { label: 'Finalização', val: attrs.finalizacao },
                  { label: 'Passe', val: attrs.passe },
                  { label: 'Drible', val: attrs.drible },
                  { label: 'Defesa', val: attrs.defesa },
                  { label: 'Físico', val: attrs.fisico },
                ].map(a => a.val != null && (
                  <div key={a.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>{a.label}</span>
                      <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--primary)' }}>{a.val}</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--surface)', borderRadius: '3px' }}>
                      <div style={{ height: '100%', width: `${a.val}%`, background: 'var(--primary-gradient)', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      }

      {/* Highlights / Lances — Only when viewable */}
      {canViewFull && 
        <div>
          <h3 style={{ fontWeight: '800', marginBottom: '1rem', fontSize: '14px', color: 'var(--secondary)' }}>
            LANCES PUBLICADOS ({lances.length})
          </h3>
          {lances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--surface)', borderRadius: '20px', border: '1px dashed var(--border)' }}>
              <p style={{ color: 'var(--secondary)', fontWeight: '600', fontSize: '14px' }}>Nenhum lance publicado ainda.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {lances.map(lance => {
                return (
                  <motion.div
                    key={lance.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'var(--surface)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}
                  >
                    <div style={{ width: '100%', aspectRatio: '1/1', background: '#000', position: 'relative' }}>
                      {lance.type === 'video' ? (
                        <iframe
                          src={lance.url}
                          style={{ width: '100%', height: '100%', border: 'none' }}
                          allow="autoplay; encrypted-media"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <img
                          src={lance.url}
                          alt=""
                          referrerPolicy="no-referrer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <div style={{ padding: '10px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--secondary)', lineHeight: '1.4' }}>{lance.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      }
    </div>

    {/* Friends Full Screen View */}
    <AnimatePresence>
      {showFriendsModal && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            width: '100%', maxWidth: '500px', margin: '0 auto', height: '100vh',
            background: 'var(--background)', zIndex: 99999, 
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 0 50px rgba(0,0,0,0.5)'
          }}
        >
          {/* Header */}
          <header style={{ 
            display: 'flex', alignItems: 'center', padding: '1.5rem', 
            borderBottom: '1px solid var(--border)', background: 'rgba(10, 10, 10, 0.8)', 
            backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10
          }}>
            <button onClick={() => setShowFriendsModal(false)} style={{ padding: '10px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white', marginRight: '1rem' }}>
              <ArrowLeft size={20} />
            </button>
            <h3 style={{ fontWeight: '900', fontSize: '1.2rem', margin: 0 }}>Amigos ({friendsList.length})</h3>
          </header>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {friendsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--secondary)' }}>
                <p style={{ fontSize: '14px', fontWeight: '700' }}>Nenhum amigo ainda.</p>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                gap: '12px', 
                maxWidth: '800px', 
                margin: '0 auto',
                justifyContent: 'center' 
              }}>
                {friendsList.map(friend => (
                  <motion.div 
                    key={friend.uid} 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setShowFriendsModal(false); router.push(`/perfil/${friend.uid}`); }} 
                    style={{ 
                      display: 'flex', flexDirection: 'column', alignItems: 'center', 
                      gap: '12px', padding: '20px', background: 'var(--surface)', 
                      borderRadius: '24px', border: '1px solid var(--border)', cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', overflow: 'hidden', border: '2px solid var(--primary)', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>
                      <img src={friend.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '900', margin: '0 0 4px 0' }}>{friend.name}</p>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--primary)', background: 'rgba(29, 185, 84, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>{friend.position || 'Jogador'}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Matches Full Screen View */}
    <AnimatePresence>
      {showMatchesModal && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            width: '100%', maxWidth: '500px', margin: '0 auto', height: '100vh',
            background: 'var(--background)', zIndex: 99999, 
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 0 50px rgba(0,0,0,0.5)'
          }}
        >
          {/* Header */}
          <header style={{ 
            display: 'flex', alignItems: 'center', padding: '1.5rem', 
            borderBottom: '1px solid var(--border)', background: 'rgba(10, 10, 10, 0.8)', 
            backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10
          }}>
            <button onClick={() => setShowMatchesModal(false)} style={{ padding: '10px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white', marginRight: '1rem' }}>
              <ArrowLeft size={20} />
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontWeight: '900', fontSize: '1.2rem' }}>Histórico de Partidas</h3>
              {profile?.role === 'admin' && (
                <button 
                  onClick={handleClearAllMatches}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '6px 12px', borderRadius: '10px', fontSize: '10px', fontWeight: '900', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                >
                  LIMPAR TUDO (GLOBAL)
                </button>
              )}
            </div>
          </header>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              {matchesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--secondary)' }}>
                  <p style={{ fontSize: '14px', fontWeight: '700' }}>Nenhuma partida registrada.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {matchesList.flatMap((m: any) => {
                    const cards: any[] = [];

                    // 1. Add all games from history
                    if (m.gamesHistory && m.gamesHistory.length > 0) {
                      m.gamesHistory.forEach((game: any, gIdx: number) => {
                        const pData = game.participants?.find((p: any) => p.uid === uid);
                        if (!pData) return;

                        const isWin = (game.winner === 'A' && m.teams?.[0]?.players?.some((p: any) => p.uid === uid)) || 
                                      (game.winner === 'B' && m.teams?.[1]?.players?.some((p: any) => p.uid === uid));
                        const isLoss = game.winner !== 'Draw' && !isWin && game.winner !== null;
                        const isDraw = game.winner === 'Draw';

                        let statusColor = 'var(--secondary)';
                        let statusText = 'PARTIDA';
                        if (isWin) { statusColor = '#22c55e'; statusText = 'VITÓRIA'; }
                        else if (isLoss) { statusColor = '#ef4444'; statusText = 'DERROTA'; }
                        else if (isDraw) { statusColor = '#94a3b8'; statusText = 'EMPATE'; }

                        cards.push(
                          <motion.div 
                            key={`${m.id}-game-${gIdx}`} 
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setShowMatchesModal(false); router.push(`/partida/${m.id}`); }} 
                            style={{ 
                              padding: '0', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border)', cursor: 'pointer',
                              display: 'flex', overflow: 'hidden', minHeight: '80px', position: 'relative'
                            }}
                          >
                            <div style={{ width: '6px', flexShrink: 0, background: statusColor }} />
                            <div style={{ flex: 1, padding: '12px 10px', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, minWidth: '55px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '900', color: statusColor }}>{statusText}</span>
                                <span style={{ fontSize: '8px', color: 'var(--secondary)', fontWeight: '700', textTransform: 'uppercase' }}>{m.title?.split(' ')[0] || 'Pelada'}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flex: 1, justifyContent: 'center', minWidth: 0 }}>
                                <div style={{ textAlign: 'center', minWidth: '20px' }}>
                                  <p style={{ fontSize: '12px', fontWeight: '900', color: (pData.goals || 0) > 0 ? 'var(--primary)' : 'white', margin: 0 }}>{pData.goals || 0}</p>
                                  <p style={{ fontSize: '7px', fontWeight: '900', color: 'var(--secondary)', margin: 0 }}>GOL</p>
                                </div>
                                <div style={{ textAlign: 'center', minWidth: '20px' }}>
                                  <p style={{ fontSize: '12px', fontWeight: '900', color: (pData.assists || 0) > 0 ? 'var(--primary)' : 'white', margin: 0 }}>{pData.assists || 0}</p>
                                  <p style={{ fontSize: '7px', fontWeight: '900', color: 'var(--secondary)', margin: 0 }}>AST</p>
                                </div>
                                <div style={{ textAlign: 'center', minWidth: '20px' }}>
                                  <p style={{ fontSize: '12px', fontWeight: '900', margin: 0 }}>{Math.floor((pData.minutesPlayed || 0) / 60)}'</p>
                                  <p style={{ fontSize: '7px', fontWeight: '900', color: 'var(--secondary)', margin: 0 }}>MIN</p>
                                </div>
                              </div>
                              <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                                <p style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '0.5px', fontFamily: 'monospace', margin: 0 }}>
                                  {game.scoreA ?? 0}<span style={{ color: 'var(--secondary)', fontSize: '10px', margin: '0 1px' }}>-</span>{game.scoreB ?? 0}
                                </p>
                              </div>
                              <div style={{ textAlign: 'right', minWidth: '40px', flexShrink: 0 }}>
                                <p style={{ fontSize: '8px', fontWeight: '900', margin: '0 0 1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.timestamp ? new Date(game.timestamp.seconds * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Arena'}</p>
                                <p style={{ fontSize: '7px', color: 'var(--secondary)', margin: 0 }}>{new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                              </div>
                            </div>
                            {profile?.role === 'admin' && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleDeleteMatch(m.id); }}
                                 style={{ position: 'absolute', top: '8px', right: '40px', padding: '4px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', border: 'none', zIndex: 10 }}
                               >
                                 <Trash2 size={12} />
                               </button>
                             )}
                            {game.mvp === uid && (
                              <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--warning)', color: 'black', fontSize: '7px', fontWeight: '900', padding: '1px 5px', borderBottomLeftRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                                MVP
                              </div>
                            )}
                          </motion.div>
                        );
                      });
                    }

                    // 2. Add the ongoing/current game if it's not already in history
                    // (Matches without gamesHistory OR the current live game of a session)
                    const isOngoing = !m.winner && m.status !== 'finished';
                    const userParticipated = m.participants?.some((p: any) => p.uid === uid) || m.waitingList?.some((p: any) => p.uid === uid);
                    
                    if (userParticipated && (!m.gamesHistory || m.gamesHistory.length === 0 || isOngoing)) {
                      const userTeam = m.teamA?.some((p: any) => p.uid === uid) ? 'A' : 
                                     m.teamB?.some((p: any) => p.uid === uid) ? 'B' : null;
                      
                      const isWin = (m.winner === 'A' && userTeam === 'A') || (m.winner === 'B' && userTeam === 'B');
                      const isLoss = (m.winner && m.winner !== userTeam && userTeam !== null);
                      const isDraw = m.winner === 'Draw';

                      let statusColor = 'var(--secondary)';
                      let statusText = 'FINALIZADA';
                      if (isWin) { statusColor = '#22c55e'; statusText = 'VITÓRIA'; }
                      else if (isLoss) { statusColor = '#ef4444'; statusText = 'DERROTA'; }
                      else if (isDraw) { statusColor = '#94a3b8'; statusText = 'EMPATE'; }
                      else if (isOngoing) { statusColor = '#f59e0b'; statusText = 'EM ANDAMENTO'; }

                      const participantData = m.finalParticipants?.find((p: any) => p.uid === uid) || m.participants?.find((p: any) => p.uid === uid);
                      const pGoals = participantData?.goals || 0;
                      const pAssists = participantData?.assists || 0;
                      const pMinutes = Math.floor((participantData?.minutesPlayed || 0) / 60);

                      cards.push(
                        <motion.div 
                          key={`${m.id}-current`} 
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { setShowMatchesModal(false); router.push(`/partida/${m.id}`); }} 
                          style={{ 
                            padding: '0', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border)', cursor: 'pointer',
                            display: 'flex', overflow: 'hidden', minHeight: '80px', position: 'relative'
                          }}
                        >
                          <div style={{ width: '6px', flexShrink: 0, background: statusColor }} />
                          <div style={{ flex: 1, padding: '12px 10px', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, minWidth: '55px' }}>
                              <span style={{ fontSize: '10px', fontWeight: '900', color: statusColor }}>{statusText}</span>
                              <span style={{ fontSize: '8px', color: 'var(--secondary)', fontWeight: '700', textTransform: 'uppercase' }}>{m.type || 'Pelada'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flex: 1, justifyContent: 'center', minWidth: 0 }}>
                              <div style={{ textAlign: 'center', minWidth: '20px' }}>
                                <p style={{ fontSize: '12px', fontWeight: '900', color: pGoals > 0 ? 'var(--primary)' : 'white', margin: 0 }}>{pGoals}</p>
                                <p style={{ fontSize: '7px', fontWeight: '900', color: 'var(--secondary)', margin: 0 }}>GOL</p>
                              </div>
                              <div style={{ textAlign: 'center', minWidth: '20px' }}>
                                <p style={{ fontSize: '12px', fontWeight: '900', color: pAssists > 0 ? 'var(--primary)' : 'white', margin: 0 }}>{pAssists}</p>
                                <p style={{ fontSize: '7px', fontWeight: '900', color: 'var(--secondary)', margin: 0 }}>AST</p>
                              </div>
                              <div style={{ textAlign: 'center', minWidth: '20px' }}>
                                <p style={{ fontSize: '12px', fontWeight: '900', margin: 0 }}>{pMinutes}'</p>
                                <p style={{ fontSize: '7px', fontWeight: '900', color: 'var(--secondary)', margin: 0 }}>MIN</p>
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                              <p style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '0.5px', fontFamily: 'monospace', margin: 0 }}>
                                {m.scoreA ?? 0}<span style={{ color: 'var(--secondary)', fontSize: '10px', margin: '0 1px' }}>-</span>{m.scoreB ?? 0}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: '40px', flexShrink: 0 }}>
                              <p style={{ fontSize: '8px', fontWeight: '900', margin: '0 0 1px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title?.split(' ')[0] || 'Arena'}</p>
                              <p style={{ fontSize: '7px', color: 'var(--secondary)', margin: 0 }}>{new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                            </div>
                          </div>
                          {profile?.role === 'admin' && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleDeleteMatch(m.id); }}
                                 style={{ position: 'absolute', top: '8px', right: '40px', padding: '4px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', border: 'none', zIndex: 10 }}
                               >
                                 <Trash2 size={12} />
                               </button>
                             )}
                          {m.mvp === uid && (
                            <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--warning)', color: 'black', fontSize: '7px', fontWeight: '900', padding: '1px 5px', borderBottomLeftRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                              MVP
                            </div>
                          )}
                        </motion.div>
                      );
                    }

                    return cards;
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
              background: toast.type === 'success' ? 'var(--primary)' : toast.type === 'warning' ? '#f59e0b' : 'var(--surface)',
              color: toast.type === 'success' ? 'black' : 'white',
              padding: '12px 24px', borderRadius: '16px', fontWeight: '800', fontSize: '14px',
              zIndex: 10000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px', justifyContent: 'center'
            }}
          >
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'warning' && <AlertCircle size={18} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
    </>
  );
}
