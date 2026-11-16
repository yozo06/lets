// The drawings. Pure functions from a short description to SVG text, so the family looks
// the same in every scene and a new scene needs no artist:
//
//   scene('shop boss:talk ravi:shock')   a place, and who is in it with what expression
//   tile('bus')  tile('ravi:wave')       a picture to tap
//   face('asha', 'happy')                one person
//
// A description is words separated by spaces: one place (home, city, shop, school, plain),
// people as name:look, and things by name. `problems(description)` lists words it does not know.

const INK = '#2A1A10', LIP = '#7A2318';
const line = (d, w = 3, colour = INK) => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Who is in the story. Colours and features are what make each person recognisable. */
export const PEOPLE = {
  ravi: { skin: '#C8875A', hair: '#1E1410', style: 'short', top: '#2F8F7A', moustache: true },
  asha: { skin: '#D9A074', hair: '#1E1410', style: 'bun', top: '#C2255C', scarf: '#F4A300', bindi: true },
  munni: { skin: '#D9A074', hair: '#1E1410', style: 'pigtails', top: '#F4A300' },
  boss: { skin: '#B9774B', hair: '#77706A', style: 'short', top: '#3D4FA3', glasses: true },
  teacher: { skin: '#C8875A', hair: '#1E1410', style: 'bun', top: '#6B4AA0', glasses: true, bindi: true },
  customer: { skin: '#E0AC84', hair: '#3A2A20', style: 'short', top: '#D9822B' },
  clerk: { skin: '#B9774B', hair: '#1E1410', style: 'short', top: '#5C6B73', glasses: true, moustache: true },
};
/** Expressions and gestures a person can have. */
export const LOOKS = ['happy', 'worry', 'laugh', 'talk', 'shock', 'quiet', 'wave', 'hide'];

