"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Users, Shuffle, Lock, Shield, UserMinus, Plus, CheckCircle, Circle } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { clsx } from 'clsx';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface Player {
  uid: string;
  name: string;
  overall: number;
  isGoalkeeper: boolean;
  position: string;
  photoURL?: string;
}

export default function SorteioPage() {
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
          setTeams(data.teams || []);
          setBench(data.bench || []);
          
          const participants = (data.participants || []).map((p: any) => ({
            ...p,
            overall: p.overall || 70,
            isGoalkeeper: p.position === 'GOL'
          }));
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

  const drawTeams = async () => {
    const presentPlayers = confirmedPlayers.filter(p => presentIds.has(p.uid));
    if (presentPlayers.length === 0) {
      alert("Selecione os jogadores presentes!");
      return;
    }
    
    setIsDrawing(true);
    
    // Sort by OVR to balance
    const sorted = [...presentPlayers].sort((a, b) => b.overall - a.overall);
    const keepers = sorted.filter(p => p.position === 'GOL');
    const others = sorted.filter(p => p.position !== 'GOL');

    const totalTeams = Math.floor(presentPlayers.length / playersPerTeam);
    if (totalTeams === 0) {
      alert(`Jogadores insuficientes para formar um time de ${playersPerTeam}!`);
      setIsDrawing(false);
      return;
    }

    const newTeams: Player[][] = Array.from({ length: totalTeams }, () => []);
    const newBench: Player[] = [];

    // Distribute Keepers first
    keepers.forEach((p, i) => {
      if (i < totalTeams) newTeams[i].push(p);
      else others.push(p); // Overflow keepers become players
    });

    // Fill teams snake style
    let forward = true;
    let teamIdx = 0;
    others.forEach(player => {
      if (newTeams.every(t => t.length >= playersPerTeam)) {
        newBench.push(player);
      } else {
        // Find next team that isn't full
        let count = 0;
        while (newTeams[teamIdx].length >= playersPerTeam && count < totalTeams) {
          if (forward) {
            if (teamIdx < totalTeams - 1) teamIdx++; else { forward = false; }
          } else {
            if (teamIdx > 0) teamIdx--; else { forward = true; }
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

    if (activeMatchId) {
      const matchRef = doc(db, 'matches', activeMatchId);
      await updateDoc(matchRef, { teams: newTeams, bench: newBench });
    }

    setTimeout(() => setIsDrawing(false), 1000);
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
          <button onClick={selectAll} style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '8px' }}>
            {presentIds.size === confirmedPlayers.length ? 'DESMARCAR TODOS' : 'MARCAR TODOS'}
          </button>
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
              <span style={{ fontSize: '13px', fontWeight: '700' }}>{player.name.split(' ')[0]}</span>
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

        <button 
          onClick={drawTeams}
          disabled={isDrawing || presentIds.size < playersPerTeam}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: '18px',
            background: isDrawing || presentIds.size < playersPerTeam ? 'var(--surface)' : 'var(--primary)',
            color: 'black',
            fontWeight: '900',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          <Shuffle size={22} className={isDrawing ? 'animate-spin' : ''} />
          {isDrawing ? 'SORTEANDO...' : 'SORTEAR TIMES'}
        </button>
      </div>

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                <div key={player.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--surface)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{player.name}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '800' }}>{player.overall}</span>
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
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--secondary)' }}>{player.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </motion.div>
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
