"use client";

import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (username.trim().length < 3) {
        setError('O nome de usuário deve ter pelo menos 3 caracteres.');
        return;
      }
      
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      
      // Check if username exists
      const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError('Este nome de usuário já está em uso. Escolha outro.');
        return;
      }

      const fullName = `${firstName} ${lastName}`.trim();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { 
        displayName: fullName,
        photoURL: photoURL 
      });

      // Initialize Firestore profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: fullName,
        firstName: firstName,
        lastName: lastName,
        email: email,
        photoURL: photoURL,
        overall: 50,
        attributes: {
          ataque: 50, defesa: 50, passe: 50, velocidade: 50, fisico: 50, finalizacao: 50,
        },
        isAdmin: false,
        totalGames: 0,
        confirmedGames: 0,
        position: 'MEI',
        profileSetup: false,
        username: cleanUsername,
        friends: [],
        friendRequests: [],
        highlights: []
      });

      router.push('/setup-profile');
    } catch (err: any) {
      setError('Erro ao criar conta. Tente outro e-mail.');
    }
  };

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2rem', paddingTop: '1rem' }}>
        <button onClick={() => router.back()} style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2rem' }}>
          <ArrowLeft size={20} /> Voltar
        </button>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-1px' }}>Criar Conta</h1>
        <p style={{ color: 'var(--secondary)', marginTop: '0.5rem' }}>Junte-se à nossa comunidade de craques</p>
      </header>

      <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontWeight: 'bold' }}>@</span>
          <input
            type="text"
            placeholder="Nome de usuário (único)"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              borderRadius: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--primary)',
              fontWeight: '800',
              outline: 'none'
            }}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <User style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)' }} size={20} />
            <input
              type="text"
              placeholder="Nome"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
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
            <input
              type="text"
              placeholder="Sobrenome"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 16px',
                borderRadius: '12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'white',
                outline: 'none'
              }}
              required
            />
          </div>
        </div>

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
          <User style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)' }} size={20} />
          <input
            type="text"
            placeholder="Link da sua Foto (opcional)"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            style={{
              width: '100%',
              padding: '16px 16px 16px 48px',
              borderRadius: '12px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'white',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <Lock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary)' }} size={20} />
          <input
            type="password"
            placeholder="Escolha uma senha"
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
            background: 'var(--primary-gradient)',
            color: 'black',
            fontWeight: '700',
            padding: '16px',
            borderRadius: '12px',
            marginTop: '1rem',
            fontSize: '1rem'
          }}
        >
          Criar minha conta
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--secondary)' }}>
        Já tem uma conta? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>Faça login</Link>
      </p>
    </div>
  );
}
