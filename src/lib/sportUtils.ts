export const normalizeSport = (sport: string | undefined | null): string => {
  if (!sport) return '';
  const s = sport.toLowerCase().trim();
  if (s === 'soccer' || s === 'fútbol' || s === 'futbol') return 'Fútbol';
  if (s === 'basketball' || s === 'baloncesto') return 'Baloncesto';
  if (s === 'futsal' || s === 'futbol-sala' || s === 'fútbol sala' || s === 'futbol sala') return 'Fútbol Sala';
  if (s === 'esports' || s === 'electronic sports') return 'eSports';
  if (s === 'voleibol' || s === 'volleyball') return 'Voleibol';
  if (s === 'padel' || s === 'pádel') return 'Pádel';
  if (s === 'tennis' || s === 'tenis') return 'Tenis';
  if (s === 'natación' || s === 'swimming') return 'Natación';
  return sport;
};
