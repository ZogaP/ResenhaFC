"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { User, Shield, Zap, Target, Activity, Send, Globe, Lock } from 'lucide-react';

const POSITIONS = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'CA'];

import { PlayerPosition } from '@/context/AuthContext';

export default function SetupProfilePage() {
  const { user, profile, setProfile } = useAuth();
  const router = useRouter();
  const [position, setPosition] = useState<PlayerPosition>('MEI');
  const [firstName, setFirstName] = useState((profile as any)?.firstName || '');
  const [lastName, setLastName] = useState((profile as any)?.lastName || '');
  const [secondaryPosition, setSecondaryPosition] = useState<PlayerPosition | 'NENHUMA'>('NENHUMA');
  const [personalData, setPersonalData] = useState({
    birthDate: '',
    altura: '',
    chuteira: '',
    peso: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState<'publico' | 'privado'>('publico');

  // Sync state with profile data when it loads
  React.useEffect(() => {
    if (profile) {
      if (profile.firstName) setFirstName(profile.firstName);
      if (profile.lastName) setLastName(profile.lastName);
      if (profile.position) setPosition(profile.position);
      if (profile.secondaryPosition) setSecondaryPosition(profile.secondaryPosition);
      if (profile.profileVisibility) setProfileVisibility(profile.profileVisibility);
      
      setPersonalData({
        birthDate: profile.birthDate || '',
        altura: String(profile.altura || ''),
        chuteira: String(profile.chuteira || ''),
        peso: String(profile.peso || '')
      });
    }
  }, [profile]);

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
    console.log("Iniciando handleSave...");
    if (!user) {
      alert("Erro: Usuário não autenticado. Por favor, faça login novamente.");
      return;
    }

    setIsSaving(true);
    try {
      console.log("Preparando dados do perfil...");
      const fName = String(firstName || "").trim();
      const lName = String(lastName || "").trim();
      const fullName = `${fName} ${lName}`.trim() || user.displayName || "Jogador";
      
      const updatedData: any = {
        uid: user.uid,
        name: fullName,
        firstName: fName,
        lastName: lName,
        position: position || 'MEI',
        attributes: getInitialAttributes(position || 'MEI'),
        overall: 50,
        profileSetup: true,
        birthDate: personalData.birthDate || '',
        altura: Number(personalData.altura) || 0,
        chuteira: Number(personalData.chuteira) || 0,
        peso: Number(personalData.peso) || 0,
        profileVisibility: profileVisibility || 'publico',
        hasInitialRating: false,
        updatedAt: new Date().toISOString()
      };

      if (secondaryPosition && secondaryPosition !== 'NENHUMA') {
        updatedData.secondaryPosition = secondaryPosition;
      }

      console.log("Enviando para o Firestore:", updatedData);
      const userRef = doc(db, 'users', user.uid);
      
      await setDoc(userRef, updatedData, { merge: true });
      console.log("Firestore atualizado com sucesso!");
      
      if (profile) {
        setProfile({ ...profile, ...updatedData });
      }

      alert("Configurações salvas!");
      router.push('/');
    } catch (error: any) {
      console.error("ERRO AO SALVAR PERFIL:", error);
      alert("Erro ao salvar: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fade-in" style={{ padding: '20px', paddingBottom: '100px' }}>
      <header style={{ marginBottom: '2.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <img src="/logo.png" alt="LineUp" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)', lineHeight: 1 }}>Configurações</h1>
          <p style={{ color: 'var(--secondary)', marginTop: '4px' }}>Gerencie sua conta e ficha técnica</p>
        </div>
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

      <section className="glass" style={{ padding: '20px', borderRadius: '24px', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={20} color="var(--secondary)" /> Posição Secundária (Opcional)
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--secondary)', marginBottom: '1rem' }}>
          Usada para balancear os times no sorteio se necessário.
        </p>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px' }}>
          <button
            onClick={() => setSecondaryPosition('NENHUMA')}
            style={{
              flex: '0 0 auto',
              padding: '10px 20px',
              borderRadius: '12px',
              background: secondaryPosition === 'NENHUMA' ? 'var(--secondary)' : 'var(--surface)',
              color: secondaryPosition === 'NENHUMA' ? 'black' : 'var(--secondary)',
              fontWeight: '700',
              border: '1px solid var(--border)'
            }}
          >
            NENHUMA
          </button>
          {POSITIONS.filter(p => p !== position).map(pos => (
            <button
              key={pos}
              onClick={() => setSecondaryPosition(pos as PlayerPosition)}
              style={{
                flex: '0 0 auto',
                padding: '10px 20px',
                borderRadius: '12px',
                background: secondaryPosition === pos ? 'var(--primary)' : 'var(--surface)',
                color: secondaryPosition === pos ? 'black' : 'var(--secondary)',
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
          <Activity size={20} color="var(--primary)" /> Habilidades
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--secondary)', marginBottom: '1rem' }}>
          Sua evolução técnica atual.
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

      {/* Privacy Section */}
      <section className="glass" style={{ padding: '20px', borderRadius: '24px', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {profileVisibility === 'publico' ? <Globe size={20} color="var(--primary)" /> : <Lock size={20} color="var(--warning)" />} Privacidade
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--secondary)', marginBottom: '1rem', lineHeight: '1.5' }}>
          Escolha quem pode ver suas estatísticas, lances e atributos. Você pode mudar isso depois.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setProfileVisibility('publico')}
            style={{
              flex: 1, padding: '14px', borderRadius: '14px',
              background: profileVisibility === 'publico' ? 'rgba(34, 197, 94, 0.15)' : 'var(--surface)',
              border: profileVisibility === 'publico' ? '2px solid var(--primary)' : '1px solid var(--border)',
              color: profileVisibility === 'publico' ? 'var(--primary)' : 'var(--secondary)',
              fontWeight: '800', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Globe size={14} /> PÚBLICO
          </button>
          <button
            type="button"
            onClick={() => setProfileVisibility('privado')}
            style={{
              flex: 1, padding: '14px', borderRadius: '14px',
              background: profileVisibility === 'privado' ? 'rgba(245, 158, 11, 0.15)' : 'var(--surface)',
              border: profileVisibility === 'privado' ? '2px solid var(--warning)' : '1px solid var(--border)',
              color: profileVisibility === 'privado' ? 'var(--warning)' : 'var(--secondary)',
              fontWeight: '800', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Lock size={14} /> PRIVADO
          </button>
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
        {isSaving ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
        <Send size={20} />
      </button>
    </div>
  );
}
