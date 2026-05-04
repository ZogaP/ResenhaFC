"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Calendar, Clock, MapPin, DollarSign, Users, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NovaPartidaPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [matchData, setMatchData] = useState({
    location: '',
    address: '',
    date: '',
    time: '',
    timeEnd: '',
    totalCost: '',
    maxPlayers: '20',
    description: ''
  });

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.push('/');
    }
  }, [profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'matches'), {
        ...matchData,
        price: 0,
        isClosed: false,
        createdBy: user.uid,
        status: 'scheduled',
        participants: [],
        invitations: [],
        createdAt: serverTimestamp()
      });
      alert("Partida criada com sucesso!");
      router.push('/');
    } catch (error) {
      console.error(error);
      alert("Erro ao criar partida.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => router.back()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px' }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Nova Partida</h1>
          <p style={{ color: 'var(--secondary)' }}>Configure o próximo jogo</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
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
              <MapPin size={16} /> Endereço Completo (Opcional)
            </label>
            <input 
              placeholder="Rua, Número, Bairro..."
              value={matchData.address}
              onChange={e => setMatchData({...matchData, address: e.target.value})}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
          </div>

          {/* Map Preview */}
          {(matchData.address.length > 5 || matchData.location.length > 3) && (
            <div style={{ width: '100%', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <iframe 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                srcDoc={`
                  <style>body{margin:0;overflow:hidden;}iframe{border:0;width:100%;height:100%;}</style>
                  <iframe src="https://maps.google.com/maps?q=${encodeURIComponent(matchData.address || matchData.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed"></iframe>
                `}
              ></iframe>
            </div>
          )}

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
                  // Simple mask for DD/MM/YYYY
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
                <DollarSign size={16} /> Custo da Quadra (Total)
              </label>
              <input 
                required
                type="number"
                placeholder="300,00"
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)' }}>Observações</label>
            <textarea 
              placeholder="Ex: Levar chuteira de society..."
              value={matchData.description}
              onChange={e => setMatchData({...matchData, description: e.target.value})}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white', minHeight: '80px' }}
            />
          </div>
        </div>

        <button 
          disabled={loading}
          type="submit"
          style={{ 
            width: '100%', 
            padding: '16px', 
            borderRadius: '16px', 
            background: 'var(--primary)', 
            color: 'black', 
            fontWeight: '800', 
            fontSize: '1.1rem',
            boxShadow: '0 4px 20px var(--primary-glow)',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'CRIANDO...' : 'CRIAR PARTIDA'}
        </button>
      </form>
    </div>
  );
}
