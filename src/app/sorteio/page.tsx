"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Users, Shuffle, Lock, Shield, UserMinus, Plus, CheckCircle, Circle, Trash2, RefreshCw, Dices } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
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
}

export default function SorteioPage() {
  const { user, profile } = useAuth();
  const [playersPerTeam, setPlayersPerTeam] = useState(6);
  const [teams, setTeams] = useState<Player[][]>([]);
  const [bench, setBench] = useState<Player[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [confirmedPlayers, setConfirmedPlayers] = useState<Player[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  // Fetch match data and sync with Firestore
  React.useEffect(() => {
    const q = query(
      collection(db, 'matches'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const scheduledMatch = snapshot.docs.find(doc => doc.data().status === 'scheduled');
        if (scheduledMatch) {
          const data = scheduledMatch.data();
          setActiveMatchId(scheduledMatch.id);
          setPresentIds(new Set(data.presentIds || []));
          // Convert from Firestore format {players:[...]} back to Player[][]
          const rawTeams = data.teams || [];
          setTeams(rawTeams.map((t: any) => t.players ? t.players : t));
          setBench(data.bench || []);
          
          const participants = (data.participants || []).map((p: any) => {
            // Se os atributos estiverem vindo zerados ou faltantes, usamos o que temos
            // O ideal para partidas novas é que o admin crie a partida e o sistema já puxe os perfis
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

  const togglePresence = async (uid: string) => {
    if (!activeMatchId) return;
    const next = new Set(presentIds);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    const matchRef = doc(db, 'matches', activeMatchId);
    await updateDoc(matchRef, { presentIds: Array.from(next) });
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
        const userSnap = await getDoc(doc(db, 'users', p.uid));
        if (userSnap.exists()) {
          const userData = userSnap.data();
          return {
            ...p,
            overall: userData.overall || 50,
            attributes: userData.attributes || p.attributes,
            position: userData.position || p.position,
            autoPosition: userData.autoPosition || p.autoPosition,
            playStyles: userData.playStyles || p.playStyles
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

  const drawTeams = async (forceAnyway = false) => {
    const presentPlayers = confirmedPlayers.filter(p => presentIds.has(p.uid));
    if (presentPlayers.length === 0) {
      alert("Selecione os jogadores presentes!");
      return;
    }
    
    setIsDrawing(true);
    
    // Sort by OVR to balance
    const sorted = [...presentPlayers].sort((a, b) => b.overall - a.overall);
    // 1. Categorize players for tactical balancing
    const keepers = sorted.filter(p => (p.autoPosition === 'GOL' || p.position === 'GOL'));
    
    // Key PlayStyles for balancing
    const walls = sorted.filter(p => !keepers.includes(p) && p.playStyles?.some(ps => ps.id === 'muralha'));
    const maestros = sorted.filter(p => !keepers.includes(p) && !walls.includes(p) && p.playStyles?.some(ps => ps.id === 'maestro'));
    const finishers = sorted.filter(p => !keepers.includes(p) && !walls.includes(p) && !maestros.includes(p) && p.playStyles?.some(ps => ps.id === 'finalizador'));

    // Group remaining by tactical role
    const defGroup = sorted.filter(p => !keepers.includes(p) && !walls.includes(p) && !maestros.includes(p) && !finishers.includes(p) && ['ZAG', 'LAT', 'VOL'].includes(p.autoPosition || p.position || ''));
    const midGroup = sorted.filter(p => !keepers.includes(p) && !walls.includes(p) && !maestros.includes(p) && !finishers.includes(p) && !defGroup.includes(p) && ['MEI', 'VOL'].includes(p.autoPosition || p.position || ''));
    const atkGroup = sorted.filter(p => !keepers.includes(p) && !walls.includes(p) && !maestros.includes(p) && !finishers.includes(p) && !defGroup.includes(p) && !midGroup.includes(p));

    let totalTeams = Math.floor(presentPlayers.length / playersPerTeam);
    if (totalTeams === 0 && !forceAnyway) {
      setIsDrawing(false);
      return;
    }
    totalTeams = Math.max(totalTeams, forceAnyway ? Math.min(2, presentPlayers.length) : 1);

    const newTeams: Player[][] = Array.from({ length: totalTeams }, () => []);
    const newBench: Player[] = [];

    // Helper to add player to teams proportionally
    let teamIdx = 0;
    let forward = true;

    const distributeToTeams = (playerList: Player[]) => {
      playerList.forEach(player => {
        if (newTeams.every(t => t.length >= playersPerTeam)) {
          newBench.push(player);
        } else {
          let count = 0;
          while (newTeams[teamIdx].length >= playersPerTeam && count < totalTeams) {
            if (forward) {
              if (teamIdx < totalTeams - 1) teamIdx++; else forward = false;
            } else {
              if (teamIdx > 0) teamIdx--; else forward = true;
            }
            count++;
          }

          if (newTeams[teamIdx].length < playersPerTeam) {
            newTeams[teamIdx].push(player);
            if (forward) {
              if (teamIdx < totalTeams - 1) teamIdx++; else forward = false;
            } else {
              if (teamIdx > 0) teamIdx--; else forward = true;
            }
          } else {
            newBench.push(player);
          }
        }
      });
    };

    // Distribute Wave 1: Keepers
    distributeToTeams(keepers);
    // Distribute Wave 2: Walls
    distributeToTeams(walls);
    // Distribute Wave 3: Maestros
    distributeToTeams(maestros);
    // Distribute Wave 4: Finishers
    distributeToTeams(finishers);
    // Distribute Wave 5: Defense
    distributeToTeams(defGroup);
    // Distribute Wave 6: Midfield
    distributeToTeams(midGroup);
    // Distribute Wave 7: Attack
    distributeToTeams(atkGroup);

    if (activeMatchId) {
      const matchRef = doc(db, 'matches', activeMatchId);
      // Firestore rejects nested arrays, so wrap each team in an object
      const teamsForFirestore = newTeams.map(team => ({ players: team }));
      await updateDoc(matchRef, { teams: teamsForFirestore, bench: newBench });
    }

    setTimeout(() => setIsDrawing(false), 1000);
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
    const sum = team.reduce((acc, p) => acc + (p.overall || 70), 0);
    return Math.round(sum / team.length);
  };

  return (
    <div className="fade-in container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '2rem', paddingTop: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Sorteio de Times</h1>
        <p style={{ color: 'var(--secondary)' }}>Balanceamento automático por nível</p>
      </header>

      {/* Presence Selection */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h3 style={{ fontWeight: '800', fontSize: '1rem' }}>MARCAR PRESENÇA ({presentIds.size})</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={syncProfiles} title="Sincronizar dados dos perfis" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.05)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <RefreshCw size={16} className={isDrawing ? 'animate-spin' : ''} color="var(--secondary)" />
            </button>
            <button onClick={selectAll} style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '8px' }}>
              {presentIds.size === confirmedPlayers.length ? 'DESMARCAR TODOS' : 'MARCAR TODOS'}
            </button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {confirmedPlayers.map((player) => (
            <div 
              key={player.uid} 
              onClick={() => togglePresence(player.uid)}
              style={{ 
                padding: '10px', 
                borderRadius: '16px', 
                background: presentIds.has(player.uid) ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                border: `1px solid ${presentIds.has(player.uid) ? 'var(--primary)' : 'var(--border)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer'
              }}
            >
              {presentIds.has(player.uid) ? <CheckCircle size={18} color="var(--primary)" /> : <Circle size={18} color="var(--secondary)" />}
              <span style={{ fontSize: '13px', fontWeight: '700' }}>{player.name}</span>
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
        {teams.length > 1 && (
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            padding: '12px', 
            borderRadius: '16px', 
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: '800',
            border: '1px solid var(--border)'
          }}>
            {Math.abs(getTeamAverage(teams[0]) - getTeamAverage(teams[1])) <= 3 ? (
              <span style={{ color: 'var(--primary)' }}>✅ EQUILÍBRIO TÉCNICO DETECTADO</span>
            ) : (
              <span style={{ color: 'var(--warning)' }}>⚠️ DISPARIDADE TÉCNICA (DIFERENÇA {'>'} 3 OVR)</span>
            )}
          </div>
        )}
        {teams.map((team, idx) => (
          <motion.div key={idx} className="glass" style={{ padding: '1.5rem', borderRadius: '24px', borderLeft: `6px solid ${['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][idx % 4]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h4 style={{ fontWeight: '900', fontSize: '1.2rem' }}>TIME {idx + 1}</h4>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '800' }}>
                OVR: <span style={{ color: 'var(--primary)' }}>{getTeamAverage(team)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {team.map((player) => (
                <div key={player.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      background: getCardVisuals(getCardType(player.overall || 50)).bg, 
                      overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
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
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    {player.overall || 50}
                  </div>
                </div>
              ))}
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
              {bench.map((player) => (
                <div key={player.uid} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden' }}>
                    <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <Link href={`/perfil/${player.uid}`} style={{ fontSize: '12px', fontWeight: '600', color: 'var(--secondary)', textDecoration: 'none' }}>{player.name}</Link>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {teams.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={cancelSorteio}
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '14px 20px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: '800', width: '100%' }}
            >
              <Trash2 size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
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
