"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderPlus, Share2, Copy, CheckCircle2, ExternalLink, HelpCircle, 
  Info, TrendingUp, Shield, Sparkles, Star, Users, 
  UserPlus, Target, RefreshCw, Activity, Lock, Globe, Clock, Trophy
} from 'lucide-react';

type TabType = 'media' | 'evolution' | 'invites' | 'positions' | 'rotation' | 'live';

export default function AjudaPage() {
  const [tab, setTab] = useState<TabType>('media');
  const driveLink = "https://drive.google.com/drive/u/2/folders/1mASCucMKFGRPGoRbeGcpQAKHamyAbGXQ";

  const tabs: { id: TabType, label: string, icon: any }[] = [
    { id: 'media', label: 'MÍDIAS', icon: <FolderPlus size={16} /> },
    { id: 'evolution', label: 'CARTAS', icon: <Star size={16} /> },
    { id: 'invites', label: 'CONVITES', icon: <UserPlus size={16} /> },
    { id: 'positions', label: 'POSIÇÕES', icon: <Target size={16} /> },
    { id: 'rotation', label: 'ROTAÇÃO', icon: <RefreshCw size={16} /> },
    { id: 'live', label: 'LIVE', icon: <Activity size={16} /> },
  ];

  return (
    <div className="fade-in" style={{ paddingBottom: '100px' }}>
      <header style={{ marginBottom: '2rem', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <HelpCircle size={28} color="var(--primary)" />
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Central de Ajuda</h1>
        </div>
        <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>Tire suas dúvidas sobre o LineUp</p>
      </header>

      {/* Horizontal Scroll Tabs */}
      <div style={{ 
        display: 'flex', 
        overflowX: 'auto',
        background: 'rgba(255,255,255,0.05)', 
        padding: '8px', 
        borderRadius: '20px', 
        marginBottom: '2.5rem',
        gap: '8px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }} className="no-scrollbar">
        {tabs.map((t) => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ 
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 18px', 
              borderRadius: '14px', 
              background: tab === t.id ? 'var(--primary)' : 'transparent',
              color: tab === t.id ? 'black' : 'var(--secondary)',
              fontWeight: '900',
              fontSize: '11px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: tab === t.id ? 'none' : '1px solid rgba(255,255,255,0.05)'
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'media' && <MediaHelp driveLink={driveLink} />}
          {tab === 'evolution' && <EvolutionHelp />}
          {tab === 'invites' && <InvitesHelp />}
          {tab === 'positions' && <PositionsHelp />}
          {tab === 'rotation' && <RotationHelp />}
          {tab === 'live' && <LiveHelp />}
        </motion.div>
      </AnimatePresence>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .help-card {
           background: rgba(255,255,255,0.03);
           border: 1px solid rgba(255,255,255,0.05);
           padding: 1.5rem;
           border-radius: 24px;
           margin-bottom: 1.2rem;
        }
        .help-icon-box {
           background: rgba(255,255,255,0.05);
           padding: 12px;
           border-radius: 16px;
           color: var(--primary);
           margin-bottom: 1rem;
           display: inline-flex;
        }
      `}</style>
    </div>
  );
}

function MediaHelp({ driveLink }: { driveLink: string }) {
  const steps = [
    { title: "Crie sua Pasta", desc: "Acesse o Drive e crie uma pasta com seu nome.", icon: <FolderPlus /> },
    { title: "Suba os Arquivos", desc: "Coloque sua foto ou vídeo do lance.", icon: <CheckCircle2 /> },
    { title: "Copie o Link", desc: "Compartilhe com 'Qualquer pessoa com o link'.", icon: <Share2 /> },
    { title: "Cole no App", desc: "Acesse o perfil e cole o link da mídia.", icon: <Copy /> }
  ];

  return (
    <section>
      <div className="help-card" style={{ borderLeft: '4px solid #3b82f6' }}>
        <h3 style={{ fontWeight: '800', marginBottom: '1rem' }}>📸 Fotos e Vídeos</h3>
        <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6' }}>
          Para que sua foto apareça no card e seus lances no feed, usamos o Google Drive como hospedagem gratuita.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '2rem' }}>
        {steps.map((s, i) => (
          <div key={i} className="help-card" style={{ marginBottom: 0, padding: '1.2rem' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '8px' }}>{s.icon}</div>
            <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '4px' }}>{i+1}. {s.title}</h4>
            <p style={{ fontSize: '11px', color: 'var(--secondary)', lineHeight: '1.4' }}>{s.desc}</p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <a href={driveLink} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', gap: '10px', background: 'var(--primary-gradient)', color: 'black', padding: '14px 24px', borderRadius: '16px', fontWeight: '900', fontSize: '14px' }}>
          <ExternalLink size={20} /> ABRIR PASTA DO DRIVE
        </a>
      </div>
    </section>
  );
}

function EvolutionHelp() {
  const rules = [
    { title: "Progressão de OVR", desc: "Suas notas pós-jogo definem sua evolução. Notas altas geram cartas melhores (In-Form, Ouro, TOTY).", icon: <TrendingUp /> },
    { title: "PlayStyles", desc: "Atributos acima de 85 desbloqueiam habilidades 'PLUS' (Douradas) que te dão vantagem em campo.", icon: <Sparkles /> },
    { title: "Boost de Estrela", desc: "Ser um dos melhores (TOP 3) em jogos seguidos garante um upgrade temporário no card.", icon: <Star /> }
  ];
  return (
    <section>
      {rules.map((r, i) => (
        <div key={i} className="help-card">
          <div className="help-icon-box">{r.icon}</div>
          <h3 style={{ fontWeight: '800', marginBottom: '8px' }}>{r.title}</h3>
          <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6' }}>{r.desc}</p>
        </div>
      ))}
    </section>
  );
}

function InvitesHelp() {
  return (
    <section>
      <div className="help-card" style={{ borderLeft: '4px solid var(--warning)' }}>
        <div className="help-icon-box" style={{ color: 'var(--warning)' }}><UserPlus /></div>
        <h3 style={{ fontWeight: '800', marginBottom: '8px' }}>Sistema de Convites</h3>
        <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6' }}>
          Existem dois tipos de partidas no LineUp:
        </p>
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Globe size={20} color="var(--primary)" />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '800' }}>Partidas Públicas</h4>
              <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>Visíveis para todos. Qualquer um pode entrar diretamente.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Lock size={20} color="var(--warning)" />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '800' }}>Partidas Privadas</h4>
              <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>Apenas convidados ou quem tiver o link. Requerem aprovação do Admin.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="help-card">
        <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px' }}>Como entrar via link?</h4>
        <p style={{ fontSize: '12px', color: 'var(--secondary)', lineHeight: '1.5' }}>
          Ao clicar em um link de partida privada, você verá o botão "Participar". Ao clicar, você ficará com status 🟡 **PENDENTE**. O administrador receberá uma notificação e poderá te aprovar.
        </p>
      </div>
    </section>
  );
}

function PositionsHelp() {
  return (
    <section>
      <div className="help-card">
        <div className="help-icon-box"><Target /></div>
        <h3 style={{ fontWeight: '800', marginBottom: '8px' }}>Posições Principal e Secundária</h3>
        <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6' }}>
          Para que o sorteio de times seja justo e equilibrado, você pode definir até duas posições.
        </p>
        <ul style={{ marginTop: '1rem', color: 'var(--secondary)', fontSize: '13px', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <li>**Principal:** Sua função primária (ex: MEI). O sistema tentará te encaixar nela primeiro.</li>
          <li>**Secundária:** Uma função que você domina (ex: VOL). Usada se o time já tiver muitos jogadores da sua posição principal.</li>
        </ul>
      </div>
      <div className="help-card" style={{ background: 'rgba(29, 185, 84, 0.05)' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px', color: 'var(--primary)' }}>Sorteio Tático</h4>
        <p style={{ fontSize: '12px', color: 'var(--secondary)', lineHeight: '1.5' }}>
          O sistema distribui os jogadores em "ondas": Goleiros &rarr; Defesa &rarr; Meio &rarr; Ataque. Ele usa sua posição secundária para garantir que nenhum time fique "buraco" na defesa ou no ataque.
        </p>
      </div>
    </section>
  );
}

function RotationHelp() {
  return (
    <section>
      <div className="help-card">
        <div className="help-icon-box"><RefreshCw /></div>
        <h3 style={{ fontWeight: '800', marginBottom: '8px' }}>Rotação Justa</h3>
        <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6' }}>
          Em peladas com muitos jogadores, o sistema de rotação garante que todos joguem o mesmo tempo.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        <div className="help-card" style={{ marginBottom: 0 }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px' }}>Regra de Entrada</h4>
          <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>Quem acaba de entrar do banco recebe um selo **"EM CAMPO"** e não pode ser substituído até que todos os outros que já estavam em campo também tenham descansado.</p>
        </div>
        <div className="help-card" style={{ marginBottom: 0 }}>
          <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '8px' }}>Exceção: Goleiros</h4>
          <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>Goleiros podem ser configurados como isentos da rotação automática, permitindo que fiquem no gol por mais tempo se não houver reserva da posição.</p>
        </div>
      </div>
    </section>
  );
}

function LiveHelp() {
  return (
    <section>
      <div className="help-card" style={{ borderLeft: '4px solid var(--error)' }}>
        <div className="help-icon-box" style={{ color: 'var(--error)' }}><Activity /></div>
        <h3 style={{ fontWeight: '800', marginBottom: '8px' }}>Match Center (Live)</h3>
        <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6' }}>
          Acompanhe o que acontece na quadra em tempo real pelo seu celular.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[
          { label: "Placar Real-time", desc: "Gols atualizados na hora.", icon: <Trophy size={18} /> },
          { label: "Cronômetro", desc: "Sincronizado entre todos.", icon: <Clock size={18} /> },
          { label: "Feed de Gols", desc: "Quem marcou e deu passe.", icon: <Activity size={18} /> },
          { label: "Substituições", desc: "Acompanhe quem entra.", icon: <RefreshCw size={18} /> }
        ].map((item, i) => (
          <div key={i} className="help-card" style={{ marginBottom: 0, padding: '1rem' }}>
            <div style={{ color: 'var(--primary)', marginBottom: '8px' }}>{item.icon}</div>
            <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '4px' }}>{item.label}</h4>
            <p style={{ fontSize: '10px', color: 'var(--secondary)' }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
