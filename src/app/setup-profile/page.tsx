"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { User, Shield, Zap, Target, Activity, Send } from 'lucide-react';

const POSITIONS = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'CA'];

import { PlayerPosition } from '@/context/AuthContext';

export default function SetupProfilePage() {
  const { user, profile, setProfile } = useAuth();
  const router = useRouter();
  const [position, setPosition] = useState<PlayerPosition>('MEI');
  const [firstName, setFirstName] = useState((profile as any)?.firstName || '');
  const [lastName, setLastName] = useState((profile as any)?.lastName || '');
  const [personalData, setPersonalData] = useState({
    birthDate: '',
    altura: '',
    chuteira: '',
    peso: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const getInitialAttributes = (pos: PlayerPosition) => {
    const base = { velocidade: 50, finalizacao: 50, passe: 50, drible: 50, defesa: 50, fisico: 50 };
    if (pos === 'GOL') {
      return { 
        ...base, 
        elasticidade: 50, manejo: 50, reflexo: 50, posicionamento: 50,
        velocidade: 40, finalizacao: 20
      };
    }
    return base;
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const updatedData = {
        name: fullName,
        firstName,
        lastName,
        position,
        attributes: getInitialAttributes(position),
        overall: 50,
        profileSetup: true,
        birthDate: personalData.birthDate,
        altura: parseInt(personalData.altura) || 0,
        chuteira: parseInt(personalData.chuteira) || 0,
        peso: parseInt(personalData.peso) || 0
      };

      await updateDoc(doc(db, 'users', user.uid), updatedData);
      
      if (profile) {
        setProfile({ ...profile, ...updatedData });
      }

      router.push('/');
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fade-in" style={{ padding: '20px', paddingBottom: '100px' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)' }}>Cadastro de Atleta</h1>
        <p style={{ color: 'var(--secondary)' }}>Complete sua ficha técnica</p>
      </header>

      {/* Personal Info */}
      <section className="glass" style={{ padding: '20px', borderRadius: '24px', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} color="var(--primary)" /> Identificação
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>NOME</label>
            <input 
              type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>SOBRENOME</label>
            <input 
              type="text" value={lastName} onChange={e => setLastName(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
          </div>
        </div>

        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="var(--primary)" /> Dados Físicos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>DATA DE NASCIMENTO</label>
            <input 
              type="text"
              placeholder="DD/MM/AAAA"
              value={personalData.birthDate}
              onChange={e => {
                let val = e.target.value.replace(/\D/g, '');
                if (val.length > 8) val = val.slice(0, 8);
                if (val.length > 4) val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4);
                else if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                setPersonalData(p => ({ ...p, birthDate: val }));
              }}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>TAM. CHUTEIRA</label>
            <input 
              type="number" value={personalData.chuteira} onChange={e => setPersonalData(p => ({ ...p, chuteira: e.target.value }))}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>ALTURA (CM)</label>
            <input 
              type="number" value={personalData.altura} onChange={e => setPersonalData(p => ({ ...p, altura: e.target.value }))}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>PESO (KG)</label>
            <input 
              type="number" value={personalData.peso} onChange={e => setPersonalData(p => ({ ...p, peso: e.target.value }))}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'white' }}
            />
          </div>
        </div>
      </section>

      <section className="glass" style={{ padding: '20px', borderRadius: '24px', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={20} color="var(--primary)" /> Posição
        </h3>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
          {POSITIONS.map(pos => (
            <button
              key={pos}
              onClick={() => setPosition(pos as PlayerPosition)}
              style={{
                flex: '0 0 auto',
                padding: '10px 20px',
                borderRadius: '12px',
                background: position === pos ? 'var(--primary)' : 'var(--surface)',
                color: position === pos ? 'black' : 'var(--secondary)',
                fontWeight: '700',
                border: '1px solid var(--border)'
              }}
            >
              {pos}
            </button>
          ))}
        </div>
      </section>

      <section className="glass" style={{ padding: '20px', borderRadius: '24px', marginBottom: '2rem', opacity: 0.8 }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="var(--primary)" /> Atributos Iniciais
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--secondary)', marginBottom: '1rem' }}>
          Habilidades fixas em 50. Evolua jogando!
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {Object.keys(getInitialAttributes(position)).map(attr => (
            <div key={attr} style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--secondary)', textTransform: 'uppercase' }}>{attr}</span>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>50</span>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={isSaving}
        style={{
          width: '100%',
          padding: '18px',
          borderRadius: '16px',
          background: 'var(--primary)',
          color: 'black',
          fontWeight: '900',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          boxShadow: '0 8px 25px var(--primary-glow)'
        }}
      >
        {isSaving ? 'Salvando...' : 'FINALIZAR CADASTRO'}
        <Send size={20} />
      </button>
    </div>
  );
}
