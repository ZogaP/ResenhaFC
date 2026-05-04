"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { clsx } from 'clsx';

interface PlayerCardProps {
  name: string;
  overall: number;
  position: string;
  attributes: {
    velocidade: number;
    finalizacao: number;
    passe: number;
    drible?: number;
    defesa: number;
    fisico: number;
    elasticidade?: number;
    manejo?: number;
    reflexo?: number;
    posicionamento?: number;
  };
  photoURL?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function PlayerCard({ name, overall, position, attributes, photoURL, size = 'md' }: PlayerCardProps) {
  const getCardType = (ovr: number) => {
    if (ovr >= 91) return 'legendary';
    if (ovr >= 76) return 'gold';
    if (ovr >= 61) return 'silver';
    return 'bronze';
  };

  const cardType = getCardType(overall);

  const colors = {
    legendary: { bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', text: '#000', border: '#FFF', glow: 'rgba(255, 215, 0, 0.5)' },
    gold: { bg: 'linear-gradient(135deg, #fceabb 0%, #f8b500 100%)', text: '#3d2b00', border: '#d4af37', glow: 'rgba(212, 175, 55, 0.3)' },
    silver: { bg: 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)', text: '#fff', border: '#bdc3c7', glow: 'rgba(189, 195, 199, 0.2)' },
    bronze: { bg: 'linear-gradient(135deg, #8e5431 0%, #4a2c1a 100%)', text: '#fff', border: '#8e5431', glow: 'rgba(142, 84, 49, 0.2)' },
  };

  const currentStyle = colors[cardType];

  const scale = size === 'sm' ? 0.6 : size === 'lg' ? 1.2 : 1;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      style={{
        width: `${240 * scale}px`,
        height: `${340 * scale}px`,
        background: currentStyle.bg,
        borderRadius: '20px',
        position: 'relative',
        padding: `${16 * scale}px`,
        boxShadow: `0 15px 35px ${currentStyle.glow}`,
        display: 'flex',
        flexDirection: 'column',
        color: currentStyle.text,
        overflow: 'hidden', // Garante que nada saia do card
        border: `1px solid ${currentStyle.border}44`,
        zIndex: 1
      }}
    >
      {/* Rating & Position - Flow layout */}
      <div style={{ marginBottom: `${10 * scale}px` }}>
        <div style={{ fontSize: `${2.2 * scale}rem`, fontWeight: '900', lineHeight: 1 }}>{overall}</div>
        <div style={{ fontSize: `${0.9 * scale}rem`, fontWeight: '700', opacity: 0.8 }}>{position}</div>
      </div>

      {/* Player Image */}
      <div style={{ 
        width: '100%', 
        height: `${130 * scale}px`, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: `${10 * scale}px`
      }}>
        {photoURL ? (
          <div style={{
            width: `${110 * scale}px`,
            height: `${110 * scale}px`,
            borderRadius: '50%',
            overflow: 'hidden',
            border: `3px solid ${currentStyle.border}`,
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
            background: 'rgba(255,255,255,0.1)'
          }}>
            <img 
              src={photoURL} 
              alt={name} 
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
        ) : (
           <Shield size={90 * scale} strokeWidth={1} style={{ opacity: 0.2 }} />
        )}
      </div>

      {/* Player Name */}
      <div style={{ 
        textAlign: 'center', 
        borderBottom: `1px solid ${currentStyle.text}33`, 
        marginBottom: `${12 * scale}px`,
        paddingBottom: `${4 * scale}px`
      }}>
        <h3 style={{ 
          fontSize: `${1.1 * scale}rem`, 
          fontWeight: '800', 
          textTransform: 'uppercase', 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          margin: 0
        }}>{name}</h3>
      </div>

      {/* Attributes Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: `${4 * scale}px ${16 * scale}px`,
        fontSize: `${0.75 * scale}rem`,
        fontWeight: '700',
        lineHeight: 1.2
      }}>
        {position === 'GOL' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>ELA</span> <span>{attributes.elasticidade || 50}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>VEL</span> <span>{attributes.velocidade}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>MAN</span> <span>{attributes.manejo || 50}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>PAS</span> <span>{attributes.passe}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>REF</span> <span>{attributes.reflexo || 50}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>POS</span> <span>{attributes.posicionamento || 50}</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>VEL</span> <span>{attributes.velocidade}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>DRI</span> <span>{attributes.drible || 50}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>FIN</span> <span>{attributes.finalizacao}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>DEF</span> <span>{attributes.defesa}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>PAS</span> <span>{attributes.passe}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ opacity: 0.6 }}>FIS</span> <span>{attributes.fisico}</span>
            </div>
          </>
        )}
      </div>
      
      {/* Footer Decoration */}
      <div style={{ 
        position: 'absolute', 
        bottom: '6px', 
        left: '0', 
        width: '100%',
        textAlign: 'center',
        fontSize: `${0.55 * scale}rem`,
        fontWeight: '900',
        opacity: 0.3,
        letterSpacing: '3px'
      }}>
        PELADA VIP
      </div>
    </motion.div>
  );
}