function eyes(look) {
  if (look === 'hide') return '';
  if (look === 'laugh') return line('M-19-2q7-8 14 0M5-2q7-8 14 0');
  if (look === 'shock') return `<circle cx="-12" cy="-3" r="7" fill="#fff"/><circle cx="12" cy="-3" r="7" fill="#fff"/><circle cx="-12" cy="-3" r="3.4" fill="${INK}"/><circle cx="12" cy="-3" r="3.4" fill="${INK}"/>${line('M-20-17q8-6 15 0M5-17q8-6 15 0', 2.6)}`;
  if (look === 'quiet') return `<circle cx="-8" cy="-2" r="3.6" fill="${INK}"/><circle cx="16" cy="-2" r="3.6" fill="${INK}"/>`;
  return `<circle cx="-12" cy="-2" r="3.8" fill="${INK}"/><circle cx="12" cy="-2" r="3.8" fill="${INK}"/>${look === 'worry' ? line('M-21-15l12 5M21-15l-12 5', 2.8) : ''}`;
}
function mouth(look, low) {
  const y = low ? 4 : 0;
  switch (look) {
    case 'laugh': return `<path d="M-13 ${12 + y}h26q-13 19-26 0Z" fill="${LIP}"/>`;
    case 'talk': return `<ellipse cx="0" cy="${17 + y}" rx="7" ry="5.5" fill="${LIP}"/>`;
    case 'shock': return `<ellipse cx="0" cy="${18 + y}" rx="5.5" ry="7" fill="${LIP}"/>`;
    case 'worry': return line(`M-9 ${20 + y}q9-7 18 0`);
    case 'quiet': return line(`M-8 ${17 + y}h16`);
    case 'hide': return line(`M-7 ${18 + y}q7-4 14 0`);
    default: return line(`M-11 ${14 + y}q11 10 22 0`);
  }
}
/** One person, head and shoulders, drawn around (0, 0) at the centre of the face. */
function bust(who, look = 'happy') {
  const p = PEOPLE[who] || PEOPLE.ravi;
  const behind = p.style === 'bun' ? `<circle cx="0" cy="-43" r="13" fill="${p.hair}"/><path d="M-38 22C-47-54 47-54 38 22L30 22C30-2 18-12 0-12S-30-2-30 22Z" fill="${p.hair}"/>`
    : p.style === 'pigtails' ? `<circle cx="-43" cy="10" r="13" fill="${p.hair}"/><circle cx="43" cy="10" r="13" fill="${p.hair}"/>` : '';
  const fringe = p.style === 'bun' ? `<path d="M-35-1C-37-45 37-45 35-1C24-25 6-28-6-24C-19-20-30-13-35-1Z" fill="${p.hair}"/>`
    : p.style === 'pigtails' ? `<path d="M-35-4C-38-46 38-46 35-4C30-19 14-23 0-18C-14-23-30-19-35-4Z" fill="${p.hair}"/><circle cx="-34" cy="-1" r="5.5" fill="#E5484D"/><circle cx="34" cy="-1" r="5.5" fill="#E5484D"/>`
    : `<path d="M-35-4C-38-46 38-46 35-4C26-25-26-25-35-4Z" fill="${p.hair}"/>`;
  const gesture = look === 'wave' ? `${line('M46 76C71 60 76 28 67 6', 17, p.top)}<circle cx="66" cy="-4" r="11.5" fill="${p.skin}"/>${line('M84-16q6 8 2 18M93-23q9 13 3 29', 2.6)}`
    : look === 'hide' ? `${line('M-46 82C-52 42-32 18-15 6M46 82C52 42 32 18 15 6', 17, p.top)}<ellipse cx="-13" cy="-2" rx="14" ry="11" fill="${p.skin}" stroke="${INK}" stroke-opacity=".25" stroke-width="2"/><ellipse cx="13" cy="-2" rx="14" ry="11" fill="${p.skin}" stroke="${INK}" stroke-opacity=".25" stroke-width="2"/>` : '';
  return `${behind}
    <path d="M-56 98C-56 58-30 46 0 46S56 58 56 98Z" fill="${p.top}"/>
    ${p.scarf ? `<path d="M-56 98C-46 68-16 51 14 47L34 53C6 61-22 78-30 98Z" fill="${p.scarf}"/>` : ''}
    <rect x="-10" y="27" width="20" height="24" rx="7" fill="${p.skin}"/>
    <circle cx="-34" cy="3" r="6.5" fill="${p.skin}"/><circle cx="34" cy="3" r="6.5" fill="${p.skin}"/>
    <circle r="34" fill="${p.skin}"/>${fringe}
    ${p.bindi ? '<circle cx="0" cy="-15" r="3" fill="#C62828"/>' : ''}
    ${eyes(look)}
    ${p.glasses && look !== 'hide' ? `<g fill="none" stroke="${INK}" stroke-width="2.4"><circle cx="-12" cy="-2" r="9.5"/><circle cx="12" cy="-2" r="9.5"/><path d="M-2.5-2h5"/></g>` : ''}
    ${p.moustache ? `<path d="M-15 11q8-7 15-1q7-6 15 1q-8 6-15 2q-7 4-15-2Z" fill="${p.hair}"/>` : ''}
    ${mouth(look === 'wave' ? 'happy' : look, p.moustache)}
    ${look === 'worry' ? '<path d="M42-28q7 11 0 16q-7-5 0-16Z" fill="#69C3F5"/>' : ''}
    ${gesture}`;
}

