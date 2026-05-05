"use client";

import React, { useState } from 'react';
import { Trophy, Star, TrendingUp, Calendar, Medal, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import PlayerCard from '@/components/PlayerCard';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import Link from 'next/link';
import { calculateNewOverall, calculateAttributeChange, getCardType, detectAutoPosition, detectPlayStyle, detectPlayStyles, calculateInformBoost, type PlayerStyle, type PlayStyle } from '@/lib/evolution';

export default function RankingPage() {
  const [tab, setTab] = useState<'performance' | 'presence' | 'rising' | 'falling'>('performance');
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
    if (!selectedPlayer || !user) return;

    try {
      // 1. Calcular a média desta avaliação (0-10)
      const ratingsArray = Object.values(votes) as number[];
      const matchRating = ratingsArray.reduce((a, b) => a + b, 0) / ratingsArray.length;

      // 2. Buscar dados atuais do jogador no Firebase para evolução precisa
      const playerRef = doc(db, 'users', selectedPlayer.id);
      const playerSnap = await getDoc(playerRef);
      
      if (!playerSnap.exists()) return;
      const playerData = playerSnap.data();

      // 3. Preparar dados para o motor de evolução
      const currentOverall = playerData.overall || 50;
      const recentRatings = playerData.recentRatings || [];
      const recentAverage = recentRatings.length > 0 
        ? recentRatings.reduce((a: number, b: number) => a + b, 0) / recentRatings.length 
        : 5;

      // 4. Calcular novo Overall
      const newOverall = calculateNewOverall(currentOverall, matchRating, recentAverage);

      // 5. Calcular novos atributos individuais
      const currentAttrs = playerData.attributes || {
        velocidade: 50, finalizacao: 50, passe: 50, drible: 50, defesa: 50, fisico: 50
      };

      const newAttrs: any = { ...currentAttrs };
      
      // Mapeamento simplificado das notas para os atributos
      if (playerData.position === 'GOL') {
        newAttrs.reflexo = calculateAttributeChange(currentAttrs.reflexo || 50, votes.stat1 || 5);
        newAttrs.elasticidade = calculateAttributeChange(currentAttrs.elasticidade || 50, votes.stat2 || 5);
        newAttrs.manejo = calculateAttributeChange(currentAttrs.manejo || 50, votes.stat3 || 5);
        newAttrs.posicionamento = calculateAttributeChange(currentAttrs.posicionamento || 50, votes.stat4 || 5);
      } else {
        newAttrs.finalizacao = calculateAttributeChange(currentAttrs.finalizacao || 50, votes.stat1 || 5);
        newAttrs.defesa = calculateAttributeChange(currentAttrs.defesa || 50, votes.stat2 || 5);
        newAttrs.passe = calculateAttributeChange(currentAttrs.passe || 50, votes.stat3 || 5);
        newAttrs.fisico = calculateAttributeChange(currentAttrs.fisico || 50, votes.stat4 || 5);
        newAttrs.velocidade = calculateAttributeChange(currentAttrs.velocidade || 50, votes.stat5 || 5);
        newAttrs.drible = calculateAttributeChange(currentAttrs.drible || 50, votes.stat6 || 5);
      }

      // 6. Detectar Posição e Estilo
      const autoPos = detectAutoPosition(newAttrs, playerData.position || 'MEI');
      const style = detectPlayStyle(newAttrs, newOverall);
      const playStyles = detectPlayStyles(newAttrs, newOverall);

      // 7. Calcular Streak e Boost (Novo!)
      let streak = playerData.informStreak || 0;
      if (matchRating >= 8.5) {
        streak += 1;
      } else {
        streak = 0;
      }
      
      const boost = calculateInformBoost(newOverall, streak);
      const boostedOverall = newOverall + boost;

      // 8. Atualizar histórico e média recente
      const updatedRecentRatings = [matchRating, ...recentRatings].slice(0, 5);
      const today = new Date().toISOString().split('T')[0];

      // 9. Salvar no Firebase
      await updateDoc(playerRef, {
        overall: boostedOverall,
        attributes: newAttrs,
        recentRatings: updatedRecentRatings,
        cardType: getCardType(boostedOverall),
        overallHistory: arrayUnion({ date: today, value: boostedOverall }),
        autoPosition: autoPos,
        playStyle: style,
        playStyles: playStyles,
        informStreak: streak
      });

      alert(`Avaliação enviada! ${selectedPlayer.name} ${boost > 0 ? 'ganhou um BOOST de sequência!' : ''} Agora tem OVR ${boostedOverall}.`);
    } catch (error) {
      console.error("Erro ao processar evolução:", error);
      alert("Erro ao enviar avaliação.");
    }

    setShowRatingModal(false);
    setSelectedPlayer(null);
  };

  // Filtrar e ordenar dados baseado na aba
  const getSortedData = () => {
    let data = [...rankingData];
    if (tab === 'performance') return data.sort((a, b) => (b.overall || 0) - (a.overall || 0));
    if (tab === 'presence') return data.sort((a, b) => (b.totalGames || 0) - (a.totalGames || 0));
    if (tab === 'rising') return data.filter(p => (p.recentRatings?.length || 0) > 0).sort((a, b) => {
      const aAvg = (a.recentRatings || []).reduce((sum: number, r: number) => sum + r, 0) / (a.recentRatings?.length || 1);
      const bAvg = (b.recentRatings || []).reduce((sum: number, r: number) => sum + r, 0) / (b.recentRatings?.length || 1);
      return bAvg - aAvg;
    });
    if (tab === 'falling') return data.filter(p => (p.recentRatings?.length || 0) > 0).sort((a, b) => {
      const aAvg = (a.recentRatings || []).reduce((sum: number, r: number) => sum + r, 0) / (a.recentRatings?.length || 1);
      const bAvg = (b.recentRatings || []).reduce((sum: number, r: number) => sum + r, 0) / (b.recentRatings?.length || 1);
      return aAvg - bAvg;
    });
    return data;
  };

  const sortedData = getSortedData();
  const top3 = sortedData.slice(0, 3);
  const others = sortedData.slice(3);

  // Jogadores INFORM (Top 3 por avaliação recente)
  const informPlayers = [...rankingData]
    .filter(p => (p.recentRatings?.length || 0) > 0)
    .sort((a, b) => (b.recentRatings?.[0] || 0) - (a.recentRatings?.[0] || 0))
    .slice(0, 3);

  const highlightPlayer = informPlayers[0];
  const mostRegularPlayer = [...rankingData].sort((a, b) => (b.totalGames || 0) - (a.totalGames || 0))[0];

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
            padding: '12px 8px', 
            borderRadius: '14px', 
            background: tab === 'presence' ? 'var(--primary)' : 'transparent',
            color: tab === 'presence' ? 'black' : 'var(--secondary)',
            fontWeight: '800',
            fontSize: '12px',
            transition: 'all 0.3s'
          }}
        >
          Presença
        </button>
        <button 
          onClick={() => setTab('rising')}
          style={{ 
            flex: 1, 
            padding: '12px 8px', 
            borderRadius: '14px', 
            background: tab === 'rising' ? 'var(--primary)' : 'transparent',
            color: tab === 'rising' ? 'black' : 'var(--secondary)',
            fontWeight: '800',
            fontSize: '12px',
            transition: 'all 0.3s'
          }}
        >
          Em Alta 📈
        </button>
        <button 
          onClick={() => setTab('falling')}
          style={{ 
            flex: 1, 
            padding: '12px 8px', 
            borderRadius: '14px', 
            background: tab === 'falling' ? 'var(--primary)' : 'transparent',
            color: tab === 'falling' ? 'black' : 'var(--secondary)',
            fontWeight: '800',
            fontSize: '12px',
            transition: 'all 0.3s'
          }}
        >
          Em Queda 📉
        </button>
      </div>

      {/* Destaques da Rodada (INFORM) */}
      {tab === 'performance' && informPlayers.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ margin: '0 0 1.5rem', fontWeight: '900', fontSize: '1.4rem', color: '#FFD700', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={24} /> DESTAQUES DA RODADA
          </h3>
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '20px', paddingLeft: '4px' }}>
            {informPlayers.map((player) => (
              <div key={player.id} style={{ flexShrink: 0 }}>
                <PlayerCard 
                  name={player.name}
                  overall={player.overall || 50}
                  position={player.position || 'MEI'}
                  photoURL={player.photoURL}
                  attributes={player.attributes || { velocidade: 50, finalizacao: 50, passe: 50, drible: 50, defesa: 50, fisico: 50 }}
                  size="sm"
                  variant="inform"
                  playStyle={player.playStyle as PlayerStyle}
                  playStyles={player.playStyles as PlayStyle[]}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Podium Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', marginBottom: '4rem' }}>
        {top3.length > 0 ? (
          <>
            <div style={{ transform: 'scale(1.1)', zIndex: 10 }}>
              <PlayerCard 
                name={top3[0].name}
                overall={top3[0].overall || 50} 
                position={top3[0].position || "ATA"}
                photoURL={top3[0].photoURL}
                attributes={top3[0].attributes || { velocidade: 50, finalizacao: 50, passe: 50, drible: 50, defesa: 50, fisico: 50 }}
                size="md"
                playStyle={top3[0].playStyle as PlayerStyle}
                playStyles={top3[0].playStyles as PlayStyle[]}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', width: '100%', padding: '15px', justifyContent: 'center' }}>
              {top3.slice(1).map((player, i) => (
                <PlayerCard 
                  key={player.id}
                  name={player.name}
                  overall={player.overall || 50}
                  position={player.position || "MEI"}
                  photoURL={player.photoURL}
                  attributes={player.attributes || { velocidade: 50, finalizacao: 50, passe: 50, drible: 50, defesa: 50, fisico: 50 }}
                  size="sm"
                  playStyle={player.playStyle as PlayerStyle}
                  playStyles={player.playStyles as PlayStyle[]}
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
              <Link href={`/perfil/${player.id}`} style={{ fontWeight: '700', fontSize: '15px', color: 'white', textDecoration: 'none' }}>{player.name}</Link>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '18px', fontWeight: '900', color: tab === 'performance' ? 'var(--primary)' : 'white' }}>
                {tab === 'performance' ? (player.overall || 50) : (player.totalGames || 0)}
              </p>
              <p style={{ fontSize: '10px', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: '800' }}>
                {tab === 'performance' ? 'OVR' : 'Jogos'}
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
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-gradient)', margin: '0 auto 12px', overflow: 'hidden', border: '3px solid var(--primary)' }}>
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
          <button onClick={() => onSave(ratings)} style={{ flex: 2, padding: '16px', borderRadius: '16px', background: 'var(--primary-gradient)', color: 'black', fontWeight: '900', boxShadow: '0 5px 15px var(--primary-glow)' }}>ENVIAR NOTAS</button>
        </div>
      </motion.div>
    </div>
  );
}
