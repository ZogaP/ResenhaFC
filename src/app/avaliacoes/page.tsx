"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Star, Send, CheckCircle, User, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PlayerToRate {
  id: string;
  name: string;
  photoURL?: string;
  rated: boolean;
  rating?: number;
}

export default function AvaliacoesPage() {
  const { profile } = useAuth();
  const [players, setPlayers] = useState<PlayerToRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerToRate | null>(null);
  const [currentRating, setCurrentRating] = useState(7);
  const [attributes, setAttributes] = useState({
    ataque: 7,
    defesa: 7,
    passe: 7,
    velocidade: 7,
    fisico: 7,
    finalizacao: 7,
  });

  // Fetch real participants from latest match
  React.useEffect(() => {
    const q = query(
      collection(db, 'matches'),
      orderBy('createdAt', 'desc'),
      limit(20) // Get more to be able to filter mocks
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        // Filter out mock matches
        const realMatches = matches.filter(m => {
          const loc = (m.location || '').toLowerCase();
          return !loc.includes('fictícia') && !loc.includes('teste') && !loc.includes('mock');
        });

        const latestMatch = realMatches[0];
        if (latestMatch) {
          const participants = latestMatch.participants || [];
          
          // Map to PlayerToRate and filter out current user
          const toRate = participants
            .filter((p: any) => p.uid !== profile?.uid)
            .map((p: any) => ({
              id: p.uid,
              name: p.name,
              photoURL: p.photoURL,
              rated: false
            }));
          
          setPlayers(toRate);
        }
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [profile]);

  const handleRate = async () => {
    if (!selectedPlayer) return;

    try {
      // 1. Fetch current attributes of target player
      const userRef = doc(db, 'users', selectedPlayer.id);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const currentAttrs = data.attributes || {
          ataque: 50, defesa: 50, passe: 50, velocidade: 50, fisico: 50, finalizacao: 50
        };

        // 2. Calculate new attributes based on ratings
        // If rating >= 8, +1. If rating <= 3, -1.
        const newAttrs = { ...currentAttrs };
        (Object.keys(attributes) as Array<keyof typeof attributes>).forEach(attr => {
          const rating = attributes[attr];
          if (rating >= 8) newAttrs[attr] = Math.min(99, (newAttrs[attr] || 50) + 1);
          if (rating <= 3) newAttrs[attr] = Math.max(10, (newAttrs[attr] || 50) - 1);
        });

        // 3. Calculate new overall
        const newOverall = Math.round(
          (Object.values(newAttrs) as number[]).reduce((a: number, b: number) => a + b, 0) / 6
        );

        // 4. Update Firestore
        await updateDoc(userRef, {
          attributes: newAttrs,
          overall: newOverall,
          rating: (data.rating ? (data.rating + currentRating) / 2 : currentRating) // Update global rating too
        });
      }

      setPlayers(prev => prev.map(p => 
        p.id === selectedPlayer.id ? { ...p, rated: true, rating: currentRating } : p
      ));
    } catch (error) {
      console.error("Error updating player attributes:", error);
    } finally {
      setSelectedPlayer(null);
      setCurrentRating(7);
      setAttributes({ ataque: 7, defesa: 7, passe: 7, velocidade: 7, fisico: 7, finalizacao: 7 });
    }
  };

  const remaining = players.filter(p => !p.rated).length;

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2rem', paddingTop: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Avaliações</h1>
        <p style={{ color: 'var(--secondary)' }}>Dê nota aos seus companheiros de hoje</p>
      </header>

      {loading ? (
        <div style={{ display: 'flex', height: '50vh', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--surface)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : players.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface)', borderRadius: '24px', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>Nenhuma partida recente para avaliar.</p>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
          <span style={{ color: 'var(--secondary)' }}>Progresso</span>
          <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{players.length - remaining} de {players.length}</span>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'var(--surface)', borderRadius: '3px', overflow: 'hidden' }}>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((players.length - remaining) / players.length) * 100}%` }}
            style={{ height: '100%', background: 'var(--primary)' }} 
          />
        </div>
      </div>

      {/* Player List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {players.map((player) => (
          <div 
            key={player.id} 
            className="glass"
            onClick={() => !player.rated && setSelectedPlayer(player)}
            style={{ 
              padding: '1rem', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              opacity: player.rated ? 0.6 : 1,
              cursor: player.rated ? 'default' : 'pointer',
              border: selectedPlayer?.id === player.id ? '1px solid var(--primary)' : '1px solid var(--border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} color="var(--secondary)" />
              </div>
              <div>
                <p style={{ fontWeight: '600' }}>{player.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--secondary)' }}>
                  {player.rated ? `Nota enviada: ${player.rating}` : 'Aguardando avaliação'}
                </p>
              </div>
            </div>
            {player.rated ? (
              <CheckCircle size={20} color="var(--primary)" />
            ) : (
              <Star size={20} color="var(--border)" />
            )}
          </div>
        ))}
      </div>
      </>
      )}

      {/* Rating Modal (Simplified for Mobile) */}
      <AnimatePresence>
        {selectedPlayer && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            style={{ 
              position: 'fixed', 
              bottom: '0', 
              left: '50%', 
              transform: 'translateX(-50%)', 
              width: '100%', 
              maxWidth: '480px',
              background: 'var(--surface)',
              borderTop: '1px solid var(--border)',
              padding: '2rem 1.5rem calc(2rem + var(--safe-area-bottom))',
              zIndex: 2000,
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              boxShadow: '0 -20px 40px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>Como foi o {selectedPlayer.name}?</h3>
              <p style={{ color: 'var(--secondary)', fontSize: '13px' }}>Arraste para definir a nota</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '2rem' }}>
              {(Object.keys(attributes) as Array<keyof typeof attributes>).map((attr) => (
                <div key={attr}>
                  <label style={{ fontSize: '10px', color: 'var(--secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>{attr}</label>
                  <input 
                    type="range" min="1" max="10" step="1" 
                    value={attributes[attr]}
                    onChange={(e) => setAttributes(prev => ({ ...prev, [attr]: parseInt(e.target.value) }))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: '700' }}>{attributes[attr]}</div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <p style={{ color: 'var(--secondary)', fontSize: '12px' }}>NOTA GERAL</p>
              <span style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--primary)' }}>{currentRating.toFixed(1)}</span>
            </div>

            <input 
              type="range" 
              min="0" 
              max="10" 
              step="0.5" 
              value={currentRating}
              onChange={(e) => setCurrentRating(parseFloat(e.target.value))}
              style={{ 
                width: '100%', 
                marginBottom: '2rem',
                accentColor: 'var(--primary)'
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setSelectedPlayer(null)}
                style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'var(--border)', fontWeight: '600' }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleRate}
                style={{ flex: 2, padding: '16px', borderRadius: '16px', background: 'var(--primary)', color: 'black', fontWeight: '800' }}
              >
                Confirmar Nota
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finished State */}
      {remaining === 0 && (
        <div style={{ 
          marginTop: '2rem', 
          padding: '2rem', 
          background: 'rgba(34, 197, 94, 0.1)', 
          borderRadius: '24px', 
          textAlign: 'center',
          border: '1px solid var(--primary)'
        }}>
          <CheckCircle size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontWeight: '800', marginBottom: '8px' }}>Tudo pronto!</h3>
          <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>Sua média foi atualizada e os rankings já mostram os novos resultados.</p>
        </div>
      )}

      {/* Info Box */}
      <div className="glass" style={{ marginTop: '2rem', padding: '1rem', borderRadius: '16px', display: 'flex', gap: '12px', opacity: 0.8 }}>
        <Info size={20} color="var(--secondary)" />
        <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>Suas avaliações são anônimas. Seja justo e ajude a manter o equilíbrio das peladas.</p>
      </div>
    </div>
  );
}
