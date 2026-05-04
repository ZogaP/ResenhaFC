"use client";

import React, { useState } from 'react';
import { Trophy, Star, TrendingUp, Calendar, Medal, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import PlayerCard from '@/components/PlayerCard';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function RankingPage() {
  const [tab, setTab] = useState<'performance' | 'presence'>('performance');
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [showVoting, setShowVoting] = useState(false);
  const [lastMatch, setLastMatch] = useState<any>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const { user, profile } = useAuth();

  // Fetch real ranking data
  React.useEffect(() => {
    const q = query(collection(db, 'users'), orderBy(tab === 'performance' ? 'rating' : 'games', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRankingData(users);
    });
    return () => unsubscribe();
  }, [tab]);

  // Logic to detect if match just ended
  React.useEffect(() => {
    const fetchLastMatch = async () => {
      const q = query(
        collection(db, 'matches'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const matchData: any = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          const now = new Date();
          const todayStr = now.toLocaleDateString('pt-BR');
          
          // Check if match is from today and ended
          if (matchData.date === todayStr || matchData.date === now.toISOString().split('T')[0]) {
            const [hours, minutes] = (matchData.timeEnd || '00:00').split(':');
            const endMatchTime = new Date();
            endMatchTime.setHours(parseInt(hours), parseInt(minutes), 0);
            
            // Show voting if it's after match end and before midnight
            if (now > endMatchTime) {
              setLastMatch(matchData);
              setShowVoting(true);
            }
          }
        }
      });
    };
    fetchLastMatch();
  }, []);

  const handleDetailedVote = async (votes: any) => {
    console.log('Enviando avaliação detalhada:', votes);
    alert(`Avaliação técnica enviada para ${selectedPlayer.name}!`);
    setShowRatingModal(false);
    setSelectedPlayer(null);
  };

  const sortedData = rankingData;
  const top3 = sortedData.slice(0, 3);
  const others = sortedData.slice(3);

  // Find highlights from real data
  const highlightPlayer = [...rankingData].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  const mostRegularPlayer = [...rankingData].sort((a, b) => (b.games || 0) - (a.games || 0))[0];

  return (
    <div className="fade-in container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '2rem', paddingTop: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Ranking Geral</h1>
        <p style={{ color: 'var(--secondary)' }}>Os melhores da temporada</p>
      </header>

      {/* Post-Match Voting Section */}
      {showVoting && lastMatch && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
            padding: '1.5rem', 
            borderRadius: '24px', 
            marginBottom: '2.5rem',
            color: 'white',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
            <div>
              <h3 style={{ fontWeight: '900', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={20} fill="white" /> EVOLUÇÃO TÉCNICA
              </h3>
              <p style={{ fontSize: '12px', fontWeight: '600', opacity: 0.9 }}>Avalie o desempenho dos seus companheiros de hoje.</p>
            </div>
            <button onClick={() => setShowVoting(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>✕</button>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '10px' }}>
            {lastMatch.participants?.filter((p: any) => p.uid !== user?.uid).map((player: any) => (
              <div 
                key={player.uid} 
                onClick={() => { setSelectedPlayer(player); setShowRatingModal(true); }}
                style={{ flex: '0 0 85px', textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ width: '65px', height: '65px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', margin: '0 auto 8px', overflow: 'hidden', border: '2px solid white', padding: '2px' }}>
                  <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                </div>
                <p style={{ fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name.split(' ')[0]}</p>
                <span style={{ fontSize: '9px', fontWeight: '900', background: 'white', color: '#059669', padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase' }}>AVALIAR</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        background: 'var(--surface)', 
        padding: '6px', 
        borderRadius: '18px', 
        marginBottom: '2.5rem',
        border: '1px solid var(--border)'
      }}>
        <button 
          onClick={() => setTab('performance')}
          style={{ 
            flex: 1, 
            padding: '14px', 
            borderRadius: '14px', 
            background: tab === 'performance' ? 'var(--primary)' : 'transparent',
            color: tab === 'performance' ? 'black' : 'var(--secondary)',
            fontWeight: '800',
            fontSize: '14px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          Desempenho
        </button>
        <button 
          onClick={() => setTab('presence')}
          style={{ 
            flex: 1, 
            padding: '14px', 
            borderRadius: '14px', 
            background: tab === 'presence' ? 'var(--primary)' : 'transparent',
            color: tab === 'presence' ? 'black' : 'var(--secondary)',
            fontWeight: '800',
            fontSize: '14px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          Presença
        </button>
      </div>

      {/* Podium Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', marginBottom: '4rem' }}>
        {top3.length > 0 ? (
          <>
            <div style={{ transform: 'scale(1.1)', zIndex: 10 }}>
              <PlayerCard 
                name={top3[0].name}
                overall={Math.round((top3[0].rating || 0) * 10)} 
                position={top3[0].position || "ATA"}
                photoURL={top3[0].photoURL}
                attributes={top3[0].attributes || { ataque: 50, defesa: 50, passe: 50, velocidade: 50, fisico: 50, finalizacao: 50 }}
                size="md"
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', width: '100%', padding: '15px', justifyContent: 'center' }}>
              {top3.slice(1).map((player, i) => (
                <PlayerCard 
                  key={player.id}
                  name={player.name}
                  overall={Math.round((player.rating || 0) * 10)}
                  position={player.position || "MEI"}
                  photoURL={player.photoURL}
                  attributes={player.attributes || { ataque: 50, defesa: 50, passe: 50, velocidade: 50, fisico: 50, finalizacao: 50 }}
                  size="sm"
                />
              ))}
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>Nenhum jogador ranqueado ainda.</p>
        )}
      </div>

      {/* List */}
      <div className="glass" style={{ borderRadius: '28px', overflow: 'hidden', marginBottom: '3rem' }}>
        {others.map((player, i) => (
          <div key={player.id} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '20px',
            borderBottom: i === others.length - 1 ? 'none' : '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--secondary)', width: '25px' }}>{i + 4}</span>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', overflow: 'hidden' }}>
                {player.photoURL ? (
                  <img src={player.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={22} color="var(--secondary)" />
                )}
              </div>
              <span style={{ fontWeight: '700', fontSize: '15px' }}>{player.name}</span>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '18px', fontWeight: '900', color: tab === 'performance' ? 'var(--primary)' : 'white' }}>
                {tab === 'performance' ? (player.rating || 0).toFixed(1) : (player.games || 0)}
              </p>
              <p style={{ fontSize: '10px', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: '800' }}>
                {tab === 'performance' ? 'Nota' : 'Jogos'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Highlights / Special Awards */}
      <h3 style={{ margin: '0 0 1.5rem', fontWeight: '800', fontSize: '1.3rem' }}>Conquistas</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginBottom: '2rem' }}>
        <div className="glass" style={{ padding: '1.2rem', borderRadius: '20px', borderLeft: '4px solid var(--primary)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <Medal size={22} color="var(--primary)" style={{ marginBottom: '10px' }} />
          <p style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '800' }}>DESTAQUE DA RODADA</p>
          <p style={{ fontSize: '15px', fontWeight: '800' }}>{highlightPlayer ? highlightPlayer.name : '---'}</p>
        </div>
        <div className="glass" style={{ padding: '1.2rem', borderRadius: '20px', borderLeft: '4px solid var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
          <TrendingUp size={22} color="var(--warning)" style={{ marginBottom: '10px' }} />
          <p style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '800' }}>MAIS REGULAR</p>
          <p style={{ fontSize: '15px', fontWeight: '800' }}>{mostRegularPlayer ? mostRegularPlayer.name : '---'}</p>
        </div>
      </div>

      <RatingModal 
        show={showRatingModal}
        player={selectedPlayer}
        onClose={() => setShowRatingModal(false)}
        onSave={handleDetailedVote}
      />
    </div>
  );
}

function RatingModal({ show, player, onClose, onSave }: any) {
  const [ratings, setRatings] = useState<any>({ stat1: 5, stat2: 5, stat3: 5, stat4: 5, stat5: 5, stat6: 5 });
  if (!show || !player) return null;

  const isGK = player.position === 'GOL';

  const categories = isGK ? [
    { key: 'stat1', label: 'Reflexos', icon: '🧤' },
    { key: 'stat2', label: 'Elasticidade', icon: '🤸‍♂️' },
    { key: 'stat3', label: 'Reposição / Saída', icon: '⚽' },
    { key: 'stat4', label: 'Posicionamento', icon: '📍' },
  ] : [
    { key: 'stat1', label: 'Ataque / Finalização', icon: '🎯' },
    { key: 'stat2', label: 'Defesa / Marcação', icon: '🛡️' },
    { key: 'stat3', label: 'Passe / Visão', icon: '👟' },
    { key: 'stat4', label: 'Físico / Raça', icon: '💪' },
    { key: 'stat5', label: 'Velocidade', icon: '⚡' },
    { key: 'stat6', label: 'Drible', icon: '🪄' },
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(10px)' }}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'var(--surface)', width: '100%', maxWidth: '400px', borderRadius: '32px', padding: '2rem', border: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', margin: '0 auto 12px', overflow: 'hidden', border: '3px solid var(--primary)' }}>
            <img src={player.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '900' }}>Avaliar {player.name.split(' ')[0]}</h3>
          <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>Como foi o desempenho técnico hoje?</p>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px', 
          marginBottom: '2rem',
          maxHeight: '320px',
          overflowY: 'auto',
          paddingRight: '8px'
        }} className="custom-scroll">
          {categories.map(cat => (
            <div key={cat.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>{cat.icon} {cat.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  step="1"
                  value={ratings[cat.key]} 
                  onChange={(e) => setRatings({ ...ratings, [cat.key]: parseInt(e.target.value) })}
                  style={{ 
                    flex: 1,
                    accentColor: 'var(--primary)',
                    height: '6px',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '10px', 
                  background: 'rgba(255,255,255,0.05)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid var(--border)',
                  fontSize: '16px',
                  fontWeight: '900',
                  color: ratings[cat.key] >= 8 ? 'var(--primary)' : ratings[cat.key] <= 3 ? '#ef4444' : 'white'
                }}>
                  {ratings[cat.key]}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'transparent', color: 'var(--secondary)', fontWeight: '700' }}>CANCELAR</button>
          <button onClick={() => onSave(ratings)} style={{ flex: 2, padding: '16px', borderRadius: '16px', background: 'var(--primary)', color: 'black', fontWeight: '900', boxShadow: '0 5px 15px var(--primary-glow)' }}>ENVIAR NOTAS</button>
        </div>
      </motion.div>
    </div>
  );
}
