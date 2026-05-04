"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FolderPlus, Share2, Copy, CheckCircle2, ExternalLink, HelpCircle, Info } from 'lucide-react';

export default function AjudaPage() {
  const driveLink = "https://drive.google.com/drive/u/2/folders/1mASCucMKFGRPGoRbeGcpQAKHamyAbGXQ";

  const steps = [
    {
      title: "Crie sua Pasta",
      description: "Acesse o link do Google Drive e crie uma nova pasta com o seu NOME COMPLETO. Isso ajuda a organizar os arquivos de cada jogador.",
      icon: <FolderPlus size={24} className="text-blue-400" />,
      color: "#3b82f6"
    },
    {
      title: "Suba suas Mídias",
      description: "Dentro da sua pasta, coloque sua foto de perfil ou o vídeo do seu melhor lance. Certifique-se de que o arquivo terminou de carregar.",
      icon: <CheckCircle2 size={24} className="text-green-400" />,
      color: "#10b981"
    },
    {
      title: "Copie o Link",
      description: "Clique com o botão direito no arquivo (ou nos três pontinhos), vá em 'Compartilhar' e clique em 'Copiar link'. Certifique-se de que o acesso está como 'Qualquer pessoa com o link'.",
      icon: <Share2 size={24} className="text-purple-400" />,
      color: "#a855f7"
    },
    {
      title: "Cole no Perfil",
      description: "Volte aqui no aplicativo, acesse seu perfil, clique em 'Editar Foto' ou 'Novo Lance' e cole o link que você copiou do Google Drive.",
      icon: <Copy size={24} className="text-yellow-400" />,
      color: "#f59e0b"
    }
  ];

  return (
    <div className="fade-in container" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '2.5rem', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <HelpCircle size={28} color="var(--primary)" />
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Central de Ajuda</h1>
        </div>
        <p style={{ color: 'var(--secondary)' }}>Aprenda a personalizar seu perfil e lances</p>
      </header>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={18} color="var(--primary)" /> Tutorial: Fotos e Vídeos
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass" 
              style={{ padding: '1.5rem', borderRadius: '24px', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}
            >
              <div style={{ 
                background: `${step.color}20`, 
                padding: '12px', 
                borderRadius: '16px', 
                color: step.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {step.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--primary)', marginRight: '8px' }}>{index + 1}.</span> {step.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6', fontWeight: '500' }}>
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div style={{ textAlign: 'center' }}>
        <a 
          href={driveLink} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '12px', 
            background: 'var(--primary)', 
            color: 'black', 
            padding: '18px 30px', 
            borderRadius: '20px', 
            fontWeight: '900', 
            fontSize: '15px',
            textDecoration: 'none',
            boxShadow: '0 10px 25px var(--primary-glow)'
          }}
        >
          <ExternalLink size={20} /> ABRIR PASTA DO DRIVE
        </a>
        <p style={{ marginTop: '1.2rem', fontSize: '12px', color: 'var(--secondary)', fontWeight: '600' }}>
          O link abrirá em uma nova aba do seu navegador.
        </p>
      </div>
    </div>
  );
}
