"use client";

import React from 'react';
import LancesFeed from '@/components/LancesFeed';

export default function LancesPage() {
  return (
    <div className="fade-in" style={{ paddingBottom: '100px' }}>
      <React.Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--primary)' }}>Carregando Feed Social...</div>}>
        <LancesFeed isSocial={true} />
      </React.Suspense>
    </div>
  );
}