/** Places. Each fills a 320 by 200 frame. */
const windows = (x, y, cols, rows, c = '#FFF3B0') => Array.from({ length: cols * rows }, (_, i) => `<rect x="${x + (i % cols) * 12}" y="${y + Math.floor(i / cols) * 14}" width="7" height="8" fill="${c}"/>`).join('');
export const PLACES = {
  plain: '<rect width="320" height="200" fill="#FFF4DE"/><circle cx="160" cy="112" r="96" fill="#FFE3A6"/>',
  home: `<rect width="320" height="200" fill="#FFE8C7"/><rect y="156" width="320" height="44" fill="#E7C596"/>
    <rect x="22" y="22" width="72" height="62" rx="6" fill="#BFE6FF" stroke="#8C6A3F" stroke-width="5"/><path d="M58 22v62M22 53h72" stroke="#8C6A3F" stroke-width="4"/>
    <rect x="236" y="26" width="58" height="44" rx="4" fill="#fff" stroke="#8C6A3F" stroke-width="4"/><path d="M243 63l13-15 9 9 9-8 13 14Z" fill="#7CC38A"/><circle cx="279" cy="39" r="5" fill="#F4A300"/>`,
  city: `<rect width="320" height="200" fill="#CFEBFF"/><circle cx="268" cy="38" r="20" fill="#FFD166"/>
    <rect x="8" y="58" width="52" height="110" fill="#8FA6C8"/>${windows(16, 68, 3, 6)}<rect x="66" y="30" width="58" height="138" fill="#6F86AD"/>${windows(75, 42, 4, 8)}
    <rect x="130" y="72" width="46" height="96" fill="#A7B9D6"/>${windows(138, 82, 3, 5)}<rect x="182" y="48" width="60" height="120" fill="#7F95BA"/>${windows(191, 60, 4, 7)}
    <rect x="248" y="86" width="64" height="82" fill="#93A8CB"/>${windows(257, 96, 4, 4)}<rect y="166" width="320" height="34" fill="#7C7F86"/><path d="M10 183h40M80 183h40M150 183h40M220 183h40M290 183h30" stroke="#F2F2F2" stroke-width="4"/>`,
  shop: `<rect width="320" height="200" fill="#FFE0B8"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${i * 40} 0h40v26a20 20 0 0 1-40 0Z" fill="${i % 2 ? '#fff' : '#E5484D'}"/>`).join('')}
    <path d="M16 78h288M16 118h288" stroke="#B5713C" stroke-width="5"/>
    ${[30, 62, 94, 226, 258, 290].map((x, i) => `<rect x="${x - 10}" y="54" width="20" height="24" rx="5" fill="${['#F4A300', '#7CC38A', '#69C3F5', '#E5484D', '#B58BD9', '#F4A300'][i]}"/>`).join('')}
    ${[38, 78, 242, 282].map((x, i) => `<rect x="${x - 13}" y="98" width="26" height="20" rx="3" fill="${['#69C3F5', '#E5484D', '#7CC38A', '#F4A300'][i]}"/>`).join('')}
    <rect y="170" width="320" height="30" fill="#A8632F"/><rect y="166" width="320" height="8" fill="#C98044"/>`,
  school: `<rect width="320" height="200" fill="#CFEBFF"/><rect y="164" width="320" height="36" fill="#9BD08A"/>
    <path d="M30 76L160 20l130 56v12H30Z" fill="#D9534F"/><rect x="42" y="88" width="236" height="78" fill="#FFD27A"/>
    <rect x="140" y="112" width="40" height="54" rx="4" fill="#8C5A2B"/>
    ${[58, 96, 196, 234].map((x) => `<rect x="${x}" y="104" width="28" height="26" rx="3" fill="#D6F0FF" stroke="#C99A2E" stroke-width="3"/>`).join('')}
    <rect x="128" y="52" width="64" height="24" rx="4" fill="#fff"/><text x="160" y="70" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="17" fill="#2A1A10">ABC</text>
    <path d="M296 30v136" stroke="#8C6A3F" stroke-width="4"/><path d="M296 32h-26l8 9-8 9h26Z" fill="#F4A300"/>`,
};

/** Things to tap, each drawn in a 100 by 100 box. */
export const THINGS = {
  bus: `<rect x="8" y="26" width="84" height="46" rx="11" fill="#E5484D"/><rect x="8" y="56" width="84" height="6" fill="#B93237"/>
    ${[15, 40, 65].map((x) => `<rect x="${x}" y="33" width="20" height="17" rx="3" fill="#D6F0FF"/>`).join('')}
    <circle cx="29" cy="74" r="10" fill="#2B2B2B"/><circle cx="29" cy="74" r="4" fill="#BDBDBD"/><circle cx="71" cy="74" r="10" fill="#2B2B2B"/><circle cx="71" cy="74" r="4" fill="#BDBDBD"/><rect x="85" y="60" width="6" height="5" rx="2" fill="#FFD166"/>`,
  phone: `<rect x="29" y="8" width="42" height="84" rx="9" fill="#2B2B2B"/><rect x="33" y="17" width="34" height="60" rx="3" fill="#8FD3FF"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${38 + (i % 3) * 9}" y="${24 + Math.floor(i / 3) * 10}" width="6" height="6" rx="1.5" fill="${['#F4A300', '#7CC38A', '#E5484D', '#fff', '#B58BD9', '#FFD166'][i]}"/>`).join('')}<circle cx="50" cy="84.5" r="3" fill="#8A8A8A"/>`,
  ticket: `<path d="M10 32h80v11a7.5 7.5 0 0 0 0 15v11H10V58a7.5 7.5 0 0 0 0-15Z" fill="#FFD166" stroke="#C99A2E" stroke-width="2.5"/><path d="M66 35v31" stroke="#C99A2E" stroke-width="2.5" stroke-dasharray="4 4"/><path d="M20 43h34M20 51h26M20 59h30" stroke="#C99A2E" stroke-width="3.5" stroke-linecap="round"/><circle cx="78" cy="50.5" r="6" fill="#E5484D"/>`,
  school: `<path d="M8 46L50 18l42 28v9H8Z" fill="#D9534F"/><rect x="15" y="55" width="70" height="33" fill="#FFD27A"/><rect x="42" y="64" width="16" height="24" rx="2" fill="#8C5A2B"/><rect x="22" y="62" width="13" height="12" rx="2" fill="#D6F0FF"/><rect x="65" y="62" width="13" height="12" rx="2" fill="#D6F0FF"/><path d="M50 18V6" stroke="#8C6A3F" stroke-width="3"/><path d="M50 6h14l-4 5 4 5H50Z" fill="#F4A300"/>`,
  clock: `<circle cx="50" cy="52" r="36" fill="#fff" stroke="#2A1A10" stroke-width="5"/><path d="M50 52V30M50 52l15 9" stroke="#2A1A10" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="52" r="4" fill="#E5484D"/><path d="M26 14l-10 9M74 14l10 9" stroke="#2A1A10" stroke-width="5" stroke-linecap="round"/>`,
  name: `<rect x="24" y="18" width="52" height="70" rx="8" fill="#fff" stroke="#2A1A10" stroke-width="4"/><rect x="41" y="10" width="18" height="14" rx="4" fill="#8A8A8A"/><circle cx="50" cy="46" r="11" fill="#D9A074"/><path d="M33 68h34M38 77h24" stroke="#2A1A10" stroke-width="4" stroke-linecap="round"/>`,
  money: `<rect x="10" y="30" width="80" height="44" rx="6" fill="#7CC38A" stroke="#3F8F52" stroke-width="3"/><circle cx="50" cy="52" r="13" fill="#DFF3E2"/><text x="50" y="59" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="20" fill="#3F8F52">₹</text>`,
};

