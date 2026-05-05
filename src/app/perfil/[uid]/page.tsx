"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Trophy, Star, Calendar, Ruler, Weight, Footprints, TrendingUp, TrendingDown, Minus, Info, Sparkles, UserPlus, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
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

  return (
    <div className="fade-in container" style={{ paddingBottom: '100px' }}>
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
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.4rem', fontWeight: '900' }}>{profileData.totalGames || 0}</p>
              <p style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '700' }}>PARTIDAS</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.4rem', fontWeight: '900' }}>{profileData.username ? `@${profileData.username}` : '---'}</p>
              <p style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '700' }}>IDENTIDADE</p>
            </div>
          </div>
        </div>
      </div>

      {/* Evolution Graph (SVG) */}
      {profileData.overallHistory && profileData.overallHistory.length > 1 && (
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

      {/* Play Style Card */}
      {profileData.playStyle && (
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

      {/* PlayStyles List */}
      {profileData.playStyles && profileData.playStyles.length > 0 && (
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

      {/* Bio / Physical */}
      {(profileData.altura || profileData.peso || profileData.chuteira) && (
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

      {/* Attributes */}
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

      {/* Highlights / Lances */}
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
            {lances.map(lance => (
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
