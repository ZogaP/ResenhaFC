"use client";

import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      setError('Credenciais inválidas ou erro no sistema.');
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (err) {
      setError('Erro ao entrar com Google.');
    }
  };

  return (
    <div className="fade-in" style={{ padding: '2rem 0' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={{ 
            width: '80px', 
            height: '80px', 
            background: 'var(--primary)', 
            borderRadius: '20px',
            margin: '0 auto 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px var(--primary-glow)'
          }}
        >
          <LogIn size={40} color="white" />
        </motion.div>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-1px' }}>Show de Resenha FC</h1>
        <p style={{ color: 'var(--secondary)', marginTop: '0.5rem' }}>Entre para entrar em campo</p>
      </header>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Mail style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)' }} size={20} />
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              borderRadius: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'white',
              outline: 'none'
            }}
            required
          />
        </div>

        <div style={{ position: 'relative' }}>
          <Lock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)' }} size={20} />
          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              borderRadius: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'white',
              outline: 'none'
            }}
            required
          />
        </div>

        {error && <p style={{ color: 'var(--error)', fontSize: '14px', textAlign: 'center' }}>{error}</p>}

        <button
          type="submit"
          style={{
            background: 'var(--primary)',
            color: 'black',
            fontWeight: '700',
            padding: '16px',
            borderRadius: '12px',
            marginTop: '1rem',
            fontSize: '1rem'
          }}
        >
          Entrar
        </button>
      </form>

      <div style={{ margin: '2rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ color: 'var(--secondary)', fontSize: '12px' }}>OU</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      <button
        onClick={handleGoogleLogin}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          background: 'white',
          color: 'black',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="Google" />
        Entrar com Google
      </button>

      <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--secondary)' }}>
        Não tem conta? <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: '600' }}>Cadastre-se</Link>
      </p>
    </div>
  );
}
