import { format } from 'date-fns';

export function formatMatchDate(iso: string): string {
  const d = new Date(iso);
  return format(d, 'd MMM HH:mm');
}

export function formatScore(home: number | null, away: number | null): string {
  if (home == null || away == null) return '— : —';
  return `${home} : ${away}`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

// =====================================================================
// V3 — Ülke adından bayrak emoji üretici
// Football-Data.org country isimleri English; bazı özel durumları map'liyoruz.
// =====================================================================
const COUNTRY_TO_FLAG: Record<string, string> = {
  'Turkey': '🇹🇷',          'Türkiye': '🇹🇷',
  'England': '🇬🇧',          'United Kingdom': '🇬🇧',
  'Spain': '🇪🇸',            'España': '🇪🇸',
  'Germany': '🇩🇪',          'Deutschland': '🇩🇪',
  'Italy': '🇮🇹',            'Italia': '🇮🇹',
  'France': '🇫🇷',
  'Netherlands': '🇳🇱',      'Holland': '🇳🇱',
  'Portugal': '🇵🇹',
  'Belgium': '🇧🇪',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Brazil': '🇧🇷',           'Brasil': '🇧🇷',
  'Argentina': '🇦🇷',
  'Mexico': '🇲🇽',
  'USA': '🇺🇸',              'United States': '🇺🇸',
  'Russia': '🇷🇺',
  'Ukraine': '🇺🇦',
  'Poland': '🇵🇱',
  'Greece': '🇬🇷',
  'Austria': '🇦🇹',
  'Switzerland': '🇨🇭',
  'Sweden': '🇸🇪',
  'Norway': '🇳🇴',
  'Denmark': '🇩🇰',
  'Finland': '🇫🇮',
  'Czech Republic': '🇨🇿',
  'Croatia': '🇭🇷',
  'Serbia': '🇷🇸',
  'Romania': '🇷🇴',
  'Bulgaria': '🇧🇬',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',      'Korea Republic': '🇰🇷',
  'Saudi Arabia': '🇸🇦',
  'Egypt': '🇪🇬',
  'Morocco': '🇲🇦',
  'Australia': '🇦🇺',
  'Europe': '🇪🇺',           // UEFA / Champions League
  'World': '🌍',              // FIFA / World Cup
};

// Lig isminden bayrak çıkar (country bilgisi NULL geldiğinde fallback)
const LEAGUE_NAME_TO_FLAG: Array<[RegExp, string]> = [
  [/premier\s*league/i,              '🇬🇧'],
  [/championship/i,                  '🇬🇧'],
  [/efl\s*(cup|championship)/i,      '🇬🇧'],
  [/primera\s*division|la\s*liga/i,  '🇪🇸'],
  [/bundesliga/i,                    '🇩🇪'],
  [/serie\s*[ab]\b(?!.*brasil)/i,    '🇮🇹'],
  [/ligue\s*[12]\b/i,                '🇫🇷'],
  [/eredivisie/i,                    '🇳🇱'],
  [/primeira\s*liga|liga\s*portugal/i, '🇵🇹'],
  [/(süper|super)\s*lig/i,           '🇹🇷'],
  [/türk|turk/i,                     '🇹🇷'],
  [/champions\s*league|uefa|europa\s*league|conference/i, '🇪🇺'],
  [/world\s*cup|fifa/i,              '🌍'],
  [/brasileir|brazil/i,              '🇧🇷'],
  [/argentin/i,                      '🇦🇷'],
  [/scottish|scotland/i,             '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  [/belgian|belgium/i,               '🇧🇪'],
  [/greek|greece/i,                  '🇬🇷'],
  [/swiss|switzerland/i,             '🇨🇭'],
  [/austrian|austria/i,              '🇦🇹'],
  [/danish|denmark/i,                '🇩🇰'],
  [/swedish|sweden/i,                '🇸🇪'],
  [/norwegian|norway/i,              '🇳🇴'],
  [/polish|poland/i,                 '🇵🇱'],
  [/japan|j[12]?\s*league/i,         '🇯🇵'],
  [/saudi|arab/i,                    '🇸🇦'],
  [/major\s*league|mls\b/i,          '🇺🇸'],
  [/mexic|liga\s*mx/i,               '🇲🇽'],
];

export function countryFlag(
  country: string | null | undefined,
  leagueName?: string | null,
): string {
  if (country) {
    const trimmed = country.trim();
    if (COUNTRY_TO_FLAG[trimmed]) return COUNTRY_TO_FLAG[trimmed];
  }
  // Country NULL veya bilinmeyen → lig adından çıkarmayı dene
  if (leagueName) {
    for (const [pattern, flag] of LEAGUE_NAME_TO_FLAG) {
      if (pattern.test(leagueName)) return flag;
    }
  }
  return '⚽';
}
