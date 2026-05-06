"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles } from 'lucide-react';
import { getCardType, getCardVisuals, getStyleMetadata, getPlayStyleMetadata, type CardVariant, type PlayerStyle, type PlayStyle } from '@/lib/evolution';

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
  variant?: CardVariant;
  playStyle?: PlayerStyle;
  playStyles?: PlayStyle[];
}

export default function PlayerCard({ name, overall, position, attributes, photoURL, size = 'md', variant, playStyle, playStyles }: PlayerCardProps) {
  const cardType = variant || getCardType(overall);
  const style = getCardVisuals(cardType);
  const scale = size === 'sm' ? 0.6 : size === 'lg' ? 1.2 : 1;

  const isSpecial = cardType === 'toty' || cardType === 'inform';

  return (
    <motion.div
      whileHover={{ y: -5 }}
      style={{
        width: `${240 * scale}px`,
        height: `${340 * scale}px`,
        background: style.bg,
        borderRadius: '20px',
        position: 'relative',
        padding: `${16 * scale}px`,
        boxShadow: `0 15px 35px ${style.glow}, ${isSpecial ? `0 0 30px ${style.glow}` : 'none'}`,
        display: 'flex',
        flexDirection: 'column',
        color: style.text,
        overflow: 'hidden',
        border: `2px solid ${style.border}88`,
        zIndex: 1
      }}
    >
      {/* Shimmer effect for TOTY */}
      {cardType === 'toty' && (
        <div style={{
          position: 'absolute', top: 0, left: '-100%', width: '200%', height: '100%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.08) 50%, transparent 100%)',
          animation: 'shimmer 3s infinite',
          pointerEvents: 'none', zIndex: 0
        }} />
      )}

      {/* INFORM badge */}
      {cardType === 'inform' && (
        <div style={{
          position: 'absolute', top: `${10 * scale}px`, right: `${10 * scale}px`,
          background: '#FFD700', color: '#000', fontWeight: '900',
          fontSize: `${0.7 * scale}rem`, padding: `${3 * scale}px ${8 * scale}px`,
          borderRadius: '6px', letterSpacing: '1px', zIndex: 5
        }}>
          IF
        </div>
      )}

      {/* TOTY badge */}
      {cardType === 'toty' && (
        <div style={{
          position: 'absolute', top: `${10 * scale}px`, right: `${10 * scale}px`,
          fontSize: `${1.2 * scale}rem`, zIndex: 5
        }}>
          ⭐
        </div>
      )}

      {/* Rating & Position */}
      <div style={{ marginBottom: `${10 * scale}px`, position: 'relative', zIndex: 2 }}>
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
        marginBottom: `${10 * scale}px`,
        position: 'relative', zIndex: 2
      }}>
        {photoURL ? (
          <div style={{
            width: `${110 * scale}px`,
            height: `${110 * scale}px`,
            borderRadius: '50%',
            overflow: 'hidden',
            border: `3px solid ${style.border}`,
            boxShadow: `0 5px 15px rgba(0,0,0,0.3), ${isSpecial ? `0 0 20px ${style.glow}` : 'none'}`,
            background: 'rgba(255,255,255,0.1)'
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoURL}
              alt={name || "Player photo"}
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <Shield size={90 * scale} strokeWidth={1} style={{ opacity: 0.2 }} />
        )}
      </div>

      {/* PlayStyles Row */}
      {playStyles && playStyles.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: `${6 * scale}px`,
          marginBottom: `${8 * scale}px`,
          position: 'relative', zIndex: 2
        }}>
          {playStyles.map((ps, idx) => (
            <div 
              key={idx}
              title={getPlayStyleMetadata(ps.id).label}
              style={{
                width: `${24 * scale}px`,
                height: `${24 * scale}px`,
                background: ps.plus ? 'linear-gradient(135deg, #FFD700 0%, #B8860B 100%)' : 'rgba(0,0,0,0.3)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${1 * scale}rem`,
                border: ps.plus ? '1px solid #FFF' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: ps.plus ? '0 0 10px rgba(255,215,0,0.5)' : 'none',
                position: 'relative'
              }}
            >
              {getPlayStyleMetadata(ps.id).icon}
              {ps.plus && (
                <div style={{ position: 'absolute', top: '-4px', right: '-4px' }}>
                  <Sparkles size={10 * scale} color="white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Player Name & Style Badge */}
      <div style={{
        textAlign: 'center',
        borderBottom: `1px solid ${style.text}33`,
        marginBottom: `${12 * scale}px`,
        paddingBottom: `${8 * scale}px`,
        position: 'relative', zIndex: 2
      }}>
        <h3 style={{
          fontSize: `${1.1 * scale}rem`,
          fontWeight: '800',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          margin: `0 0 ${4 * scale}px 0`
        }}>{name}</h3>
        
        {playStyle && getStyleMetadata(playStyle) && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: `${4 * scale}px`,
            background: getStyleMetadata(playStyle).color + '22',
            color: style.text,
            padding: `${2 * scale}px ${8 * scale}px`,
            borderRadius: '10px',
            fontSize: `${0.65 * scale}rem`,
            fontWeight: '900',
            border: `1px solid ${getStyleMetadata(playStyle).color}44`,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <span>{getStyleMetadata(playStyle).icon}</span>
            <span>{getStyleMetadata(playStyle).label}</span>
          </div>
        )}
      </div>

      {/* Attributes Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: `${4 * scale}px ${16 * scale}px`,
        fontSize: `${0.75 * scale}rem`,
        fontWeight: '700',
        lineHeight: 1.2,
        position: 'relative', zIndex: 2
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

      {/* Card Type Label */}
      <div style={{
        position: 'absolute',
        bottom: '6px',
        left: '0',
        width: '100%',
        textAlign: 'center',
        fontSize: `${0.55 * scale}rem`,
        fontWeight: '900',
        opacity: 0.3,
        letterSpacing: '3px',
        zIndex: 2
      }}>
        LINEUP
      </div>
    </motion.div>
  );
}