/** Split a description into its place, people and things. */
export function parse(description) {
  const words = String(description || '').trim().split(/\s+/).filter(Boolean);
  return {
    place: words.find((w) => PLACES[w]),
    people: words.filter((w) => w.includes(':')).map((w) => w.split(':')),
    things: words.filter((w) => THINGS[w]),
    unknown: words.filter((w) => !PLACES[w] && !THINGS[w] && !(w.includes(':') && PEOPLE[w.split(':')[0]] && LOOKS.includes(w.split(':')[1]))),
  };
}
/** Words in a description that are not a known place, thing or person:look. Empty means it can be drawn. */
export const problems = (description) => parse(description).unknown;

const SPOTS = { 1: [[160, 106, 1.05]], 2: [[96, 110, 0.94], [224, 110, 0.94]], 3: [[84, 104, 0.86], [236, 104, 0.86], [160, 138, 0.7]] };
const svg = (box, body, cls) => `<svg class="${cls}" viewBox="${box}" aria-hidden="true" focusable="false">${body}</svg>`;

/** A place with up to three people in it. */
export function scene(description) {
  const a = parse(description), people = a.people.slice(0, 3);
  const cast = people.map(([who, look], i) => { const [x, y, s] = SPOTS[people.length][i]; return `<g transform="translate(${x} ${y}) scale(${s})">${bust(who, look)}</g>`; }).join('');
  const thing = a.things[0] && !people.length ? `<g transform="translate(100 40) scale(1.2)">${THINGS[a.things[0]]}</g>` : '';
  return svg('0 0 320 200', (PLACES[a.place] || PLACES.plain) + cast + thing, 'pic');
}
/** One picture to tap: a thing, or a person doing something. */
export function tile(description) {
  const a = parse(description);
  if (a.people[0]) return svg('0 0 100 100', `<g transform="translate(42 50) scale(.54)">${bust(a.people[0][0], a.people[0][1])}</g>`, 'tile');
  return svg('0 0 100 100', THINGS[a.things[0]] || '', 'tile');
}
/** One person's head and shoulders. */
export const face = (who, look = 'happy') => svg('-62 -62 124 162', bust(who, look), 'face');

