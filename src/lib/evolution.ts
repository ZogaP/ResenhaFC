/**
 * Evolution Engine — LineUp
 * Sistema de progressão inspirado no FIFA Ultimate Team.
 * 
 * Fórmulas:
 *   K = K0 * (1 - O/100)^alpha
 *   S = (R - 5) / 5
 *   DeltaO = K * (0.7 * S + 0.3 * ((M - 5) / 5))
 *   P = beta * max(0, O - 85) * max(0, -S)
 *   O_novo = clamp(O + DeltaO - P, 0, 99)
 */

// --- Constants ---
const K0 = 4;
const ALPHA = 2;
const BETA = 0.05;

// --- Card Types ---
export type CardType = 'bronze' | 'silver' | 'gold' | 'toty';
export type CardVariant = CardType | 'inform';
export type PlayerStyle = 'carrapato' | 'muro' | 'cerebro' | 'motorzinho' | 'artilheiro' | 'fominha' | 'ponta' | 'box-to-box' | 'completo' | 'cone' | 'craque';
export type AutoPosition = 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'PON' | 'CA' | 'GOL';
export type PlayStyleType = 'muralha' | 'carrinho' | 'marcador' | 'maestro' | 'motor' | 'distribuidor' | 'finalizador' | 'artilheiro-nato' | 'driblador' | 'ponta-veloz' | 'guerreiro' | 'completo-ps' | 'fominha-ps' | 'cone-ps';
export interface PlayStyle {
  id: PlayStyleType;
  plus: boolean;
}

export function getCardType(overall: number): CardType {
  if (overall >= 91) return 'toty';
  if (overall >= 75) return 'gold';
  if (overall >= 66) return 'silver';
  return 'bronze';
}

// --- Evolution Math ---

/**
 * Calculate the new overall after a match.
 * @param currentOverall - Current OVR (0-99)
 * @param matchRating - Average rating received this match (0-10)
 * @param recentAverage - Average of the last N match ratings (0-10)
 * @returns The new overall, clamped to [0, 99]
 */
export function calculateNewOverall(
  currentOverall: number,
  matchRating: number,
  recentAverage: number
): number {
  const O = currentOverall;
  const R = matchRating;
  const M = recentAverage;

  // Normalized score: maps 0-10 to -1..+1
  const S = (R - 5) / 5;

  // Evolution factor: lower OVR = faster growth
  const K = K0 * Math.pow(1 - O / 100, ALPHA);

  // Consistency-weighted delta
  const recentFactor = (M - 5) / 5;
  const deltaO = K * (0.7 * S + 0.3 * recentFactor);

  // Penalty for high-OVR players who play badly
  const penalty = BETA * Math.max(0, O - 85) * Math.max(0, -S);

  // Final calculation
  const newOverall = Math.round(
    Math.max(0, Math.min(99, O + deltaO - penalty))
  );

  return newOverall;
}

/**
 * Calculate individual attribute change after evaluation.
 * Uses the same curve logic but per-attribute.
 * @param currentValue - Current attribute value (0-99)
 * @param rating - Rating received for this attribute (0-10)
 * @returns New attribute value, clamped [1, 99]
 */
export function calculateAttributeChange(
  currentValue: number,
  rating: number
): number {
  const S = (rating - 5) / 5;
  const K = 3 * Math.pow(1 - currentValue / 100, ALPHA);
  const delta = K * S;
  return Math.round(Math.max(1, Math.min(99, currentValue + delta)));
}

/**
 * Determine if a player is INFORM (top 3 of the round).
 * @param playerRating - The player's average rating this match
 * @param allRatings - Array of { uid, rating } for all players in the match
 * @returns true if the player is in the top 3
 */
export function isInform(
  playerUid: string,
  allRatings: { uid: string; rating: number }[]
): boolean {
  const sorted = [...allRatings].sort((a, b) => b.rating - a.rating);
  const top3Uids = sorted.slice(0, 3).map(r => r.uid);
  return top3Uids.includes(playerUid);
}

/**
 * Get the card visual config for a given type.
 */
