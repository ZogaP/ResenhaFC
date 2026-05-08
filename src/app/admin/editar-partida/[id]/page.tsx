"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Calendar, Clock, MapPin, DollarSign, Users, ChevronLeft, Globe, Lock, X, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function EditarPartidaPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const [matchData, setMatchData] = useState({
    location: '',
    address: '',
    date: '',
    time: '',
    timeEnd: '',
    totalCost: '',
    maxPlayers: '20',
    description: '',
    visibility: 'publica' as 'publica' | 'privada',
    invitedEmails: [] as string[],
    pricingType: 'split' as 'split' | 'fixed',
    fixedPrice: '',
    price: ''
  });

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.push('/');
      return;
    }

    const fetchMatch = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, 'matches', id as string));
        if (snap.exists()) {
          const data = snap.data();
          setMatchData({
            location: data.location || '',
            address: data.address || '',
            date: data.date || '',
            time: data.time || '',
            timeEnd: data.timeEnd || '',
            totalCost: data.totalCost || '',
            maxPlayers: data.maxPlayers || '20',
            description: data.description || '',
            visibility: data.visibility || 'publica',
            invitedEmails: data.invitedEmails || [],
            pricingType: data.pricingType || 'split',
            fixedPrice: data.fixedPrice || '',
            price: data.price || ''
          });
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    fetchMatch();
  }, [profile, router, id]);

  const addInvitedEmail = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (matchData.invitedEmails.includes(email)) {
      setInviteEmail('');
      return;
    }
    setMatchData(prev => ({
      ...prev,
      invitedEmails: [...prev.invitedEmails, email]
    }));
    setInviteEmail('');
  };

  const removeInvitedEmail = (email: string) => {
    setMatchData(prev => ({
      ...prev,
      invitedEmails: prev.invitedEmails.filter(e => e !== email)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setSaving(true);

    try {
      await updateDoc(doc(db, 'matches', id as string), {
        ...matchData
      });
      alert("Partida atualizada com sucesso!");
      router.push('/');
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar partida.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'black', color: 'var(--primary)' }}>
      <div className="loader-spinner" />
    </div>
  );

  return (
    <div className="fade-in" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => router.back()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Editar Partida</h1>
          <p style={{ color: 'var(--secondary)' }}>Altere as informações do jogo</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Visibility Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {matchData.visibility === 'publica' ? <Globe size={16} /> : <Lock size={16} />} Visibilidade
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setMatchData({...matchData, visibility: 'publica'})}
                style={{
                  flex: 1, padding: '14px', borderRadius: '14px',
                  background: matchData.visibility === 'publica' ? 'rgba(34, 197, 94, 0.15)' : 'var(--surface)',
                  border: matchData.visibility === 'publica' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  color: matchData.visibility === 'publica' ? 'var(--primary)' : 'var(--secondary)',
                  fontWeight: '800', fontSize: '13px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Globe size={16} /> PÚBLICA
              </button>
              <button
                type="button"
                onClick={() => setMatchData({...matchData, visibility: 'privada'})}
                style={{
                  flex: 1, padding: '14px', borderRadius: '14px',
                  background: matchData.visibility === 'privada' ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface)',
                  border: matchData.visibility === 'privada' ? '2px solid var(--warning)' : '1px solid var(--border)',
                  color: matchData.visibility === 'privada' ? 'var(--warning)' : 'var(--secondary)',
                  fontWeight: '800', fontSize: '13px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Lock size={16} /> PRIVADA
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} /> Local da Pelada
            </label>
            <input 
              required
              placeholder="Ex: Arena Soccer Park"
              value={matchData.location}
              onChange={e => setMatchData({...matchData, location: e.target.value})}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={16} /> Endereço Completo
            </label>
            <input 
              placeholder="Rua, Número, Bairro..."
              value={matchData.address}
              onChange={e => setMatchData({...matchData, address: e.target.value})}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} /> Data
              </label>
              <input 
                required
                type="text"
                placeholder="DD/MM/AAAA"
                value={matchData.date}
                onChange={e => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 8) val = val.slice(0, 8);
                  if (val.length > 4) val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
                  else if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                  setMatchData({...matchData, date: val});
                }}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} /> Início
              </label>
              <input 
                required
                type="text"
                placeholder="00:00"
                value={matchData.time}
                onChange={e => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 4) val = val.slice(0, 4);
                  if (val.length > 2) val = val.slice(0, 2) + ':' + val.slice(2);
                  setMatchData({...matchData, time: val});
                }}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} /> Fim
              </label>
              <input 
                required
                type="text"
                placeholder="00:00"
                value={matchData.timeEnd}
                onChange={e => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 4) val = val.slice(0, 4);
                  if (val.length > 2) val = val.slice(0, 2) + ':' + val.slice(2);
                  setMatchData({...matchData, timeEnd: val});
                }}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={16} /> Custo Total
              </label>
              <input 
                required
                type="number"
                value={matchData.totalCost}
                onChange={e => setMatchData({...matchData, totalCost: e.target.value})}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} /> Vagas
              </label>
              <input 
                required
                type="number"
                value={matchData.maxPlayers}
                onChange={e => setMatchData({...matchData, maxPlayers: e.target.value})}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={16} /> Modo de Cobrança
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setMatchData({...matchData, pricingType: 'split'})}
                style={{
                  flex: 1, padding: '12px', borderRadius: '14px',
                  background: matchData.pricingType === 'split' ? 'rgba(34, 197, 94, 0.1)' : 'var(--surface)',
                  border: matchData.pricingType === 'split' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  color: matchData.pricingType === 'split' ? 'var(--primary)' : 'var(--secondary)',
                  fontWeight: '700', fontSize: '12px'
                }}
              >DIVIDIDO</button>
              <button
                type="button"
                onClick={() => setMatchData({...matchData, pricingType: 'fixed'})}
                style={{
                  flex: 1, padding: '12px', borderRadius: '14px',
                  background: matchData.pricingType === 'fixed' ? 'rgba(34, 197, 94, 0.1)' : 'var(--surface)',
                  border: matchData.pricingType === 'fixed' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  color: matchData.pricingType === 'fixed' ? 'var(--primary)' : 'var(--secondary)',
                  fontWeight: '700', fontSize: '12px'
                }}
              >VALOR FIXO</button>
            </div>
            {matchData.pricingType === 'fixed' && (
              <input 
                type="number"
                placeholder="Valor Individual (R$)"
                value={matchData.fixedPrice}
                onChange={e => setMatchData({...matchData, fixedPrice: e.target.value})}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
              />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)' }}>Preço Final (Travar Manualmente)</label>
            <input 
              type="text"
              placeholder="Ex: 25.00"
              value={matchData.price}
              onChange={e => setMatchData({...matchData, price: e.target.value})}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
            <p style={{ fontSize: '11px', color: 'var(--secondary)' }}>Se preenchido, este valor aparecerá para todos, ignorando cálculos.</p>
          </div>
        </div>

        <button 
          disabled={saving}
          type="submit"
          style={{ 
            width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--primary)', color: 'black', fontWeight: '800', fontSize: '1.1rem',
            boxShadow: '0 4px 20px var(--primary-glow)', opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
        </button>
      </form>
    </div>
  );
}
