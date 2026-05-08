"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Clock, Timer, Users, RefreshCw, 
  ArrowLeft, Plus, Minus, Info, AlertCircle,
  Play, Pause, RotateCcw, UserPlus, UserMinus,
  CheckCircle, ChevronRight, Activity, Trash2,
  Medal, Target
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { calculateNewOverall, calculateAttributeChange, detectPlayStyle, detectPlayStyles } from '@/lib/evolution';
import { getDoc } from 'firebase/firestore';

export default function LiveMatchPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile, setProfile } = useAuth();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [showEventModal, setShowEventModal] = useState<{ type: 'goal' | 'assist' | 'card', teamIndex: number } | null>(null);
  const [showSubModal, setShowSubModal] = useState<{ teamIndex: number, playerOut: any } | null>(null);
  const [raffleResult, setRaffleResult] = useState<{ winnerIndex: number, loserIndex: number } | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Score and Timer Logic
  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'matches', id as string), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMatch({ id: snap.id, ...data });
        
        // Sync local timer with Firestore if it's running
        if (data.liveMatch?.timer?.running && data.liveMatch.timer.startedAt) {
          const now = Date.now();
          const startedAt = data.liveMatch.timer.startedAt.toMillis();
          const elapsed = Math.floor((now - startedAt) / 1000) + (data.liveMatch.timer.elapsed || 0);
          setCurrentTime(elapsed);
        } else if (data.liveMatch?.timer) {
          setCurrentTime(data.liveMatch.timer.elapsed || 0);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // Sychronized Timer Loop
  useEffect(() => {
    if (!match?.liveMatch?.timer?.running) return;
    
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 1;
        const timeLimit = match.liveMatch?.timer?.totalTime || 600; // default 10min

        // Rule: Time limit ends the game
        if (next === timeLimit) {
          handleTimerAction('pause');
          const score = match.liveMatch?.score || { teamA: 0, teamB: 0 };
          if (score.teamA === score.teamB && match.liveMatch?.autoTiebreaker) {
            handleTiebreakerRaffle();
          } else if (score.teamA !== score.teamB) {
            alert(`FIM DE JOGO POR TEMPO! O ${score.teamA > score.teamB ? teamAName : teamBName} venceu.`);
          }
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [match?.liveMatch?.timer?.running]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isBenchPlayer = match?.bench?.some((p: any) => p.uid === user?.uid);
  const canControl = !!user && !!profile && (profile.role === 'admin' || match?.createdBy === user.uid || isBenchPlayer);
  const isAdmin = canControl; // Keep the name for compatibility with existing code

  // Handlers
  const handleScore = async (teamIndex: number, delta: number) => {
    if (!isAdmin) return;
    const newScore = { ...(match.liveMatch?.score || { teamA: 0, teamB: 0 }) };
    const field = teamIndex === 0 ? 'teamA' : 'teamB';
    newScore[field] = Math.max(0, (newScore[field] || 0) + delta);
    await updateDoc(doc(db, 'matches', match.id), { 'liveMatch.score': newScore });

    const goalLimit = match.liveMatch?.goalLimit || 2;

    // Rule: goalLimit ends the game
    if (delta > 0 && newScore[field] >= goalLimit) {
      alert(`FIM DE JOGO! O ${teamIndex === 0 ? teamAName : teamBName} atingiu ${goalLimit} gols e venceu!`);
      handleTimerAction('pause');
    }
  };

  const handleTimerAction = async (action: 'start' | 'pause' | 'reset') => {
    if (!isAdmin) return;
    const matchRef = doc(db, 'matches', match.id);
    const timer = { ...(match.liveMatch?.timer || { running: false, elapsed: 0, startedAt: null }) };

    if (action === 'start') {
      timer.running = true;
      timer.startedAt = Timestamp.now();
    } else if (action === 'pause') {
      timer.running = false;
      const now = Date.now();
      const startedAt = timer.startedAt?.toMillis() || now;
      timer.elapsed = Math.floor((now - startedAt) / 1000) + (timer.elapsed || 0);
      timer.startedAt = null;
    } else if (action === 'reset') {
      timer.running = false;
      timer.elapsed = 0;
      timer.startedAt = null;
      setCurrentTime(0);
    }

    await updateDoc(matchRef, { 'liveMatch.timer': timer });
  };

  const handleAddEvent = async (playerId: string, playerName: string, forcedType?: 'goal' | 'assist', forcedTeamIndex?: number) => {
    const type = forcedType || showEventModal?.type;
    const teamIndex = forcedTeamIndex !== undefined ? forcedTeamIndex : showEventModal?.teamIndex;
    
    if ((!type || teamIndex === undefined) && !isAdmin) return;
    
    const matchRef = doc(db, 'matches', match.id);
    const newEvent = {
      type,
      playerId,
      playerName,
      teamIndex,
      minute: Math.floor(currentTime / 60),
      timestamp: Timestamp.now()
    };

    await updateDoc(matchRef, {
      'liveMatch.events': arrayUnion(newEvent)
    });

    if (type === 'goal') {
      handleScore(teamIndex!, 1);
      // If it was a quick action, we might want to ask for assist still
      setShowEventModal({ type: 'assist', teamIndex: teamIndex! });
    } else {
      setShowEventModal(null);
    }
  };

  const handleRemoveEvent = async (event: any) => {
    if (!isAdmin) return;
    if (!confirm("Remover este lance?")) return;
    const matchRef = doc(db, 'matches', match.id);
    await updateDoc(matchRef, {
      'liveMatch.events': arrayRemove(event)
    });
    if (event.type === 'goal') {
      handleScore(event.teamIndex, -1);
    }
  };

  const handleSubstitution = async (playerIn: any) => {
    if (!showSubModal || !isAdmin) return;
    const { teamIndex, playerOut } = showSubModal;
    const matchRef = doc(db, 'matches', match.id);
    
    // Update teams
    const updatedTeams = [...match.teams];
    const team = { ...updatedTeams[teamIndex] };
    
    // Stats: Calculate minutes for playerOut
    const finalizeStats = (p: any) => {
      if (!p) return null;
      const entryTime = p.lastEntryTime || 0;
      const played = Math.max(0, currentTime - entryTime);
      return {
        ...p,
        minutesPlayed: (p.minutesPlayed || 0) + played,
        lastEntryTime: null
      };
    };

    if (playerOut) {
      team.players = team.players.map((p: any) => 
        p.uid === playerOut.uid 
          ? { ...playerIn, lastEntryTime: currentTime, justEntered: true } 
          : p
      );
    } else {
      team.players = [...team.players, { ...playerIn, lastEntryTime: currentTime, justEntered: true }];
    }
    
    updatedTeams[teamIndex] = team;
    
    // Update bench
    const newBench = match.bench.filter((p: any) => p.uid !== playerIn.uid);
    if (playerOut) {
      newBench.push(finalizeStats(playerOut));
    }

    // Update rotation queue
    const entryOrder = (match.liveMatch?.entryOrder || []).filter((uid: string) => uid !== playerIn.uid).concat(playerIn.uid);

    await updateDoc(matchRef, { 
      teams: updatedTeams, 
      bench: newBench,
      'liveMatch.entryOrder': entryOrder
    });
    
    setShowSubModal(null);
  };

  const [showTeamSwapModal, setShowTeamSwapModal] = useState<{ side: 'A' | 'B' } | null>(null);

  const handleSwapTeam = async (side: 'A' | 'B', newTeamIndex: number) => {
    if (!isAdmin) return;
    const matchRef = doc(db, 'matches', match.id);
    const activeIndices = match.liveMatch?.activeIndices || [0, 1];
    const newIndices = [...activeIndices];
    if (side === 'A') newIndices[0] = newTeamIndex;
    else newIndices[1] = newTeamIndex;

    await updateDoc(matchRef, { 
      'liveMatch.activeIndices': newIndices,
      'liveMatch.score': { teamA: 0, teamB: 0 } 
    });
    setShowTeamSwapModal(null);
  };

  const handleAutoSwap = async () => {
    let count = match.liveMatch?.autoSwapCount || 1;
    if (!isAdmin || !match.bench?.length) return;
    const matchRef = doc(db, 'matches', match.id);
    const score = match.liveMatch?.score || { teamA: 0, teamB: 0 };
    
    // Rule: Only swap the losing team
    let losingTeamIndex = -1;
    if (score.teamA < score.teamB) losingTeamIndex = activeIndices[0];
    else if (score.teamB < score.teamA) losingTeamIndex = activeIndices[1];
    else if (match.tiebreakerWinner === 'A') losingTeamIndex = activeIndices[1]; // A won, B leaves
    else if (match.tiebreakerWinner === 'B') losingTeamIndex = activeIndices[0]; // B won, A leaves

    if (losingTeamIndex === -1) {
      alert("Partida empatada. Realize o sorteio de desempate para saber quem sai.");
      return;
    }

    const targetTeamIndex = losingTeamIndex;
    let currentTeams = [...match.teams];
    let currentBench = [...match.bench];
    let currentEntryOrder = [...(match.liveMatch?.entryOrder || [])];

    if (count === -1) count = currentTeams[targetTeamIndex].players.length;

    let swapsDone = 0;
    for (let i = 0; i < count; i++) {
      if (currentBench.length === 0) break;
      const teamPlayers = currentTeams[targetTeamIndex].players;
      
      // Rule: Goalkeeper protection (only leave if there's a bench GK or manually)
      const playingUids = teamPlayers.filter((p: any) => {
        const isGK = p.isGoalkeeper || p.position === 'GOL' || p.autoPosition === 'GOL';
        if (isGK) {
          const hasBenchGK = currentBench.some((bp: any) => bp.isGoalkeeper || bp.position === 'GOL' || bp.autoPosition === 'GOL');
          if (!hasBenchGK) return false; // Stay in game
        }
        return true;
      }).map((p: any) => p.uid);
      
      const candidates = currentEntryOrder.filter((uid: string) => playingUids.includes(uid));
      if (!candidates.length) break;

      const playerOutUid = candidates[0];
      const playerIn = currentBench[0];
      const team = { ...currentTeams[targetTeamIndex] };
      const playerOut = team.players.find((p: any) => p.uid === playerOutUid);
      
      const played = Math.max(0, currentTime - (playerOut.lastEntryTime || 0));
      const playerOutFinal = { ...playerOut, minutesPlayed: (playerOut.minutesPlayed || 0) + played, lastEntryTime: null, justEntered: false };

      team.players = team.players.map((p: any) => p.uid === playerOutUid ? { ...playerIn, lastEntryTime: currentTime, justEntered: true } : p);
      currentTeams[targetTeamIndex] = team;
      currentBench = currentBench.slice(1).concat(playerOutFinal);
      currentEntryOrder = currentEntryOrder.filter((uid: string) => uid !== playerIn.uid).concat(playerIn.uid);
      swapsDone++;
    }

    await updateDoc(matchRef, { teams: currentTeams, bench: currentBench, 'liveMatch.entryOrder': currentEntryOrder });
  };

  const handleSetAutoSwapCount = async (count: number) => {
    if (!isAdmin) return;
    await updateDoc(doc(db, 'matches', match.id), { 'liveMatch.autoSwapCount': count });
  };

  const handleSetTotalTime = async (minutes: number) => {
    if (!isAdmin) return;
    await updateDoc(doc(db, 'matches', match.id), { 'liveMatch.timer.totalTime': minutes * 60 });
  };

  const handleTiebreakerRaffle = async () => {
    if (!isAdmin) return;
    const winA = Math.random() > 0.5;
    const winner = winA ? 'A' : 'B';
    setRaffleResult({ winnerIndex: winA ? activeIndices[0] : activeIndices[1], loserIndex: winA ? activeIndices[1] : activeIndices[0] });
    await updateDoc(doc(db, 'matches', match.id), { tiebreakerWinner: winner, tiebreakerType: 'raffle' });
  };

  const handleEndMatch = async () => {
    if (!user) return;
    if (!confirm("Finalizar partida e registrar estatísticas finais?")) return;
    const matchRef = doc(db, 'matches', match.id);
    
    const score = match.liveMatch?.score || { teamA: 0, teamB: 0 };
    let winner = 'Draw';
    if (score.teamA > score.teamB) winner = 'A';
    else if (score.teamB > score.teamA) winner = 'B';
    else if (match.tiebreakerWinner) winner = match.tiebreakerWinner;

    const activeTeams = [...match.teams];
    activeIndices.forEach((idx: number) => {
      activeTeams[idx].players = activeTeams[idx].players.map((p: any) => {
        const played = Math.max(0, currentTime - (p.lastEntryTime || 0));
        return { ...p, minutesPlayed: (p.minutesPlayed || 0) + played, lastEntryTime: null };
      });
    });

    const events = match.liveMatch?.events || [];
    const allPlayers = [ ...activeTeams.flatMap(t => t.players), ...(match.bench || []) ];
    const finalParticipants = allPlayers.map(p => {
      const pGoals = events.filter((e: any) => e.type === 'goal' && e.playerId === p.uid).length;
      const pAssists = events.filter((e: any) => e.type === 'assist' && e.playerId === p.uid).length;
      return { ...p, goals: pGoals, assists: pAssists, rating: 6.0 + (pGoals * 1.5) + (pAssists * 1.0) };
    });

    const mvp = [...finalParticipants].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
    
    // Create game history entry
    const gameEntry = {
      scoreA: score.teamA,
      scoreB: score.teamB,
      winner,
      mvp: mvp?.uid || null,
      events: events,
      participants: finalParticipants,
      timestamp: Timestamp.now(),
      teamAName,
      teamBName
    };

    await updateDoc(matchRef, { 
      status: 'finished', scoreA: score.teamA, scoreB: score.teamB, winner,
      mvp: mvp?.uid || null, top3: finalParticipants.sort((a,b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3).map(p => p.uid),
      finalParticipants, 'liveMatch.isLive': false, 'liveMatch.isFinished': true, 'liveMatch.timer.running': false,
      gamesHistory: arrayUnion(gameEntry)
    });

    const { increment } = await import('firebase/firestore');
    await Promise.all(finalParticipants.map(async (p) => {
      if (p.isGuest) return; // Skip guests for persistent updates

      try {
        const userRef = doc(db, 'users', p.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentOvr = userData.overall || 50;
          const matchRating = p.rating || 6.0;
          
          // Evolution Logic
          const newOvr = calculateNewOverall(currentOvr, matchRating, matchRating); // Simplification: matchRating = recentAvg for now
          
          const currentAttrs = userData.attributes || { velocidade: 50, defesa: 50, passe: 50, ataque: 50, fisico: 50, finalizacao: 50 };
          const newAttrs = {
            velocidade: calculateAttributeChange(currentAttrs.velocidade || 50, matchRating),
            defesa: calculateAttributeChange(currentAttrs.defesa || 50, matchRating),
            passe: calculateAttributeChange(currentAttrs.passe || 50, matchRating),
            ataque: calculateAttributeChange(currentAttrs.ataque || 50, matchRating),
            fisico: calculateAttributeChange(currentAttrs.fisico || 50, matchRating),
            finalizacao: calculateAttributeChange(currentAttrs.finalizacao || 50, matchRating),
            overall: newOvr
          };

          const newPlayStyle = detectPlayStyle(newAttrs, newOvr);
          const newPlayStyles = detectPlayStyles(newAttrs, newOvr);

          await updateDoc(userRef, { 
            totalGames: increment(1),
            overall: newOvr,
            attributes: newAttrs,
            playStyle: newPlayStyle,
            playStyles: newPlayStyles,
            // History for trend tracking
            overallHistory: arrayUnion({
              date: new Date().toISOString(),
              value: newOvr,
              matchId: match.id
            })
          });
        }
      } catch (err) {
        console.error(`Error updating player ${p.uid}:`, err);
      }
    }));
  };

  const handleStartNextMatch = async () => {
    if (!isAdmin) return;
    const matchRef = doc(db, 'matches', match.id);
    
    // 1. Determine who leaves (loser leaves)
    const score = match.liveMatch?.score || { teamA: 0, teamB: 0 };
    let winnerSide = (score.teamA > score.teamB) ? 'A' : (score.teamB > score.teamA) ? 'B' : match.tiebreakerWinner;
    
    if (!winnerSide) {
      // In case of tie without raffle, admin must decide or we use a random one
      winnerSide = Math.random() > 0.5 ? 'A' : 'B';
    }

    const loserSide = winnerSide === 'A' ? 'B' : 'A';
    const loserIndexInActive = loserSide === 'A' ? 0 : 1;

    // 2. Determine who enters (rotation)
    const allTeamIndices = match.teams.map((_: any, i: number) => i);
    const nextTeamIndex = allTeamIndices.find((idx: number) => !activeIndices.includes(idx));

    let newActiveIndices = [...activeIndices];

    if (nextTeamIndex !== undefined) {
      // Team C (or next) enters for Loser
      newActiveIndices[loserIndexInActive] = nextTeamIndex;
    } else {
      // Only 2 teams: The loser is the one who will be swapped via Auto-Swap in the UI
      // No index change needed, but rotation logic (Auto-Swap) can be triggered manually or automatically
    }

    // 3. Reset Live Match State
    const nextLiveMatch = {
      ...match.liveMatch,
      isLive: true,
      isFinished: false,
      score: { teamA: 0, teamB: 0 },
      timer: { running: false, elapsed: 0, startedAt: null },
      events: [],
      activeIndices: newActiveIndices,
      pendingEvents: []
    };

    await updateDoc(matchRef, { 
      liveMatch: nextLiveMatch,
      status: 'scheduled',
      winner: null,
      scoreA: 0,
      scoreB: 0,
      tiebreakerWinner: null,
      tiebreakerType: null
    });
    
    setCurrentTime(0);
  };

  const handleFinishAndNext = async () => {
    if (!isAdmin) return;
    if (confirm("Deseja encerrar este jogo e já iniciar o próximo?")) {
      await handleEndMatch();
      setTimeout(async () => {
        await handleStartNextMatch();
      }, 500); // Small delay to ensure Firestore sync
    }
  };

  useEffect(() => {
    if (showEventModal || showSubModal || showTeamSwapModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showEventModal, showSubModal, showTeamSwapModal]);

  const handleSuggestEvent = async (type: 'goal' | 'assist', playerId: string, playerName: string, teamIndex: number) => {
    const matchRef = doc(db, 'matches', match.id);
    const suggestion = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      playerId,
      playerName,
      teamIndex,
      requestedBy: user?.uid,
      requestedByName: profile?.name || 'Jogador',
      timestamp: Timestamp.now()
    };
    await updateDoc(matchRef, {
      'liveMatch.pendingEvents': arrayUnion(suggestion)
    });
    alert("Sugestão enviada ao administrador!");
    if (type === 'goal') {
      // Ask for assist after goal suggestion
      setShowEventModal({ type: 'assist', teamIndex });
    } else {
      setShowEventModal(null);
    }
  };

  const handleApproveEvent = async (suggestion: any, approve: boolean) => {
    if (!isAdmin) return;
    const matchRef = doc(db, 'matches', match.id);
    
    if (approve) {
      const newEvent = {
        type: suggestion.type,
        playerId: suggestion.playerId,
        playerName: suggestion.playerName,
        teamIndex: suggestion.teamIndex,
        minute: suggestion.minute || Math.floor(currentTime / 60),
        timestamp: Timestamp.now()
      };
      await updateDoc(matchRef, {
        'liveMatch.events': arrayUnion(newEvent),
        'liveMatch.pendingEvents': arrayRemove(suggestion)
      });
      if (suggestion.type === 'goal') {
        handleScore(suggestion.teamIndex, 1);
      }
    } else {
      await updateDoc(matchRef, {
        'liveMatch.pendingEvents': arrayRemove(suggestion)
      });
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)' }}>
      <RefreshCw className="animate-spin" style={{ color: 'var(--primary)' }} size={40} />
    </div>
  );

  if (!match) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)', color: 'white' }}>
      Partida não encontrada
    </div>
  );

  // Privacy Check
  const isParticipant = match.participants?.some((p: any) => p.uid === user?.uid);
  const isInvited = (match.invitedUids || []).includes(user?.uid) || (match.invitedEmails || []).includes(user?.email);
  const isAuthorized = !match.visibility || match.visibility === 'publica' || isAdmin || isParticipant || isInvited;

  if (!isAuthorized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)', color: 'white', padding: '2rem', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <AlertCircle size={40} color="var(--error)" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1rem' }}>Partida Privada</h2>
        <p style={{ color: 'var(--secondary)', fontSize: '14px', marginBottom: '2rem', maxWidth: '300px' }}>
          Esta partida está configurada como privada. Apenas jogadores confirmados ou convidados podem acessar este placar.
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

  const activeIndices = match.liveMatch?.activeIndices || [0, 1];
  const teamAIndex = activeIndices[0];
  const teamBIndex = activeIndices[1];
  const teamA = match.teams?.[teamAIndex]?.players || [];
  const teamB = match.teams?.[teamBIndex]?.players || [];
  const events = match.liveMatch?.events || [];
  const teamAName = match.teams?.[teamAIndex]?.name || `TIME ${String.fromCharCode(65 + teamAIndex)}`;
  const teamBName = match.teams?.[teamBIndex]?.name || `TIME ${String.fromCharCode(65 + teamBIndex)}`;

  if (match.liveMatch?.isFinished || match.status === 'finished') {
    return <FinishedMatchView match={match} router={router} isAdmin={isAdmin} onStartNext={handleStartNextMatch} />;
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '100px', minHeight: '100vh', background: 'var(--background)', color: 'white', fontFamily: 'var(--font-sans)', overflowX: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => router.back()} style={{ padding: '12px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: match.liveMatch?.isLive ? 'var(--error)' : 'var(--secondary)' }} />
          <span style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.2em', color: match.liveMatch?.isLive ? 'var(--error)' : 'var(--secondary)', textTransform: 'uppercase' }}>
            {match.liveMatch?.isLive ? 'AO VIVO' : 'PARTIDA ENCERRADA'}
          </span>
        </div>
        {match.liveMatch?.isLive ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            {isAdmin && (
              <button onClick={() => setShowSettingsModal(true)} style={{ padding: '12px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Activity size={20} color="var(--primary)" />
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={handleFinishAndNext} 
                style={{ padding: '8px 16px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--primary)', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} /> PRÓXIMO JOGO
              </button>
            )}
            <button onClick={handleEndMatch} style={{ padding: '8px 16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>
              FINALIZAR TUDO
            </button>
          </div>
        ) : <div style={{ width: '44px' }} />}
      </header>

      <div style={{ padding: '0 1.5rem', maxWidth: '500px', margin: '0 auto' }}>
        {/* Scoreboard */}
        <div style={{ borderRadius: '32px', padding: '2rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', background: 'var(--surface)' }}>
          <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(29, 185, 84, 0.1) 0%, transparent 70%)', zIndex: 0 }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '9px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{teamAName}</h3>
                {isAdmin && (
                  <button onClick={() => setShowTeamSwapModal({ side: 'A' })} style={{ fontSize: '7px', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: 'rgba(29, 185, 84, 0.1)', border: 'none' }}>Trocar Time</button>
                )}
              </div>
              <div style={{ fontSize: '3.5rem', fontWeight: '900', fontFamily: 'monospace' }}>{match.liveMatch?.score?.teamA || 0}</div>
              {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '15px' }}>
                  <button onClick={() => handleScore(0, -1)} style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--background)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
                  <button onClick={() => setShowEventModal({ type: 'goal', teamIndex: teamAIndex })} style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--primary)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
                </div>
              )}
            </div>
            
            <div style={{ textAlign: 'center', padding: '0 1rem' }}>
              <div style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(29, 185, 84, 0.4)', marginBottom: '12px' }}>VS</div>
              <div style={{ position: 'relative' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px 15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(4px)' }}>
                  <span style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: '900', 
                    fontFamily: 'monospace', 
                    color: (match.liveMatch?.timer?.totalTime > 0 && currentTime >= match.liveMatch.timer.totalTime) ? 'var(--error)' : 'var(--primary)' 
                  }}>
                    {match.liveMatch?.timer?.totalTime > 0 
                      ? formatTime(Math.max(0, match.liveMatch.timer.totalTime - currentTime)) 
                      : formatTime(currentTime)}
                  </span>
                </div>
                {match.liveMatch?.timer?.totalTime > 0 && (
                  <div style={{ position: 'absolute', bottom: '-20px', left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--primary)', width: `${Math.min(100, (currentTime / match.liveMatch.timer.totalTime) * 100)}%`, transition: 'width 1s linear' }} />
                  </div>
                )}
              </div>
              
              {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '30px' }}>
                  {!match.liveMatch?.timer?.running ? (
                    <button onClick={() => handleTimerAction('start')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Play size={16} fill="currentColor" /></button>
                  ) : (
                    <button onClick={() => handleTimerAction('pause')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--warning)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pause size={16} fill="currentColor" /></button>
                  )}
                  <button onClick={() => {
                    const mins = prompt("Duração da partida (minutos):", "10");
                    if (mins) handleSetTotalTime(parseInt(mins));
                  }} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Timer size={16} /></button>
                  <button onClick={() => handleTimerAction('reset')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--background)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RotateCcw size={16} /></button>
                </div>
              )}
            </div>

            {/* Raffle Result Card */}
            {raffleResult && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                style={{ position: 'absolute', inset: '1rem', zIndex: 10, background: 'var(--surface)', border: '2px solid var(--warning)', borderRadius: '24px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <RotateCcw size={24} color="var(--warning)" className="animate-spin-slow" />
                </div>
                <h5 style={{ fontSize: '10px', fontWeight: '900', color: 'var(--warning)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.2em' }}>SORTEIO DE EMPATE</h5>
                <p style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white', marginBottom: '4px' }}>
                  O <span style={{ color: 'var(--primary)' }}>{match.teams[raffleResult.winnerIndex]?.name || `TIME ${String.fromCharCode(65 + raffleResult.winnerIndex)}`}</span> VENCEU!
                </p>
                <p style={{ fontSize: '10px', color: 'var(--secondary)', marginBottom: '1.5rem' }}>
                  O {match.teams[raffleResult.loserIndex]?.name || `TIME ${String.fromCharCode(65 + raffleResult.loserIndex)}`} deve sair para o banco.
                </p>
                {isAdmin && (
                  <button 
                    onClick={() => setRaffleResult(null)}
                    style={{ padding: '12px 24px', borderRadius: '14px', background: 'var(--warning)', color: 'black', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                  >
                    CONFIRMAR SAÍDA
                  </button>
                )}
              </motion.div>
            )}

            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '9px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{teamBName}</h3>
                {isAdmin && (
                  <button onClick={() => setShowTeamSwapModal({ side: 'B' })} style={{ fontSize: '7px', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: 'rgba(29, 185, 84, 0.1)', border: 'none' }}>Trocar Time</button>
                )}
              </div>
              <div style={{ fontSize: '3.5rem', fontWeight: '900', fontFamily: 'monospace' }}>{match.liveMatch?.score?.teamB || 0}</div>
              {isAdmin && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '15px' }}>
                  <button onClick={() => handleScore(1, -1)} style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--background)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
                  <button onClick={() => setShowEventModal({ type: 'goal', teamIndex: teamBIndex })} style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--primary)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
                </div>
              )}
            </div>
          </div>
        </div>



        {/* In-Game Players */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} color="var(--primary)" /> EM CAMPO</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid var(--border)' }}>
              <RefreshCw size={10} color="var(--primary)" />
              <span style={{ fontSize: '8px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rotação Justa</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(29, 185, 84, 0.1)', padding: '4px 12px', borderRadius: '8px' }}>{teamAName}</span>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(29, 185, 84, 0.1)', padding: '4px 12px', borderRadius: '8px' }}>{teamBName}</span>
            </div>
            <TeamColumn players={teamA} isAdmin={isAdmin} onSub={(p: any) => setShowSubModal({ teamIndex: teamAIndex, playerOut: p })} onEvent={(type: any, p: any) => handleAddEvent(p.uid, p.name, type, teamAIndex)} />
            <TeamColumn players={teamB} isAdmin={isAdmin} onSub={(p: any) => setShowSubModal({ teamIndex: teamBIndex, playerOut: p })} onEvent={(type: any, p: any) => handleAddEvent(p.uid, p.name, type, teamBIndex)} />
          </div>
        </section>

        {/* Rotation Queue / Bench */}
        {match.liveMatch?.rotationEnabled && (
          <section style={{ borderRadius: '24px', padding: '1.5rem', borderLeft: '4px solid var(--warning)', marginBottom: '2.5rem', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '9px', fontWeight: '900', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.2em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={12} /> PRÓXIMOS A SAIR
              </h4>
              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '7px', fontWeight: '900', color: 'var(--secondary)' }}>TROCAR</span>
                    <select 
                      value={match.liveMatch?.autoSwapCount || 1} 
                      onChange={(e) => handleSetAutoSwapCount(parseInt(e.target.value))}
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '10px', fontWeight: '900', outline: 'none', padding: '0 4px' }}
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                      <option value="-1">EQUIPE</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleAutoSwap}
                    style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '8px', fontWeight: '900', textTransform: 'uppercase' }}
                  >
                    Trocar Agora
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }} className="no-scrollbar">
              { [...teamA, ...teamB]
                .filter((p: any) => !p.isGoalkeeper || !match.liveMatch?.goalkeeperExempt)
                .sort((a: any, b: any) => (match.liveMatch?.entryOrder?.indexOf(a.uid) ?? 0) - (match.liveMatch?.entryOrder?.indexOf(b.uid) ?? 0))
                .slice(0, 3)
                .map((p, i) => (
                  <div key={p.uid} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', color: 'var(--warning)' }}>{i + 1}º</div>
                    <span style={{ fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>{p.name.split(' ')[0]}</span>
                  </div>
                ))
              }
            </div>
          </section>
        )}

        {/* Bench */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}><UserPlus size={18} color="var(--secondary)" /> BANCO DE RESERVAS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {match.bench?.map((player: any) => (
              <div key={player.uid} style={{ background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: '900', fontSize: '14px' }}>{player.name}</p>
                    <p style={{ fontSize: '9px', color: 'var(--secondary)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{player.position}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--primary)' }}>{player.overall}</div>
                  <div style={{ fontSize: '8px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>OVR</div>
                </div>
              </div>
            ))}
            {match.bench?.length === 0 && (
              <div style={{ padding: '2.5rem 0', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nenhum reserva disponível</p>
              </div>
            )}
          </div>
        </section>

        {/* Match Feed */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={18} color="var(--primary)" /> FEED DA PARTIDA</h3>
            {!match.liveMatch?.isLive && (
              <button 
                onClick={() => setShowEventModal({ type: 'goal', teamIndex: -1 })}
                style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(29, 185, 84, 0.1)', color: 'var(--primary)', border: '1px solid rgba(29, 185, 84, 0.2)', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                + SUGERIR LANCE
              </button>
            )}
          </div>

          {/* Pending Approvals (Admin Only) */}
          {isAdmin && match.liveMatch?.pendingEvents?.length > 0 && (
            <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '10px', fontWeight: '900', color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>LANCES PENDENTES</h4>
              {match.liveMatch.pendingEvents.map((s: any) => (
                <div key={s.id} style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '24px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{s.type === 'goal' ? '⚽' : '🎯'}</span>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: '900' }}>{s.playerName} ({s.teamIndex === 0 ? 'A' : 'B'})</p>
                      <p style={{ fontSize: '8px', color: 'var(--secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Solicitado por: {s.requestedByName}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleApproveEvent(s, false)} style={{ padding: '8px', borderRadius: '8px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--error)' }}><UserMinus size={14} /></button>
                    <button onClick={() => handleApproveEvent(s, true)} style={{ padding: '8px', borderRadius: '8px', background: 'var(--success)', color: 'black' }}><CheckCircle size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <AnimatePresence mode="popLayout">
              {events.slice().reverse().map((event: any, i: number) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={event.timestamp?.toMillis() || `${event.playerId}-${i}`} 
                  style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', position: 'relative' }}
                >
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--primary)', paddingTop: '8px', width: '32px', fontFamily: 'monospace' }}>{event.minute}'</div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      {event.type === 'goal' ? '⚽' : event.type === 'assist' ? '🎯' : '🟨'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '12px', fontWeight: '900', letterSpacing: '-0.02em' }}>
                        {event.type === 'goal' ? 'GOL!' : event.type === 'assist' ? 'ASSISTÊNCIA' : 'CARTÃO'}
                      </p>
                      <p style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '700' }}>{event.playerName} <span style={{ opacity: 0.4, marginLeft: '4px' }}>• {event.teamIndex === 0 ? 'TIME A' : 'TIME B'}</span></p>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleRemoveEvent(event)} style={{ padding: '8px', color: 'var(--secondary)', transition: 'color 0.2s' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {events.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <p style={{ fontSize: '12px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Aguardando início dos lances</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showEventModal && (
          <div className="modal-backdrop" onClick={() => setShowEventModal(null)}>
            <motion.div 
              onClick={(e) => e.stopPropagation()}
              initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '32px', padding: '24px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            >
               <h4 style={{ fontSize: '24px', fontWeight: '900', textAlign: 'center', marginBottom: '8px' }}>
                 Registrar {showEventModal.type === 'goal' ? 'Gol' : 'Assistência'}
               </h4>
               <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--secondary)', marginBottom: '2rem' }}>
                 {showEventModal.type === 'assist' ? 'Quem deu o passe para o gol?' : 'Selecione o autor do gol'}
               </p>
               <div style={{ 
                 display: 'grid', 
                 gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                 gap: '10px', 
                 overflowY: 'auto', 
                 padding: '4px' 
               }} className="no-scrollbar flex-1 pb-4">
                 {/* Team Selection for Suggestions */}
                 {showEventModal.teamIndex === -1 ? (
                   <>
                     <div style={{ gridColumn: '1 / -1', fontSize: '10px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '4px' }}>TIME A</div>
                     {teamA.map((p: any) => (
                       <button key={p.uid} onClick={() => handleSuggestEvent(showEventModal.type as any, p.uid, p.name, 0)} style={{ padding: '10px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                         <div style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface)' }}>
                           <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         </div>
                         <span style={{ fontWeight: '800', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{p.name.split(' ')[0]}</span>
                       </button>
                     ))}
                     <div style={{ gridColumn: '1 / -1', fontSize: '10px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '1rem', marginBottom: '4px' }}>TIME B</div>
                     {teamB.map((p: any) => (
                       <button key={p.uid} onClick={() => handleSuggestEvent(showEventModal.type as any, p.uid, p.name, 1)} style={{ padding: '10px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                         <div style={{ width: '32px', height: '32px', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface)' }}>
                           <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         </div>
                         <span style={{ fontWeight: '800', fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{p.name.split(' ')[0]}</span>
                       </button>
                     ))}
                   </>
                 ) : (
                   <>
                     {showEventModal.type === 'assist' && (
                       <button 
                         onClick={() => setShowEventModal(null)}
                         style={{ 
                           gridColumn: '1 / -1', padding: '10px', borderRadius: '16px', 
                           background: 'rgba(239, 68, 68, 0.1)', border: '1px dashed rgba(239, 68, 68, 0.3)', 
                           color: 'var(--error)', fontSize: '11px', fontWeight: '900', marginBottom: '8px' 
                         }}
                       >
                         SEM ASSISTÊNCIA
                       </button>
                     )}
                     {(showEventModal.teamIndex === teamAIndex ? teamA : teamB).map((p: any) => (
                       <button 
                         key={p.uid} 
                         onClick={() => {
                           if (match.liveMatch?.isLive) {
                             handleAddEvent(p.uid, p.name);
                           } else {
                             handleSuggestEvent(showEventModal.type as any, p.uid, p.name, showEventModal.teamIndex);
                           }
                         }}
                         style={{ 
                           padding: '12px 8px', borderRadius: '20px', 
                           background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', 
                           display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' 
                         }}
                       >
                         <div style={{ width: '44px', height: '44px', borderRadius: '14px', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                           <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         </div>
                         <div style={{ textAlign: 'center', width: '100%' }}>
                           <span style={{ fontWeight: '900', fontSize: '12px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name.split(' ')[0]}</span>
                           <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--secondary)' }}>{p.position}</span>
                         </div>
                       </button>
                     ))}
                   </>
                 )}
               </div>
               <button 
                onClick={() => setShowEventModal(null)} 
                style={{ 
                  width: '100%', padding: '1.2rem', borderRadius: '24px', background: 'var(--surface)', 
                  border: '1px solid var(--border)', fontWeight: '900', fontSize: '14px', letterSpacing: '0.1em',
                  marginTop: '1.5rem', color: 'white'
                }}
               >
                FECHAR
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubModal && (
          <div className="modal-backdrop" onClick={() => setShowSubModal(null)}>
            <motion.div 
              onClick={(e) => e.stopPropagation()}
              initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '32px', padding: '24px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            >
               <h4 style={{ fontSize: '24px', fontWeight: '900', textAlign: 'center', marginBottom: '8px' }}>Substituição</h4>
               <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--secondary)', marginBottom: '2rem' }}>
                 {showSubModal.playerOut ? (
                   <>Quem entra no lugar de <span style={{ color: 'white', fontWeight: '900' }}>{showSubModal.playerOut.name}</span>?</>
                 ) : (
                   'Escolha um jogador para entrar no time'
                 )}
               </p>
               
               <div style={{ 
                 display: 'grid', 
                 gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', 
                 gap: '12px', 
                 overflowY: 'auto', 
                 padding: '4px' 
               }} className="no-scrollbar flex-1 pb-4">
                 {match.bench?.map((p: any) => (
                   <button 
                    key={p.uid} 
                    onClick={() => handleSubstitution(p)}
                    style={{ 
                      padding: '12px 8px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
                    }}
                   >
                     <div style={{ width: '48px', height: '48px', borderRadius: '14px', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                       <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     </div>
                     <div style={{ textAlign: 'center', width: '100%' }}>
                       <p style={{ fontWeight: '900', fontSize: '13px', color: 'white', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name.split(' ')[0]}</p>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                         <span style={{ fontSize: '8px', fontWeight: '900', color: 'var(--primary)', textTransform: 'uppercase' }}>{p.position}</span>
                         <span style={{ fontSize: '8px', fontWeight: '900', color: 'var(--secondary)' }}>OVR {p.overall}</span>
                       </div>
                     </div>
                   </button>
                 ))}
               </div>
               <button onClick={() => setShowSubModal(null)} style={{ width: '100%', padding: '1.2rem', borderRadius: '24px', background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: '900', marginTop: '1.5rem' }}>CANCELAR</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTeamSwapModal && (
          <div className="modal-backdrop" onClick={() => setShowTeamSwapModal(null)}>
            <motion.div 
              onClick={(e) => e.stopPropagation()}
              initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
              style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '32px', padding: '24px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            >
               <h4 style={{ fontSize: '24px', fontWeight: '900', textAlign: 'center', marginBottom: '8px' }}>Escolher Equipe</h4>
               <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--secondary)', marginBottom: '2rem' }}>Entrar no lugar do {showTeamSwapModal.side === 'A' ? teamAName : teamBName}</p>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }} className="no-scrollbar flex-1 pb-4">
                 {match.teams.map((t: any, idx: number) => {
                   const isPlaying = activeIndices.includes(idx);
                   return (
                     <button 
                      key={idx} 
                      disabled={isPlaying}
                      onClick={() => handleSwapTeam(showTeamSwapModal.side, idx)}
                      style={{ 
                        width: '100%', padding: '1.5rem', borderRadius: '24px', background: isPlaying ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        opacity: isPlaying ? 0.3 : 1
                      }}
                     >
                       <span style={{ fontWeight: '900', fontSize: '18px' }}>{t.name || `TIME ${String.fromCharCode(65 + idx)}`}</span>
                       {isPlaying ? <span style={{ fontSize: '10px', fontWeight: '900', color: 'var(--secondary)' }}>EM CAMPO</span> : <ChevronRight size={20} color="var(--primary)" />}
                     </button>
                   );
                 })}
               </div>
               <button onClick={() => setShowTeamSwapModal(null)} style={{ width: '100%', padding: '1.2rem', borderRadius: '24px', background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: '900', marginTop: '1.5rem' }}>CANCELAR</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {showSettingsModal && (
          <div className="modal-backdrop">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '40px', padding: '32px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            >
               <h4 style={{ fontSize: '24px', fontWeight: '900', textAlign: 'center', marginBottom: '8px' }}>Regras da Partida</h4>
               <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--secondary)', marginBottom: '2rem' }}>Ajuste as regras da partida</p>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                 {/* Goal Limit */}
                 <div>
                   <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px' }}>Limite de Gols</label>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     {[1, 2, 3, 5].map(n => (
                       <button 
                        key={n} 
                        onClick={() => updateDoc(doc(db, 'matches', match.id), { 'liveMatch.goalLimit': n })}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', background: (match.liveMatch?.goalLimit || 2) === n ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: (match.liveMatch?.goalLimit || 2) === n ? 'black' : 'white', border: 'none', fontWeight: '900', fontSize: '14px' }}
                       >
                         {n}
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* Time Limit */}
                 <div>
                   <label style={{ fontSize: '10px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px' }}>Tempo de Jogo (min)</label>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     {[5, 10, 15, 20].map(n => (
                       <button 
                        key={n} 
                        onClick={() => handleSetTotalTime(n)}
                        style={{ flex: 1, padding: '12px', borderRadius: '12px', background: (match.liveMatch?.timer?.totalTime / 60 === n) ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: (match.liveMatch?.timer?.totalTime / 60 === n) ? 'black' : 'white', border: 'none', fontWeight: '900', fontSize: '14px' }}
                       >
                         {n}
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* Tiebreaker Settings */}
                 <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <p style={{ fontWeight: '900', fontSize: '14px' }}>Desempate Automático</p>
                        <p style={{ fontSize: '10px', color: 'var(--secondary)' }}>Sorteio automático em caso de empate</p>
                      </div>
                      <button 
                        onClick={() => updateDoc(doc(db, 'matches', match.id), { 'liveMatch.autoTiebreaker': !match.liveMatch?.autoTiebreaker })}
                        style={{ width: '48px', height: '24px', borderRadius: '12px', background: match.liveMatch?.autoTiebreaker ? 'var(--primary)' : 'rgba(255,255,255,0.1)', position: 'relative', border: 'none', transition: 'all 0.3s' }}
                      >
                        <div style={{ position: 'absolute', top: '2px', left: match.liveMatch?.autoTiebreaker ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'all 0.3s' }} />
                      </button>
                    </div>
                    {match.liveMatch?.score?.teamA === match.liveMatch?.score?.teamB && (
                      <button 
                        onClick={() => { handleTiebreakerRaffle(); setShowSettingsModal(false); }}
                        style={{ width: '100%', padding: '10px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '10px', fontWeight: '900' }}
                      >
                        REALIZAR SORTEIO AGORA
                      </button>
                    )}
                 </div>

                 {/* Rotation Settings */}
                 <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontWeight: '900', fontSize: '14px' }}>Isentar Goleiro</p>
                        <p style={{ fontSize: '10px', color: 'var(--secondary)' }}>Goleiro não entra na rotação</p>
                      </div>
                      <button 
                        onClick={() => updateDoc(doc(db, 'matches', match.id), { 'liveMatch.goalkeeperExempt': !match.liveMatch?.goalkeeperExempt })}
                        style={{ width: '48px', height: '24px', borderRadius: '12px', background: match.liveMatch?.goalkeeperExempt ? 'var(--primary)' : 'rgba(255,255,255,0.1)', position: 'relative', border: 'none', transition: 'all 0.3s' }}
                      >
                        <div style={{ position: 'absolute', top: '2px', left: match.liveMatch?.goalkeeperExempt ? '26px' : '2px', width: '20px', height: '20px', borderRadius: '50%', background: 'white', transition: 'all 0.3s' }} />
                      </button>
                    </div>
                 </div>
               </div>

               <button onClick={() => setShowSettingsModal(false)} style={{ width: '100%', padding: '1.2rem', borderRadius: '24px', background: 'var(--primary)', color: 'black', fontWeight: '900', marginTop: '2.5rem', border: 'none' }}>SALVAR REGRAS</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function TeamColumn({ players, isAdmin, onSub, onEvent }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {players.map((p: any) => (
        <div key={p.uid} className="glass" style={{ padding: '1rem', borderRadius: '24px', border: p.justEntered ? '1px solid rgba(29, 185, 84, 0.3)' : '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
          {p.justEntered && (
            <div style={{ position: 'absolute', top: '-8px', right: '-4px', background: 'var(--primary)', color: 'black', fontSize: '7px', fontWeight: '900', padding: '2px 8px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={8} /> RECÉM ENTRADO
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '11px', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name.split(' ')[0]}</p>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={{ fontSize: '8px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase' }}>{p.position}</span>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEvent('assist', p); }}
                      style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}
                    >
                      <Target size={12} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEvent('goal', p); }}
                      style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'rgba(29, 185, 84, 0.1)', border: '1px solid rgba(29, 185, 84, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {isAdmin && (
            <button 
              onClick={() => onSub(p)}
              disabled={p.justEntered && !p.isGoalkeeper}
              style={{ 
                width: '100%', padding: '10px', borderRadius: '14px', fontSize: '9px', fontWeight: '900', 
                textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: p.justEntered && !p.isGoalkeeper ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                color: p.justEntered && !p.isGoalkeeper ? 'rgba(255,255,255,0.2)' : 'var(--primary)',
                border: '1px solid rgba(255,255,255,0.05)',
                cursor: p.justEntered && !p.isGoalkeeper ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={12} /> TROCAR
            </button>
          )}
        </div>
      ))}
      {isAdmin && (
        <button 
          onClick={() => onSub(null)}
          style={{ 
            width: '100%', padding: '1rem', borderRadius: '24px', border: '2px dashed rgba(255,255,255,0.1)', 
            background: 'transparent', color: 'var(--secondary)', fontSize: '10px', fontWeight: '900',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          <Plus size={14} /> ADICIONAR JOGADOR
        </button>
      )}
    </div>
  );
}

function FinishedMatchView({ match, router, isAdmin, onStartNext }: { match: any, router: any, isAdmin?: boolean, onStartNext?: () => void }) {
  const participants = match.finalParticipants || [];
  const mvp = participants.find((p: any) => p.uid === match.mvp);
  const top3 = participants.filter((p: any) => match.top3?.includes(p.uid)).sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));

  return (
    <div className="fade-in" style={{ paddingBottom: '100px', minHeight: '100vh', background: 'var(--background)', color: 'white' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => router.back()} style={{ padding: '12px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '0.1em' }}>RELATÓRIO DE PARTIDA</h2>
        <div style={{ width: '44px' }} />
      </header>

      <div style={{ padding: '0 1.5rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem', paddingTop: '1rem' }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: 'var(--secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>{new Date(match.date).toLocaleDateString('pt-BR')}</p>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
            <div>
              <p style={{ fontSize: '10px', fontWeight: '900', color: match.winner === 'A' ? 'var(--primary)' : 'var(--secondary)', marginBottom: '10px' }}>TIME A</p>
              <h1 style={{ fontSize: '4rem', fontWeight: '900', margin: 0 }}>{match.scoreA || 0}</h1>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--border)', paddingTop: '20px' }}>X</div>
            <div>
              <p style={{ fontSize: '10px', fontWeight: '900', color: match.winner === 'B' ? 'var(--primary)' : 'var(--secondary)', marginBottom: '10px' }}>TIME B</p>
              <h1 style={{ fontSize: '4rem', fontWeight: '900', margin: 0 }}>{match.scoreB || 0}</h1>
            </div>
          </div>
          {match.tiebreakerWinner && (
            <p style={{ fontSize: '11px', fontWeight: '900', color: 'var(--warning)', marginTop: '1rem' }}>
              VENCEU NO DESEMPATE AUTOMÁTICO
            </p>
          )}
        </div>

        <section style={{ marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--primary)', marginBottom: '1.5rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.2em' }}>DESTAQUES DA PARTIDA</h3>
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '15px', height: '220px' }}>
            {top3[1] && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #94a3b8', margin: '0 auto 10px', overflow: 'hidden' }}>
                  <img src={top3[1].photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[1].name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ background: 'var(--surface)', padding: '10px', borderRadius: '12px 12px 0 0', height: '80px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '10px', fontWeight: '900', marginBottom: '5px' }}>2º LUGAR</p>
                  <p style={{ fontSize: '11px', fontWeight: '700' }}>{top3[1].name.split(' ')[0]}</p>
                </div>
              </motion.div>
            )}

            {mvp && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ flex: 1.2, textAlign: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Medal size={24} color="var(--warning)" style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', zIndex: 2 }} />
                  <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: '4px solid var(--warning)', margin: '0 auto 15px', overflow: 'hidden', boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }}>
                    <img src={mvp.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${mvp.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', padding: '15px', borderRadius: '20px 20px 0 0', height: '110px', border: '2px solid var(--warning)', borderBottom: 'none' }}>
                  <p style={{ fontSize: '12px', fontWeight: '900', color: 'var(--warning)', marginBottom: '5px' }}>MVP</p>
                  <p style={{ fontSize: '14px', fontWeight: '900' }}>{mvp.name.split(' ')[0]}</p>
                  <p style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '900', marginTop: '5px' }}>{mvp.rating?.toFixed(1)}</p>
                </div>
              </motion.div>
            )}

            {top3[2] && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #b45309', margin: '0 auto 10px', overflow: 'hidden' }}>
                  <img src={top3[2].photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${top3[2].name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ background: 'var(--surface)', padding: '10px', borderRadius: '12px 12px 0 0', height: '60px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '10px', fontWeight: '900', marginBottom: '5px' }}>3º LUGAR</p>
                  <p style={{ fontSize: '11px', fontWeight: '700' }}>{top3[2].name.split(' ')[0]}</p>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        <section>
          <h3 style={{ fontSize: '12px', fontWeight: '900', color: 'var(--secondary)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ESTATÍSTICAS DOS JOGADORES</h3>
          
          <div style={{ background: 'var(--surface)', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '15px', fontSize: '10px', color: 'var(--secondary)' }}>JOGADOR</th>
                  <th style={{ padding: '15px', fontSize: '10px', color: 'var(--secondary)' }}>GOL</th>
                  <th style={{ padding: '15px', fontSize: '10px', color: 'var(--secondary)' }}>AST</th>
                  <th style={{ padding: '15px', fontSize: '10px', color: 'var(--secondary)' }}>MIN</th>
                  <th style={{ padding: '15px', fontSize: '10px', color: 'var(--secondary)' }}>NOTA</th>
                </tr>
              </thead>
              <tbody>
                {participants.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0)).map((p: any) => (
                  <tr key={p.uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '8px', overflow: 'hidden' }}>
                          <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '800' }}>{p.name.split(' ')[0]}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: '900' }}>{p.goals || 0}</td>
                    <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: '900', color: 'var(--secondary)' }}>{p.assists || 0}</td>
                    <td style={{ textAlign: 'center', fontSize: '11px', color: 'var(--secondary)' }}>{Math.floor((p.minutesPlayed || 0) / 60)}'</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '12px', 
                        fontWeight: '900', 
                        color: (p.rating || 0) >= 8 ? 'var(--primary)' : (p.rating || 0) >= 7 ? 'white' : 'var(--secondary)',
                        background: (p.rating || 0) >= 8 ? 'rgba(29, 185, 84, 0.1)' : 'transparent',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        {p.rating?.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {isAdmin && onStartNext && (
          <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              onClick={onStartNext}
              style={{ 
                width: '100%', padding: '1.5rem', borderRadius: '24px', background: 'var(--primary)', 
                color: 'black', fontWeight: '900', fontSize: '1.1rem', letterSpacing: '0.05em',
                boxShadow: '0 10px 30px var(--primary-glow)', border: 'none'
              }}
            >
              PRÓXIMA PARTIDA
            </button>
            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--secondary)', fontWeight: '700' }}>
              A equipe que perdeu sairá para a entrada da próxima.
            </p>
          </div>
        )}
      </div>
      <style jsx global>{`
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