export function getCardVisuals(type: CardVariant) {
  const visuals = {
    bronze: {
      bg: 'linear-gradient(145deg, #8B6914 0%, #6B4226 30%, #4A2C1A 70%, #3D1F0E 100%)',
      text: '#FFE4C4',
      border: '#8B6914',
      glow: 'rgba(139, 105, 20, 0.3)',
      badge: null,
      label: 'Bronze',
    },
    silver: {
      bg: 'linear-gradient(145deg, #E8E8E8 0%, #B0B0B0 30%, #8A8A8A 70%, #5C5C5C 100%)',
      text: '#1a1a2e',
      border: '#C0C0C0',
      glow: 'rgba(192, 192, 192, 0.3)',
      badge: null,
      label: 'Prata',
    },
    gold: {
      bg: 'linear-gradient(145deg, #FFD700 0%, #DAA520 30%, #B8860B 70%, #8B6914 100%)',
      text: '#1a1a00',
      border: '#FFD700',
      glow: 'rgba(255, 215, 0, 0.4)',
      badge: null,
      label: 'Ouro',
    },
    toty: {
      bg: 'linear-gradient(145deg, #1a237e 0%, #0d47a1 30%, #1565c0 50%, #FFD700 90%, #FFC107 100%)',
      text: '#FFFFFF',
      border: '#FFD700',
      glow: 'rgba(21, 101, 192, 0.5)',
      badge: '⭐',
      label: 'TOTY',
    },
    inform: {
      bg: 'linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 40%, #2d2d2d 70%, #DAA520 95%, #FFD700 100%)',
      text: '#FFD700',
      border: '#FFD700',
      glow: 'rgba(255, 215, 0, 0.4)',
      badge: 'IF',
      label: 'INFORM',
    },
  };

  return visuals[type];
}

/**
 * Detect the ideal position based on attributes and performance.
 */
export function detectAutoPosition(attributes: any, currentPosition: string): AutoPosition {
  if (currentPosition === 'GOL') return 'GOL';

  const scoreDef = (attributes.defesa + attributes.fisico) / 2;
  const scoreMeio = (attributes.passe + (attributes.overall || 50)) / 2;
  const scoreAtk = (attributes.ataque + attributes.finalizacao) / 2;

  if (scoreDef > scoreMeio && scoreDef > scoreAtk) return attributes.velocidade > 70 ? 'LAT' : 'ZAG';
  if (scoreMeio > scoreDef && scoreMeio > scoreAtk) return attributes.passe > 75 ? 'MEI' : 'VOL';
  if (scoreAtk > scoreDef && scoreAtk > scoreMeio) return attributes.velocidade > 80 ? 'PON' : 'CA';
  
  return (currentPosition as AutoPosition) || 'MEI';
}

/**
 * Detect the player's play style based on attribute dominance.
 */
export function detectPlayStyle(attributes: any, overall: number): PlayerStyle {
  const { ataque, defesa, passe, velocidade, fisico, finalizacao } = attributes;
  
  // Resenha styles
  if (overall < 50) return 'cone';
  if (overall > 88) return 'craque';

  // Híbridos
  const diffAtkDef = Math.abs(ataque - defesa);
  const avgAll = (ataque + defesa + passe + velocidade + fisico + finalizacao) / 6;
  const isBalanced = (ataque > 65 && defesa > 65 && passe > 65);
  
  if (isBalanced && avgAll > 75) return 'completo';
  if (diffAtkDef < 10 && ataque > 65 && defesa > 65) return 'box-to-box';

  // Defensivos
  if (defesa > ataque + 15) {
    if (fisico > 80) return 'muro';
    return 'carrapato';
  }

  // Ofensivos
  if (ataque > defesa + 15 || finalizacao > 75) {
    if (velocidade > 85) return 'ponta';
    if (finalizacao > 80 && passe < 60) return 'fominha';
    if (finalizacao > 75) return 'artilheiro';
  }

  // Meio
  if (passe > 75) return 'cerebro';
  
  return 'motorzinho';
}

/**
 * Detect the top 3 PlayStyles for a player.
 */
export function detectPlayStyles(attributes: any, overall: number): PlayStyle[] {
  // PlayStyles only start from Silver tier (OVR 66+)
  if (overall <= 65) return [];

  const styles: PlayStyle[] = [];
  const { ataque, defesa, passe, velocidade, fisico, finalizacao } = attributes;

  const checkPlus = (val: number) => val >= 85;

  // 🛡️ Defensivos
  if (defesa > 75 && fisico > 75) styles.push({ id: 'muralha', plus: checkPlus(defesa) });
  if (defesa > 80) styles.push({ id: 'marcador', plus: checkPlus(defesa) });
  
  // ⚙️ Meio
  if (passe > 80) styles.push({ id: 'maestro', plus: checkPlus(passe) });
  if (passe > 75 && overall > 75) styles.push({ id: 'distribuidor', plus: checkPlus(passe) });
  if (overall > 80) styles.push({ id: 'motor', plus: checkPlus(overall) });

  // ⚡ Ofensivos
  if (finalizacao > 80) styles.push({ id: 'finalizador', plus: checkPlus(finalizacao) });
  if (velocidade > 85) styles.push({ id: 'ponta-veloz', plus: checkPlus(velocidade) });
  if (ataque > 80 && velocidade > 80) styles.push({ id: 'driblador', plus: checkPlus(ataque) });
  
  // 🧱 Híbridos
  if (fisico > 80 && overall > 75) styles.push({ id: 'guerreiro', plus: checkPlus(fisico) });

  // Limit to 3, sorted by "Plus" first, then by priority (def/mid/atk)
  return styles
    .sort((a, b) => (b.plus ? 1 : 0) - (a.plus ? 1 : 0))
    .slice(0, 3);
}

