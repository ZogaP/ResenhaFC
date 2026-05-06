"use client";

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CreditCard, Copy, CheckCircle, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePixPayload } from '@/lib/pix';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

interface PaymentModuleProps {
  match: any;
  isAdmin?: boolean;
}

export default function PaymentModule({ match, isAdmin }: PaymentModuleProps) {
  const { profile } = useAuth();
  const [pixConfig, setPixConfig] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'pix'), (snap) => {
      if (snap.exists()) {
        setPixConfig(snap.data());
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const [payingFor, setPayingFor] = useState<string[]>([]);
  const participant = match.participants?.find((p: any) => p.uid === profile?.uid);
  const individualValue = match.participants?.length > 0 
    ? parseFloat(match.totalCost || '0') / match.participants.length 
    : 0;

  const totalToPay = individualValue * (1 + payingFor.length);

  const pixPayload = pixConfig && totalToPay > 0 ? generatePixPayload({
    key: pixConfig.key,
    name: pixConfig.name,
    city: pixConfig.city,
    amount: totalToPay,
    transactionId: "***"
  }) : '';

  const handleCopy = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNotifyPayment = async () => {
    if (!participant || participant.paymentStatus === 'paid' || participant.paymentStatus === 'waiting') return;
    
    const updatedParticipants = match.participants.map((p: any) => {
      if (p.uid === profile?.uid) {
        return { ...p, paymentStatus: 'waiting', payingFor };
      }
      if (payingFor.includes(p.uid)) {
        return { ...p, paymentStatus: 'waiting', sponsoredBy: profile?.uid };
      }
      return p;
    });
    
    try {
      await updateDoc(doc(db, 'matches', match.id), { participants: updatedParticipants });
      alert("Aviso de pagamento enviado!");
      setPayingFor([]);
    } catch (e) {
      alert("Erro ao notificar pagamento.");
    }
  };

  const handleApprovePayment = async (uid: string) => {
    if (!isAdmin) return;
    const updatedParticipants = match.participants.map((p: any) => 
      p.uid === uid ? { ...p, paymentStatus: 'paid' } : p
    );
    await updateDoc(doc(db, 'matches', match.id), { participants: updatedParticipants });
  };

  if (loading) return null;
  if (!pixConfig || individualValue <= 0) return null;

  return (
    <section className="glass" style={{ borderRadius: '28px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={18} color="var(--primary)" /> PAGAMENTO DA PELADA
        </h3>
        <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--primary)', background: 'rgba(29, 185, 84, 0.1)', padding: '4px 12px', borderRadius: '8px' }}>
          R$ {totalToPay.toFixed(2)}
        </div>
      </div>

      {!participant ? (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--secondary)', fontSize: '12px' }}>
          Apenas jogadores confirmados podem visualizar os dados de pagamento.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
          
          {participant.paymentStatus === 'paid' ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(29, 185, 84, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CheckCircle size={32} color="var(--primary)" />
              </div>
              <h4 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '4px' }}>Pagamento Confirmado</h4>
              <p style={{ color: 'var(--secondary)', fontSize: '12px' }}>Tudo certo! Boa pelada.</p>
            </div>
          ) : (
            <>
              {participant.paymentStatus !== 'waiting' && (
                <div style={{ width: '100%', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '10px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.1em' }}>PAGAR PARA MAIS ALGUÉM?</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {match.participants?.filter((p: any) => p.uid !== profile?.uid && p.paymentStatus !== 'paid' && p.paymentStatus !== 'waiting').map((p: any) => {
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

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '700', marginBottom: '1rem' }}>
                  Copie o código PIX abaixo para realizar o pagamento
                </p>
                
                <button 
                  onClick={handleCopy}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '14px 20px', 
                    borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)',
                    color: copied ? 'var(--primary)' : 'white', fontWeight: '800', transition: 'all 0.2s'
                  }}
                >
                  <Copy size={18} />
                  <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {copied ? 'CÓDIGO COPIADO!' : pixPayload}
                  </span>
                </button>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  onClick={handleNotifyPayment}
                  disabled={participant.paymentStatus === 'waiting'}
                  style={{ 
                    width: '100%', padding: '16px', borderRadius: '16px', 
                    background: participant.paymentStatus === 'waiting' ? 'rgba(245, 158, 11, 0.1)' : 'var(--primary-gradient)',
                    color: participant.paymentStatus === 'waiting' ? 'var(--warning)' : 'black',
                    fontWeight: '900', fontSize: '14px', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                  }}
                >
                  {participant.paymentStatus === 'waiting' ? (
                    <><Clock size={18} /> AGUARDANDO APROVAÇÃO</>
                  ) : (
                    'JÁ PAGUEI'
                  )}
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <AlertCircle size={14} color="var(--secondary)" />
                  <span style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: '700' }}>Confirmação manual pelo administrador</span>
                </div>
              </div>
            </>
          )}

          {/* Admin Control Section (If applicable) */}
          {isAdmin && (
             <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '10px', fontWeight: '900', color: 'var(--secondary)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.1em' }}>CONTROLE DO ADMINISTRADOR</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {match.participants?.filter((p: any) => p.paymentStatus === 'waiting').map((p: any) => (
                      <div key={p.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245, 158, 11, 0.05)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden' }}>
                               <img src={p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" />
                            </div>
                                                         <span style={{ fontSize: '12px', fontWeight: '800' }}>{p.name} pagou?</span>
                         </div>
                         <button 
                          onClick={() => handleApprovePayment(p.uid)}
                          style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--primary)', color: 'black', fontSize: '10px', fontWeight: '900' }}
                         >
                            SIM
                         </button>
                      </div>
                   ))}
                   {match.participants?.filter((p: any) => p.paymentStatus === 'waiting').length === 0 && (
                      <p style={{ fontSize: '10px', color: 'var(--secondary)', textAlign: 'center' }}>Nenhuma aprovação pendente.</p>
                   )}
                </div>
             </div>
          )}
        </div>
      )}
    </section>
  );
}
