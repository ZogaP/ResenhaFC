"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Copy, QrCode, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function PagamentoPage() {
  const { profile } = useAuth();
  const [hasPaid, setHasPaid] = useState(false);
  const pixKey = "rodriguesmiguel05@gmail.com";

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixKey);
    alert('Chave PIX Copiada!');
  };

  const [confirmedPlayers, setConfirmedPlayers] = useState<any[]>([]);
  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch confirmed players and their payment status
  React.useEffect(() => {
    const fetchParticipants = async () => {
      const q = query(
        collection(db, 'matches'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          // Find the scheduled match like Home does
          const scheduledMatch = snapshot.docs.find(doc => doc.data().status === 'scheduled');
          if (scheduledMatch) {
            const matchData: any = { id: scheduledMatch.id, ...scheduledMatch.data() };
            setMatchInfo(matchData);
            const participants = matchData.participants || [];
            setConfirmedPlayers(participants);
          } else {
            // Fallback to latest if no scheduled
            const matchData: any = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            setMatchInfo(matchData);
            setConfirmedPlayers(matchData.participants || []);
          }
          setLoading(false);
        }
      });
    };
    fetchParticipants();
  }, []);

  const paidCount = confirmedPlayers.filter(p => p.status === 'paid').length;
  const paymentPercentage = confirmedPlayers.length > 0 
    ? Math.round((paidCount / confirmedPlayers.length) * 100) 
    : 0;

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2rem', paddingTop: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Pagamento</h1>
        <p style={{ color: 'var(--secondary)' }}>Contribuição para a pelada de hoje</p>
      </header>

      {/* PIX Card */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
          <p style={{ color: 'var(--secondary)', fontSize: '13px', marginBottom: '4px' }}>VALOR DA PELADA</p>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>
            R$ {matchInfo?.id ? (matchInfo.isClosed ? (matchInfo.price || '0,00') : (confirmedPlayers.length > 0 ? (parseFloat(matchInfo.totalCost || '0') / confirmedPlayers.length).toFixed(2) : parseFloat(matchInfo.totalCost || '0').toFixed(2))) : '0,00'}
          </p>
          {!matchInfo?.isClosed && (
            <p style={{ 
              fontSize: '11px', 
              color: 'var(--warning)', 
              fontWeight: '700', 
              marginTop: '8px',
              background: 'rgba(245, 158, 11, 0.1)',
              padding: '4px 10px',
              borderRadius: '8px',
              display: 'inline-block'
            }}>
              ⚠️ Lista não fechada ainda, valor pode mudar
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={copyPixKey}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'white',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontSize: '15px'
            }}
          >
            <Copy size={20} /> Copiar Chave PIX
          </button>
          
          {!hasPaid ? (
            <button 
              onClick={() => setHasPaid(true)}
              style={{
                width: '100%',
                padding: '18px',
                borderRadius: '16px',
                background: 'var(--primary)',
                color: 'black',
                fontWeight: '900',
                fontSize: '16px',
                boxShadow: '0 8px 25px var(--primary-glow)'
              }}
            >
              Já paguei!
            </button>
          ) : (
            <div style={{ 
              padding: '18px', 
              borderRadius: '16px', 
              background: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}>
              <CheckCircle size={22} /> Aguardando Confirmação
            </div>
          )}
        </div>
      </div>

      {/* Payment List */}
      <h3 style={{ marginBottom: '1.2rem', fontWeight: '800', fontSize: '1.3rem' }}>Status do Grupo</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '100px' }}>
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: '800', fontSize: '15px' }}>Confirmados ({confirmedPlayers.length})</span>
            <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '800' }}>{paymentPercentage}% pago</span>
          </div>
          
          {loading ? (
            <p style={{ color: 'var(--secondary)', fontSize: '14px', textAlign: 'center' }}>Carregando lista...</p>
          ) : confirmedPlayers.length > 0 ? (
            confirmedPlayers.map((player, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '12px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface)', overflow: 'hidden' }}>
                    <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: player.uid === profile?.uid ? 'var(--primary)' : 'white' }}>
                    {player.name} {player.uid === profile?.uid ? '(Você)' : ''}
                  </span>
                </div>
                
                {player.status === 'paid' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '12px', fontWeight: '800' }}>
                    <CheckCircle size={14} /> PAGO
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--secondary)', fontSize: '12px', fontWeight: '800' }}>
                     PENDENTE
                  </div>
                )}
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--secondary)', fontSize: '14px', textAlign: 'center' }}>Ninguém confirmado ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