/**
 * Get PlayStyle metadata
 */
export function getPlayStyleMetadata(id: PlayStyleType) {
  const metadata: Record<PlayStyleType, { label: string, icon: string, color: string }> = {
    muralha: { label: 'Muralha', icon: '🛡️', color: '#10b981' },
    carrinho: { label: 'Carrinho Perfeito', icon: '🧹', color: '#059669' },
    marcador: { label: 'Marcador Implacável', icon: '🔒', color: '#047857' },
    maestro: { label: 'Maestro', icon: '🪄', color: '#3b82f6' },
    motor: { label: 'Motor Infinito', icon: '⚙️', color: '#2563eb' },
    distribuidor: { label: 'Distribuidor', icon: '📡', color: '#60a5fa' },
    finalizador: { label: 'Finalizador', icon: '🎯', color: '#f59e0b' },
    'artilheiro-nato': { label: 'Artilheiro Nato', icon: '⚽', color: '#d97706' },
    driblador: { label: 'Driblador', icon: '🏃', color: '#fbbf24' },
    'ponta-veloz': { label: 'Ponta Veloz', icon: '⚡', color: '#facc15' },
    guerreiro: { label: 'Guerreiro', icon: '⚔️', color: '#ef4444' },
    'completo-ps': { label: 'Completo', icon: '💎', color: '#06b6d4' },
    'fominha-ps': { label: 'Fominha', icon: '🍕', color: '#ef4444' },
    'cone-ps': { label: 'Cone', icon: '⚠️', color: '#94a3b8' },
  };
  return metadata[id] || metadata['cone-ps'];
}

/**
 * Get style display metadata
 */
export function getStyleMetadata(style: PlayerStyle) {
  const styles: Record<PlayerStyle, { label: string, icon: string, desc: string, color: string }> = {
    carrapato: { label: 'Carrapato', icon: '🦟', desc: 'Não desgruda do adversário. Marcação implacável.', color: '#10b981' },
    muro: { label: 'Muro', icon: '🧱', desc: 'Uma parede na defesa. Impossível de passar no físico.', color: '#059669' },
    cerebro: { label: 'Cérebro', icon: '🧠', desc: 'Visão de jogo privilegiada. O dono do meio-campo.', color: '#3b82f6' },
    motorzinho: { label: 'Motorzinho', icon: '⚙️', desc: 'Corre o campo todo. Fôlego infinito e regularidade.', color: '#6366f1' },
    artilheiro: { label: 'Artilheiro', icon: '🎯', desc: 'Faro de gol apurado. Raramente perde uma chance.', color: '#f59e0b' },
    fominha: { label: 'Fominha', icon: '🍕', desc: 'Habilidoso, mas solta pouco a bola. O terror do time.', color: '#ef4444' },
    ponta: { label: 'Ponta Rápido', icon: '⚡', desc: 'Velocidade pura. Deixa os zagueiros comendo poeira.', color: '#facc15' },
    'box-to-box': { label: 'Box-to-Box', icon: '🔄', desc: 'Joga nas duas áreas. Defende e ataca com a mesma raça.', color: '#8b5cf6' },
    completo: { label: 'Completo', icon: '💎', desc: 'Domina todos os fundamentos. O jogador que todo time quer.', color: '#06b6d4' },
    cone: { label: 'Cone', icon: '⚠️', desc: 'Está em campo, mas ninguém sabe muito bem o porquê.', color: '#94a3b8' },
    craque: { label: 'Craque do Racha', icon: '👑', desc: 'Nível profissional. Decide a partida em um lance.', color: '#FFD700' },
  };
  return styles[style];
}



/**
 * Determine the evolution trend direction.
 * @param overallHistory - Array of { date, value } entries
 * @returns 'rising' | 'falling' | 'stable'
 */
export function getEvolutionTrend(
  overallHistory: { date: string; value: number }[]
): 'rising' | 'falling' | 'stable' {
  if (!overallHistory || overallHistory.length < 2) return 'stable';
  const recent = overallHistory.slice(-5);
  const first = recent[0].value;
  const last = recent[recent.length - 1].value;
  const diff = last - first;
  if (diff >= 2) return 'rising';
  if (diff <= -2) return 'falling';
  return 'stable';
}

/**
 * Calculate boost for sequential INFORM status.
 * If streak > 1, grants a small OVR boost.
 */
export function calculateInformBoost(currentOverall: number, streak: number): number {
  if (streak >= 2) return 1; // +1 OVR for being a beast 2 matches in a row
  return 0;
}



