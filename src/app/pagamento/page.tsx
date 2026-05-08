"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Copy, CheckCircle, Clock } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { generatePixPayload } from '@/lib/pix';
import { QRCodeSVG } from 'qrcode.react';

export default function PagamentoPage() {
  const { profile } = useAuth();
  const [hasPaid, setHasPaid] = useState(false);
  const [pixConfig, setPixConfig] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [confirmedPlayers, setConfirmedPlayers] = useState<any[]>([]);
  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch PIX Config
  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'pix'), (snap) => {
      if (snap.exists()) setPixConfig(snap.data());
    });
    return () => unsub();
  }, []);

  const [payingFor, setPayingFor] = useState<string[]>([]);

  const individualValue = matchInfo && confirmedPlayers.length > 0 
    ? parseFloat(matchInfo.totalCost || '0') / confirmedPlayers.length 
    : 0;

  const totalToPay = individualValue * (1 + payingFor.length);

  const pixPayload = pixConfig && totalToPay > 0 ? generatePixPayload({
    key: pixConfig.key,
    name: pixConfig.name,
    city: pixConfig.city,
    amount: totalToPay,
    transactionId: "***"
  }) : '';

  const copyPixKey = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    alert('Código PIX Copiado!');
  };

  const handleNotifyPayment = async () => {
    if (!profile || !matchInfo) return;
    const updatedParticipants = matchInfo.participants.map((p: any) => {
      if (p.uid === profile.uid) return { ...p, paymentStatus: 'waiting', payingFor };
      if (payingFor.includes(p.uid)) return { ...p, paymentStatus: 'waiting', sponsoredBy: profile.uid };
      return p;
    });
    try {
      await updateDoc(doc(db, 'matches', matchInfo.id), { participants: updatedParticipants });
      setHasPaid(true);
      setPayingFor([]);
    } catch (e) {
      alert("Erro ao notificar pagamento.");
    }
  };

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
          const matchDoc = scheduledMatch || snapshot.docs[0];
          const matchData: any = { id: matchDoc.id, ...matchDoc.data() };
          
          setMatchInfo(matchData);
          setConfirmedPlayers(matchData.participants || []);
          
          const myStatus = matchData.participants?.find((p: any) => p.uid === profile?.uid)?.paymentStatus;
          if (myStatus === 'waiting' || myStatus === 'paid') setHasPaid(true);
          
          setLoading(false);
        }
      });
    };
    fetchParticipants();
  }, [profile]);

  const paidCount = confirmedPlayers.filter(p => p.paymentStatus === 'paid').length;
  const paymentPercentage = confirmedPlayers.length > 0 
    ? Math.round((paidCount / confirmedPlayers.length) * 100) 
    : 0;

  const isParticipant = confirmedPlayers.some((p: any) => p.uid === profile?.uid);

  if (!loading && !isParticipant) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚽</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>Nenhuma pelada encontrada</h2>
        <p style={{ color: 'var(--secondary)', fontSize: '14px', maxWidth: '280px' }}>Você precisa estar confirmado em uma pelada para acessar o pagamento.</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2rem', paddingTop: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Pagamento</h1>
        <p style={{ color: 'var(--secondary)' }}>Contribuição para a pelada de hoje</p>
      </header>

      {/* PIX Card */}
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
          <p style={{ color: 'var(--secondary)', fontSize: '13px', marginBottom: '4px' }}>VALOR TOTAL A PAGAR</p>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary)' }}>
            R$ {totalToPay.toFixed(2)}
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

        {!hasPaid && (
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '10px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.1em' }}>PAGAR PARA MAIS ALGUÉM?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {confirmedPlayers.filter((p: any) => p.uid !== profile?.uid && p.paymentStatus !== 'paid' && p.paymentStatus !== 'waiting').map((p: any) => {
                const isSelected = payingFor.includes(p.uid);
                return (
                  <button
                    key={p.uid}
                    onClick={() => {
                      if (isSelected) setPayingFor(payingFor.filter(id => id !== p.uid));
                      else setPayingFor([...payingFor, p.uid]);
                    }}
                    style={{
                      padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800',
                      background: isSelected ? 'var(--primary)' : 'var(--surface)',
                      color: isSelected ? 'black' : 'white',
                      border: '1px solid ' + (isSelected ? 'var(--primary)' : 'var(--border)'),
                      transition: 'all 0.2s'
                    }}
                  >
                    + {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {pixPayload ? (
          <>
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
                <Copy size={20} /> {copied ? 'CÓDIGO COPIADO!' : 'Copiar Chave PIX'}
              </button>
              
              {!hasPaid ? (
                <button 
                  onClick={handleNotifyPayment}
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
                  <CheckCircle size={22} /> {confirmedPlayers.find(p => p.uid === profile?.uid)?.paymentStatus === 'paid' ? 'Pagamento Confirmado' : 'Aguardando Confirmação'}
                </div>
              )}
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--secondary)', fontSize: '12px', padding: '1rem' }}>
            Aguardando configuração de pagamento pelo administrador...
          </p>
        )}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface)', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={player.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: player.uid === profile?.uid ? 'var(--primary)' : 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player.name} {player.uid === profile?.uid ? '(Você)' : ''}
                  </span>
                </div>
                
                {player.paymentStatus === 'paid' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '12px', fontWeight: '800' }}>
                    <CheckCircle size={14} /> PAGO
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--secondary)', fontSize: '12px', fontWeight: '800' }}>
                     {player.paymentStatus === 'waiting' ? 'AGUARDANDO' : 'PENDENTE'}
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
