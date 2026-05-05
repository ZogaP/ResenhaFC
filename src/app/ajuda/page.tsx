"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FolderPlus, Share2, Copy, CheckCircle2, ExternalLink, HelpCircle, Info, TrendingUp, Shield, Sparkles, Star, Users } from 'lucide-react';

export default function AjudaPage() {
  const [tab, setTab] = React.useState<'media' | 'evolution'>('media');
  const driveLink = "https://drive.google.com/drive/u/2/folders/1mASCucMKFGRPGoRbeGcpQAKHamyAbGXQ";

  const steps = [
    {
      title: "Crie sua Pasta",
      description: "Acesse o link do Google Drive e crie uma nova pasta com o seu NOME COMPLETO. Isso ajuda a organizar os arquivos de cada jogador.",
      icon: <FolderPlus size={24} />,
      color: "#3b82f6"
    },
    {
      title: "Suba suas Mídias",
      description: "Dentro da sua pasta, coloque sua foto de perfil ou o vídeo do seu melhor lance. Certifique-se de que o arquivo terminou de carregar.",
      icon: <CheckCircle2 size={24} />,
      color: "#10b981"
    },
    {
      title: "Copie o Link",
      description: "Clique com o botão direito no arquivo (ou nos três pontinhos), vá em 'Compartilhar' e clique em 'Copiar link'. Certifique-se de que o acesso está como 'Qualquer pessoa com o link'.",
      icon: <Share2 size={24} />,
      color: "#a855f7"
    },
    {
      title: "Cole no Perfil",
      description: "Volte aqui no aplicativo, acesse seu perfil, clique em 'Editar Foto' ou 'Novo Lance' e cole o link que você copiou do Google Drive.",
      icon: <Copy size={24} />,
      color: "#f59e0b"
    }
  ];

  const evolutionRules = [
    {
      title: "Como eu evoluo?",
      desc: "Suas notas nas peladas definem seu crescimento. Jogadores com Overall baixo (Bronze) evoluem mais rápido (até +5 pontos por jogo). Já os craques (Ouro/TOTY) evoluem mais devagar (aprox. +1 ponto) e precisam manter a média alta para não cair.",
      icon: <TrendingUp size={24} color="var(--primary)" />,
      badge: "CRESCIMENTO"
    },
    {
      title: "Métrica do Sorteio",
      desc: "O sorteio não é sorte! O sistema usa 'Ondas Táticas': primeiro distribui os Goleiros, depois as Muralhas (defesa forte), os Maestros (passe) e os Finalizadores. Assim, nenhum time fica sem uma espinha dorsal equilibrada.",
      icon: <Users size={24} color="#3b82f6" />,
      badge: "EQUILÍBRIO"
    },
    {
      title: "Boost de Sequência",
      desc: "Se você for um dos 3 melhores (INFORM) em duas peladas seguidas, você ganha um 'Boost de Estrela' de +1 no Overall. É o prêmio por ser o dono do jogo por várias semanas!",
      icon: <Star size={24} color="#fbbf24" />,
      badge: "ESTRELA"
    },
    {
      title: "Habilidades Especiais",
      desc: "Ao atingir o nível Prata (OVR 66+), você desbloqueia habilidades baseadas nos seus atributos. Se um atributo chegar a 85, você ganha a versão 'PLUS' (Dourada), que destaca sua dominância naquele fundamento.",
      icon: <Sparkles size={24} color="#a855f7" />,
      badge: "PLAYSTYLES"
    }
  ];

  return (
    <div className="fade-in container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '2rem', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <HelpCircle size={28} color="var(--primary)" />
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Central de Ajuda</h1>
        </div>
        <p style={{ color: 'var(--secondary)' }}>Aprenda a dominar o LineUp</p>
      </header>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        background: 'rgba(255,255,255,0.05)', 
        padding: '6px', 
        borderRadius: '16px', 
        marginBottom: '2rem',
        gap: '6px'
      }}>
        <button 
          onClick={() => setTab('media')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            borderRadius: '12px', 
            background: tab === 'media' ? 'var(--primary)' : 'transparent',
            color: tab === 'media' ? 'black' : 'var(--secondary)',
            fontWeight: '800',
            fontSize: '13px',
            transition: 'all 0.3s ease'
          }}
        >
          FOTOS E VÍDEOS
        </button>
        <button 
          onClick={() => setTab('evolution')}
          style={{ 
            flex: 1, 
            padding: '12px', 
            borderRadius: '12px', 
            background: tab === 'evolution' ? 'var(--primary)' : 'transparent',
            color: tab === 'evolution' ? 'black' : 'var(--secondary)',
            fontWeight: '800',
            fontSize: '13px',
            transition: 'all 0.3s ease'
          }}
        >
          EVOLUÇÃO E CARTAS
        </button>
      </div>

      {tab === 'media' ? (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} color="var(--primary)" /> Tutorial: Google Drive
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
            {steps.map((step, index) => (
              <div key={index} className="glass" style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                <div style={{ background: `${step.color}20`, padding: '12px', borderRadius: '16px', color: step.color }}>
                  {step.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '6px' }}>
                    {index + 1}. {step.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6', fontWeight: '500' }}>
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <a href={driveLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', gap: '10px' }}>
              <ExternalLink size={20} /> ABRIR PASTA DO DRIVE
            </a>
          </div>
        </motion.section>
      ) : (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--primary)" /> Sistema de Evolução
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {evolutionRules.map((rule, index) => (
              <div key={index} className="glass" style={{ padding: '1.5rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '12px', right: '15px', fontSize: '10px', fontWeight: '900', color: 'var(--primary)', opacity: 0.5 }}>
                  {rule.badge}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  {rule.icon}
                  <h3 style={{ fontWeight: '800', fontSize: '1.1rem' }}>{rule.title}</h3>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--secondary)', lineHeight: '1.5', fontWeight: '500' }}>
                  {rule.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
