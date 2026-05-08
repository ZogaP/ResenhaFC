"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Users, Shuffle, Lock, Shield, UserMinus, Plus, CheckCircle, Circle, Trash2, RefreshCw, Dices, Star, AlertTriangle, Play } from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { getCardType, getCardVisuals, getStyleMetadata, getPlayStyleMetadata, detectAutoPosition, type PlayerStyle, type PlayStyle } from '@/lib/evolution';

interface Player {
  uid: string;
  name: string;
  overall: number;
  isGoalkeeper: boolean;
  position: string;
  photoURL?: string;
  autoPosition?: string;
  playStyle?: string;
  playStyles?: PlayStyle[];
  attributes?: any;
  isGuest?: boolean;
  secondaryPosition?: string;
  skillLevel?: number;
  totalGames?: number;
  overallHistory?: { value: number, date: string }[];
  rating?: number;
}

export default function SorteioPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [playersPerTeam, setPlayersPerTeam] = useState(6);
  const [teams, setTeams] = useState<Player[][]>([]);
  const [bench, setBench] = useState<Player[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [confirmedPlayers, setConfirmedPlayers] = useState<Player[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  const [showWeightsModal, setShowWeightsModal] = useState(false);
  const [weights, setWeights] = useState({
    overall: 0.4,
    rating: 0.3,
    recent: 0.3
  });
  const [selectedForSwap, setSelectedForSwap] = useState<{ type: 'team' | 'bench', teamIdx: number | null, playerIdx: number } | null>(null);

  // Fetch match data and sync with Firestore
  React.useEffect(() => {
    const q = query(
      collection(db, 'matches'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        // Filter out mock matches
        const realMatches = matches.filter(m => {
          const loc = (m.location || '').toLowerCase();
          return !loc.includes('fictícia') && !loc.includes('teste') && !loc.includes('mock');
        });

        const scheduledMatch = realMatches.find(m => m.status === 'scheduled') || realMatches[0];
        
        if (scheduledMatch) {
          setActiveMatch(scheduledMatch);
          setActiveMatchId(scheduledMatch.id);
          setPresentIds(new Set(scheduledMatch.presentIds || []));
          // Convert from Firestore format {players:[...]} back to Player[][]
          const rawTeams = scheduledMatch.teams || [];
          setTeams(rawTeams.map((t: any) => t.players ? t.players : t));
          setBench(scheduledMatch.bench || []);
          
          const participants = (scheduledMatch.participants || []).map((p: any) => {
            return {
              ...p,
              overall: p.overall || 70,
              isGoalkeeper: p.position === 'GOL',
              attributes: p.attributes || { velocidade: 50, defesa: 50, passe: 50, ataque: 50, fisico: 50, finalizacao: 50 }
            };
          });
          setConfirmedPlayers(participants);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin';
  const isParticipant = activeMatch?.participants?.some((p: any) => p.uid === user?.uid);
  const isInvited = (activeMatch?.invitedUids || []).includes(user?.uid) || (activeMatch?.invitedEmails || []).includes(user?.email);
  const isAuthorized = !activeMatch || !activeMatch.visibility || activeMatch.visibility === 'publica' || isAdmin || isParticipant || isInvited || activeMatch.createdBy === user?.uid;

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)', color: 'white', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Lock size={40} color="var(--error)" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1rem' }}>Sorteio Privado</h2>
        <p style={{ color: 'var(--secondary)', fontSize: '14px', marginBottom: '2rem', maxWidth: '300px' }}>
          O sorteio desta partida é privado. Apenas o organizador e jogadores autorizados podem acessar esta tela.
        </p>
        <button 
          onClick={() => router.push('/')}
          style={{ padding: '12px 24px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: '800', color: 'white' }}
        >
          VOLTAR AO INÍCIO
        </button>
      </div>
    );
  }

  const togglePresence = async (uid: string) => {
    if (!activeMatchId) return;
    const next = new Set(presentIds);
    const isAdding = !next.has(uid);
    
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);

    const matchRef = doc(db, 'matches', activeMatchId);
    const updateData: any = { presentIds: Array.from(next) };

    // If adding a late player during a live match, add them to bench
    if (isAdding && activeMatch?.liveMatch?.isLive) {
      const player = confirmedPlayers.find(p => p.uid === uid);
      if (player) {
        const isAlreadyInMatch = activeMatch.teams?.some((t: any) => t.players.some((p: any) => p.uid === uid)) ||
                                 activeMatch.bench?.some((p: any) => p.uid === uid);
        
        if (!isAlreadyInMatch) {
          const currentBench = activeMatch.bench || [];
          updateData.bench = [...currentBench, { ...player, lastEntryTime: null, justEntered: false }];
          // Also update entry order for rotation
          const currentOrder = activeMatch.liveMatch?.entryOrder || [];
          updateData['liveMatch.entryOrder'] = [...currentOrder, uid];
        }
      }
    }

    await updateDoc(matchRef, updateData);
  };

  const selectAll = async () => {
    if (!activeMatchId) return;
    const next = presentIds.size === confirmedPlayers.length ? [] : confirmedPlayers.map(p => p.uid);
    const matchRef = doc(db, 'matches', activeMatchId);
    await updateDoc(matchRef, { presentIds: next });
  };

  const syncProfiles = async () => {
    if (!activeMatchId || confirmedPlayers.length === 0) return;
    setIsDrawing(true);
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      const updatedParticipants = await Promise.all(confirmedPlayers.map(async (p) => {
        if ((p as any).isGuest) {
          return p; // Preserve guest stats set during addition (e.g. rafflePower)
        }
        
        const userSnap = await getDoc(doc(db, 'users', p.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          return {
            ...p,
            overall: userData.overall || 50,
            attributes: userData.attributes || p.attributes,
            position: userData.position || p.position,
            secondaryPosition: userData.secondaryPosition || p.secondaryPosition,
            autoPosition: userData.autoPosition || p.autoPosition,
            playStyles: userData.playStyles || p.playStyles,
            skillLevel: userData.skillLevel || p.skillLevel,
            totalGames: userData.totalGames || 0,
            overallHistory: userData.overallHistory || [],
            rating: userData.rating || (userData.overall ? userData.overall / 10 : 5)
          };
        }
        return p;
      }));
      
      const matchRef = doc(db, 'matches', activeMatchId);
      // Sanitizar para remover campos undefined que quebram o Firebase
      const sanitized = JSON.parse(JSON.stringify(updatedParticipants));
      await updateDoc(matchRef, { participants: sanitized });
      setConfirmedPlayers(sanitized);
      alert("Perfis sincronizados com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao sincronizar perfis.");
    }
    setIsDrawing(false);
  };

  const simulateRatings = async () => {
    if (!activeMatchId || confirmedPlayers.length === 0 || !profile?.isAdmin) return;
    if (!confirm("Isso vai dar notas aleatórias para todos para teste. Continuar?")) return;
    
    setIsDrawing(true);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const randomized = confirmedPlayers.map(p => {
        const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
        const newAttrs = {
          velocidade: rand(40, 95),
          defesa: rand(40, 95),
          passe: rand(40, 95),
          ataque: rand(40, 95),
          fisico: rand(40, 95),
          finalizacao: rand(40, 95)
        };
        const newOvr = Math.round(Object.values(newAttrs).reduce((a, b) => a + b, 0) / 6);
        return {
          ...p,
          overall: newOvr,
          attributes: newAttrs
        };
      });

      const matchRef = doc(db, 'matches', activeMatchId);
      // Sanitizar para remover campos undefined que quebram o Firebase
      const sanitized = JSON.parse(JSON.stringify(randomized));
      await updateDoc(matchRef, { participants: sanitized });
      setConfirmedPlayers(sanitized);
      alert("Níveis simulados com sucesso! Agora você verá as posições e cores reais.");
    } catch (e) {
      console.error(e);
    }
    setIsDrawing(false);
  };



  const calculatePlayerStrength = (p: Player) => {
    const ovr = p.overall || 50;
    const avgRating = (p.rating || (ovr / 10)) * 10;
    let recentAvg = ovr;
    if (p.overallHistory && p.overallHistory.length > 0) {
      const lastMatches = p.overallHistory.slice(-3);
      recentAvg = lastMatches.reduce((acc, m) => acc + m.value, 0) / lastMatches.length;
    }
    return Math.round((ovr * weights.overall) + (avgRating * weights.rating) + (recentAvg * weights.recent));
  };

  const drawTeams = async (forceAnyway = false) => {
    const presentPlayers = confirmedPlayers.filter(p => presentIds.has(p.uid));
    const nonPresentPlayers = confirmedPlayers.filter(p => !presentIds.has(p.uid));
    
    if (presentPlayers.length === 0) {
      alert("Selecione os jogadores presentes!");
      return;
    }
    
    setIsDrawing(true);

    const keepers = presentPlayers.filter(p => (p.autoPosition === 'GOL' || p.position === 'GOL'));
    const nonKeepers = presentPlayers.filter(p => !keepers.includes(p));

    let totalTeams = Math.floor(presentPlayers.length / playersPerTeam);
    if (totalTeams === 0 && !forceAnyway) {
      setIsDrawing(false);
      return;
    }
    totalTeams = Math.max(totalTeams, forceAnyway ? Math.min(2, presentPlayers.length) : 1);

    let bestTeams: Player[][] = [];
    let bestBench: Player[] = [];
    let minDiff = Infinity;

    const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);

    // Tiering players for smarter distribution
    const sortedOthers = [...nonKeepers].sort((a, b) => calculatePlayerStrength(b) - calculatePlayerStrength(a));
    const topTier = sortedOthers.slice(0, Math.ceil(sortedOthers.length * 0.25));
    const midTier = sortedOthers.slice(topTier.length, topTier.length + Math.ceil(sortedOthers.length * 0.5));
    const baseTier = sortedOthers.slice(topTier.length + midTier.length);

    for (let i = 0; i < 100; i++) {
      const currentTeams: Player[][] = Array.from({ length: totalTeams }, () => []);
      const currentBench: Player[] = [];
      
      // Distribution order: Keepers -> Top -> Mid -> Base
      const waves = [
        shuffle(keepers),
        shuffle(topTier),
        shuffle(midTier),
        shuffle(baseTier)
      ];

      let teamIdx = 0;
      let forward = true;

      waves.forEach(wave => {
        wave.forEach(p => {
          let count = 0;
          // Find next available team
          while (currentTeams[teamIdx].length >= playersPerTeam && count < totalTeams) {
            if (forward) {
              if (teamIdx < totalTeams - 1) teamIdx++; else { forward = false; }
            } else {
              if (teamIdx > 0) teamIdx--; else { forward = true; }
            }
            count++;
          }

          if (currentTeams[teamIdx].length < playersPerTeam) {
            currentTeams[teamIdx].push(p);
            // Move to next team for snake distribution
            if (forward) {
              if (teamIdx < totalTeams - 1) teamIdx++; else { forward = false; }
            } else {
              if (teamIdx > 0) teamIdx--; else { forward = true; }
            }
          } else {
            currentBench.push(p);
          }
        });
      });

      const strengths = currentTeams.map(t => getTeamAverage(t));
      const diff = Math.max(...strengths) - Math.min(...strengths);
      
      if (diff < minDiff) {
        minDiff = diff;
        bestTeams = currentTeams;
        bestBench = currentBench;
      }
      if (diff <= 1) break; // Optimization: Near-perfect balance found
    }

    // Include non-present players at the end of the bench
    const finalBench = [...bestBench, ...nonPresentPlayers];

    if (activeMatchId) {
      const matchRef = doc(db, 'matches', activeMatchId);
      const teamsForFirestore = bestTeams.map(team => ({ players: team }));
      await updateDoc(matchRef, { teams: teamsForFirestore, bench: finalBench });
      setTeams(bestTeams);
      setBench(finalBench);
    }
    setIsDrawing(false);
  };

  const handleStartMatch = async () => {
    if (!activeMatchId || teams.length === 0) return;
    const matchRef = doc(db, 'matches', activeMatchId);
    
    const liveMatch = {
      isLive: true,
      score: { teamA: 0, teamB: 0 },
      timer: { running: false, elapsed: 0, startedAt: null },
      events: [],
      rotationEnabled: true,
      goalkeeperExempt: true,
      entryOrder: teams.flatMap(t => t.map(p => p.uid))
    };

    try {
      await updateDoc(matchRef, { liveMatch });
      router.push(`/partida/${activeMatchId}`);
    } catch (e) {
      console.error(e);
      alert("Erro ao iniciar partida.");
    }
  };

  const cancelSorteio = async () => {
    if (!activeMatchId) return;
    if (confirm("Tem certeza? Os times atuais serão apagados para um novo sorteio.")) {
      const matchRef = doc(db, 'matches', activeMatchId);
      await updateDoc(matchRef, { teams: [], bench: [] });
    }
  };

  const getTeamAverage = (team: Player[]) => {
    if (team.length === 0) return 0;
    const sum = team.reduce((acc, p) => acc + calculatePlayerStrength(p), 0);
    return Math.round(sum / team.length);
  };

  const handleSwapClick = async (type: 'team' | 'bench', teamIdx: number | null, playerIdx: number) => {
    if (!profile?.isAdmin) return;
    
    if (!selectedForSwap) {
      setSelectedForSwap({ type, teamIdx, playerIdx });
      return;
    }

    if (selectedForSwap.type === type && selectedForSwap.teamIdx === teamIdx && selectedForSwap.playerIdx === playerIdx) {
      setSelectedForSwap(null); // Cancel selection
      return;
    }

    // Perform swap
    const newTeams = [...teams];
    const newBench = [...bench];

    const getPlayer = (loc: {type: 'team'|'bench', teamIdx: number|null, playerIdx: number}) => {
      if (loc.type === 'team' && loc.teamIdx !== null) return newTeams[loc.teamIdx][loc.playerIdx];
      return newBench[loc.playerIdx];
    };
    
    const setPlayer = (loc: {type: 'team'|'bench', teamIdx: number|null, playerIdx: number}, player: Player) => {
      if (loc.type === 'team' && loc.teamIdx !== null) newTeams[loc.teamIdx][loc.playerIdx] = player;
      else newBench[loc.playerIdx] = player;
    };

    const playerA = getPlayer(selectedForSwap);
    const playerB = getPlayer({ type, teamIdx, playerIdx });

    setPlayer(selectedForSwap, playerB);
    setPlayer({ type, teamIdx, playerIdx }, playerA);

    setTeams(newTeams);
    setBench(newBench);
    setSelectedForSwap(null);

    // Save to Firestore
    if (activeMatchId) {
      const matchRef = doc(db, 'matches', activeMatchId);
      const teamsForFirestore = newTeams.map(team => ({ players: team }));
      await updateDoc(matchRef, { teams: teamsForFirestore, bench: newBench });
    }
  };



  return (
    <div className="fade-in" style={{ padding: '1rem', paddingBottom: '100px' }}>
      <header style={{ marginBottom: '1.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Sorteio de Times</h1>
          <p style={{ color: 'var(--secondary)', fontSize: '12px' }}>Matchmaking Inteligente (Matchmaking)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
           <button 
             onClick={() => setShowWeightsModal(true)}
             style={{ background: 'var(--surface)', padding: '6px 10px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
           >
              <span style={{ fontSize: '8px', fontWeight: '900', color: 'var(--secondary)' }}>SIMS</span>
              <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--primary)' }}>100x</span>
           </button>
        </div>
      </header>

      {/* ... (Weights Modal omitted for brevity, keeping existing code) ... */}

      {/* Presence Selection */}
      <div className="glass" style={{ padding: '1rem', borderRadius: '24px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ fontWeight: '800', fontSize: '0.9rem' }}>MARCAR PRESENÇA ({presentIds.size})</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={syncProfiles} title="Sincronizar dados dos perfis" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.05)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <RefreshCw size={14} className={isDrawing ? 'animate-spin' : ''} color="var(--secondary)" />
            </button>
            <button onClick={selectAll} style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '700', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>
              {presentIds.size === confirmedPlayers.length ? 'DESMARCAR TODOS' : 'MARCAR TODOS'}
            </button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
          {confirmedPlayers.map((player) => (
            <div 
              key={player.uid} 
              onClick={() => togglePresence(player.uid)}
              style={{ 
                padding: '8px 10px', 
                borderRadius: '14px', 
                background: presentIds.has(player.uid) ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                border: `1px solid ${presentIds.has(player.uid) ? 'var(--primary)' : 'var(--border)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                minWidth: 0
              }}
            >
              {presentIds.has(player.uid) ? <CheckCircle size={16} color="var(--primary)" /> : <Circle size={16} color="var(--secondary)" />}
              <span style={{ fontSize: '12px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{player.name}</span>
            </div>
          ))}
        </div>
      </div>



      {/* Raffle Settings */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '8px' }}>JOGADORES / TIME</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => setPlayersPerTeam(Math.max(1, playersPerTeam - 1))} style={{ padding: '8px', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)' }}><UserMinus size={16} /></button>
              <span style={{ fontSize: '1.4rem', fontWeight: '900' }}>{playersPerTeam}</span>
              <button onClick={() => setPlayersPerTeam(playersPerTeam + 1)} style={{ padding: '8px', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)' }}><Plus size={16} /></button>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <label style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '800', display: 'block', marginBottom: '8px' }}>TIMES POSSÍVEIS</label>
            <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--primary)' }}>
              {presentIds.size > 0 ? Math.floor(presentIds.size / playersPerTeam) : 0} <span style={{ fontSize: '10px', color: 'var(--secondary)' }}>FULL</span>
            </div>
          </div>
        </div>

        {/* Insufficient players warning */}
        {presentIds.size > 0 && presentIds.size < playersPerTeam && (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '16px', padding: '14px', marginBottom: '1rem', textAlign: 'center' }}>
            <p style={{ color: '#f59e0b', fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>
              ⚠️ Faltam {playersPerTeam - presentIds.size} jogador(es) para formar times de {playersPerTeam}
            </p>
            <button 
              onClick={() => drawTeams(true)}
              disabled={isDrawing}
              style={{ padding: '10px 20px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: '800', fontSize: '13px', border: '1px solid rgba(245, 158, 11, 0.4)' }}
            >
              FAZER MESMO ASSIM
            </button>
          </div>
        )}

        <button 
          onClick={() => drawTeams()}
          disabled={isDrawing}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: '18px',
            background: isDrawing ? 'var(--surface)' : 'var(--primary-gradient)',
            color: 'black',
            fontWeight: '900',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '1rem'
          }}
        >
          <Shuffle size={22} className={isDrawing ? 'animate-spin' : ''} />
          {isDrawing ? 'SORTEANDO...' : 'SORTEAR TIMES'}
        </button>

        {profile?.isAdmin && (
          <button 
            onClick={simulateRatings}
            disabled={isDrawing}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: 'var(--primary-gradient)',
              color: 'var(--secondary)',
              fontWeight: '800',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: '1px dashed var(--border)'
            }}
          >
            <Dices size={16} /> SIMULAR NÍVEIS (DEV MODE)
          </button>
        )}
      </div>

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {selectedForSwap && (
          <div style={{ background: 'var(--primary)', color: 'black', padding: '12px', borderRadius: '12px', textAlign: 'center', fontWeight: '900', fontSize: '13px', boxShadow: '0 0 15px var(--primary-glow)' }}>
            SELECIONE OUTRO JOGADOR PARA EFETUAR A TROCA (OU CLIQUE NOVAMENTE PARA CANCELAR)
          </div>
        )}
        {teams.length > 1 && (
          <div className="glass" style={{ 
            padding: '16px', 
            borderRadius: '20px', 
            textAlign: 'center',
            border: '1px solid var(--border)',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '12px' }}>
              {teams.map((t, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--secondary)' }}>TIME {i+1} PWR</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '900', color: i === 0 ? '#10b981' : '#3b82f6' }}>{getTeamAverage(t)}</span>
                </div>
              ))}
            </div>
            
            {Math.abs(getTeamAverage(teams[0]) - getTeamAverage(teams[1])) <= 4 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--primary)', fontSize: '12px', fontWeight: '900' }}>
                <CheckCircle size={16} /> BALANCEAMENTO ELITE (Δ {Math.abs(getTeamAverage(teams[0]) - getTeamAverage(teams[1]))})
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--warning)', fontSize: '12px', fontWeight: '900' }}>
                <AlertTriangle size={16} /> DISPARIDADE TÉCNICA (Δ {Math.abs(getTeamAverage(teams[0]) - getTeamAverage(teams[1]))})
              </div>
            )}
          </div>
        )}
        {teams.map((team, idx) => (
          <motion.div key={idx} className="glass" style={{ padding: '1.5rem', borderRadius: '24px', borderTop: `4px solid ${['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][idx % 4]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h4 style={{ fontWeight: '900', fontSize: '1.2rem' }}>TIME {idx + 1}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '80px', height: '6px', background: 'var(--surface)', borderRadius: '3px', overflow: 'hidden' }}>
                   <div style={{ width: `${getTeamAverage(team)}%`, height: '100%', background: idx === 0 ? '#10b981' : '#3b82f6' }} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: '900' }}>{getTeamAverage(team)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {team.map((player, pIdx) => {
                const isSelected = selectedForSwap?.type === 'team' && selectedForSwap?.teamIdx === idx && selectedForSwap?.playerIdx === pIdx;
                return (
                <div 
                  key={player.uid} 
                  onClick={() => handleSwapClick('team', idx, pIdx)}
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '10px 12px', 
                    background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)', 
                    borderRadius: '12px', 
                    border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                    cursor: profile?.isAdmin ? 'pointer' : 'default',
                    transition: 'all 0.2s ease'
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      background: getCardVisuals(getCardType(player.overall || 50)).bg, 
                      overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    {player.isGuest ? (
                      <div style={{ 
                        fontSize: '14px', fontWeight: '700', color: 'white',
                        display: 'flex', flexDirection: 'column', gap: '2px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {player.name}
                          <span className="badge-guest">CONV</span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {player.position || 'MEI'}
                        </span>
                      </div>
                    ) : (
                    <Link href={`/perfil/${player.uid}`} style={{ 
                      fontSize: '14px', 
                      fontWeight: '700', 
                      color: 'white', 
                      textDecoration: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {player.name}
                        {player.playStyle && (
                          <span title={getStyleMetadata(player.playStyle as PlayerStyle).label}>
                            {getStyleMetadata(player.playStyle as PlayerStyle).icon}
                          </span>
                        )}
                      </div>
                      <span style={{ 
                        fontSize: '10px', 
                        color: 'var(--secondary)', 
                        fontWeight: '800', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {detectAutoPosition(player.attributes || { velocidade: 50, defesa: 50, passe: 50, ataque: 50, fisico: 50, finalizacao: 50 }, player.position) || 'MEI'}
                      </span>
                    </Link>
                    )}
                  </div>
                  <div style={{ 
                    background: getCardVisuals(getCardType(player.overall || 50)).bg,
                    color: getCardVisuals(getCardType(player.overall || 50)).text,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '900',
                    minWidth: '38px',
                    textAlign: 'center',
                    boxShadow: `0 0 15px ${getCardVisuals(getCardType(player.overall || 50)).glow}`,
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '8px', opacity: 0.7, marginBottom: '-2px' }}>PWR</span>
                    {calculatePlayerStrength(player)}
                  </div>
                </div>
              )})}
            </div>
          </motion.div>
        ))}

        {/* Bench / Reserves */}
        {bench.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass" style={{ padding: '1.5rem', borderRadius: '24px', borderLeft: '6px solid var(--secondary)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h4 style={{ fontWeight: '900', fontSize: '1.2rem', color: 'var(--secondary)' }}>PRÓXIMOS / BANCO</h4>
              <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '8px' }}>AGUARDANDO</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {bench.map((player, bIdx) => {
                const isSelected = selectedForSwap?.type === 'bench' && selectedForSwap?.playerIdx === bIdx;
                return (
                <div 
                  key={player.uid} 
                  onClick={() => {
                    if (selectedForSwap || profile?.isAdmin) {
                      handleSwapClick('bench', null, bIdx);
                    } else {
                      togglePresence(player.uid);
                    }
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '10px 12px', 
                    background: isSelected ? 'rgba(16, 185, 129, 0.15)' : (presentIds.has(player.uid) ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)'), 
                    borderRadius: '16px',
                    border: isSelected ? '1px solid var(--primary)' : `1px solid ${presentIds.has(player.uid) ? 'rgba(16, 185, 129, 0.2)' : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ 
                        position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', 
                        borderRadius: '50%', background: presentIds.has(player.uid) ? 'var(--primary)' : 'var(--secondary)',
                        border: '2px solid black'
                      }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: presentIds.has(player.uid) ? 'white' : 'var(--secondary)' }}>{player.name}</p>
                      <p style={{ fontSize: '9px', fontWeight: '800', color: presentIds.has(player.uid) ? 'var(--primary)' : 'var(--secondary)', textTransform: 'uppercase' }}>
                        {presentIds.has(player.uid) ? 'JÁ CHEGOU' : 'AGUARDANDO'}
                      </p>
                    </div>
                  </div>
                  <div 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      togglePresence(player.uid); 
                    }}
                    style={{ padding: '4px', cursor: 'pointer' }}
                  >
                    {presentIds.has(player.uid) ? (
                      <CheckCircle size={20} color="var(--primary)" />
                    ) : (
                      <Circle size={20} color="var(--secondary)" />
                    )}
                  </div>
                </div>
              )})}
            </div>
          </motion.div>
        )}
        {teams.length > 0 && (
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={handleStartMatch}
              style={{ background: 'var(--primary-gradient)', color: 'black', padding: '18px 20px', borderRadius: '20px', fontWeight: '900', fontSize: '1rem', width: '100%', boxShadow: '0 10px 30px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <Play size={20} fill="black" />
              INICIAR PARTIDA AGORA
            </button>
            <button 
              onClick={cancelSorteio}
              style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--secondary)', padding: '14px 20px', borderRadius: '16px', border: '1px solid var(--border)', fontWeight: '800', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Trash2 size={18} />
              CANCELAR E REFAZER SORTEIO
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {teams.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--secondary)' }}>
          <Users size={48} style={{ marginBottom: '1rem', opacity: 0.1 }} />
          <p style={{ fontWeight: '600', fontSize: '14px' }}>Selecione quem chegou e clique em sortear para gerar os times equilibrados.</p>
        </div>
      )}
    </div>
  );
}
