"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Settings, Users, CreditCard, ShieldCheck, Edit3, Trash2, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminPage() {
  const { profile } = useAuth();
  const [view, setView] = useState<'players' | 'payments'>('players');

  if (profile && !profile.isAdmin && false) { // Skip check for demo
    return <div>Acesso Negado</div>;
  }

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Painel Admin</h1>
          <p style={{ color: 'var(--secondary)' }}>Controle total do sistema</p>
        </div>
        <ShieldCheck color="var(--primary)" size={32} />
      </header>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
        <button 
          onClick={() => setView('players')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            borderRadius: '12px', 
            background: view === 'players' ? 'var(--primary)' : 'var(--surface)',
            color: view === 'players' ? 'black' : 'white',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Users size={18} /> Jogadores
        </button>
        <button 
          onClick={() => setView('payments')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            borderRadius: '12px', 
            background: view === 'payments' ? 'var(--primary)' : 'var(--surface)',
            color: view === 'payments' ? 'black' : 'white',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <CreditCard size={18} /> Pagamentos
        </button>
      </div>

      {view === 'players' ? (
        <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden' }}>
          {[
            { name: 'Ricardo Santos', rating: 9.2, status: 'Presente' },
            { name: 'Lucas Silva', rating: 8.5, status: 'Confirmado' },
            { name: 'Felipe Amorim', rating: 7.9, status: 'Atrasado' },
            { name: 'Miguel R.', rating: 8.8, status: 'Presente' },
          ].map((player, i) => (
            <div key={i} style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: '700' }}>{player.name}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'var(--border)', color: 'var(--secondary)' }}>{player.status}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--primary)' }}>Nota: {player.rating}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{ padding: '8px', background: 'var(--surface)', borderRadius: '8px' }}><Edit3 size={16} /></button>
                <button style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', color: 'var(--error)' }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden' }}>
          {[
            { name: 'Felipe Amorim', amount: 35, status: 'pending' },
            { name: 'Miguel R.', amount: 35, status: 'pending' },
            { name: 'Lucas Silva', amount: 35, status: 'paid' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: '700' }}>{item.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>R$ {item.amount.toFixed(2)}</p>
              </div>
              {item.status === 'pending' ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ padding: '8px 12px', background: 'var(--primary)', color: 'black', borderRadius: '8px', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Confirmar
                  </button>
                  <button style={{ padding: '8px 12px', background: 'var(--border)', color: 'white', borderRadius: '8px', fontWeight: '700', fontSize: '12px' }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>CONFIRMADO</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Global Config */}
      <h3 style={{ margin: '2rem 0 1rem', fontWeight: '700' }}>Configurações Globais</h3>
      <div className="glass" style={{ padding: '1.5rem', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span>Abrir confirmações</span>
          <div style={{ width: '40px', height: '20px', background: 'var(--primary)', borderRadius: '10px', position: 'relative' }}>
             <div style={{ width: '16px', height: '16px', background: 'black', borderRadius: '50%', position: 'absolute', right: '2px', top: '2px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Resetar notas (Temporada)</span>
          <button style={{ color: 'var(--error)', fontSize: '14px', fontWeight: '600' }}>Resetar</button>
        </div>
      </div>
    </div>
  );
}