/** Small symbols for buttons, drawn so they look the same on every phone. */
const stroke = (d, w = 2.2) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const ICONS = {
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/>',
  pause: '<rect x="5.5" y="4.5" width="5" height="15" rx="1.6"/><rect x="13.5" y="4.5" width="5" height="15" rx="1.6"/>',
  stop: '<rect x="5.5" y="5.5" width="13" height="13" rx="2.5"/>',
  sound: `<path d="M3.5 9.2v5.6h3.8l5.2 4.2V5L7.3 9.2z"/>${stroke('M16 8.6a5 5 0 0 1 0 6.8M18.7 6a8.6 8.6 0 0 1 0 12')}`,
  mic: `<rect x="8.6" y="2.6" width="6.8" height="12" rx="3.4"/>${stroke('M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.4M8.6 21.4h6.8')}`,
  check: stroke('M5 12.6l4.6 4.6L19 7.6', 3.2),
  close: stroke('M6 6l12 12M18 6L6 18', 2.6),
  back: stroke('M15 5l-7 7 7 7', 2.6),
  next: stroke('M9 5l7 7-7 7', 2.8),
  gear: `${stroke('M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z')}${stroke('M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8')}`,
  bell: `<path d="M6 16.5v-5.3a6 6 0 0 1 12 0v5.3l1.8 1.9H4.2z"/>${stroke('M10 21a2.2 2.2 0 0 0 4 0')}`,
  share: stroke('M12 15V4M8 7.8L12 4l4 3.8M5 13v6.5h14V13'),
  home: '<path d="M3.6 11.2L12 3.8l8.4 7.4v8.9h-5.6v-6H9.2v6H3.6z"/>',
  again: stroke('M5 12a7 7 0 1 0 2.4-5.3M5 4.2v4.2h4.2'),
  keep: `${stroke('M7.5 2.8h9a1.5 1.5 0 0 1 1.5 1.5v15.4a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.7V4.3a1.5 1.5 0 0 1 1.5-1.5z')}${stroke('M12 7.5v7M9 11.8l3 3 3-3')}`,
  flame: '<path d="M12.5 2c.4 3.1 4.5 5.3 4.5 10a5 5 0 0 1-10 .3c0-1.9.9-3.1 1.9-4.2.1 1.3.7 2.1 1.5 2.6C10 7.2 11 4.5 12.5 2z"/>',
  moon: '<path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z"/>',
};
export const icon = (name) => `<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
