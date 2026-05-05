"use client";

import React from 'react';
import Link from 'next/link';
import { HelpCircle, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { profile } = useAuth();

  return (
    <header className="fixed-header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 20px'
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <h1 className="logo-text">
          LineUp
        </h1>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {profile && (
          <Link href={`/perfil/${profile.uid}`} style={{ 
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '2px solid var(--primary)',
            background: 'var(--surface)'
          }}>
            <img 
              src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} 
              alt="" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Link>
        )}
      </div>
    </header>
  );
}
