import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM, TRACKS, LOCALES } from '../app/content/index.js';
import { missing, buildEpisode } from '../app/vendor/sutra/story/index.js';
import { coverage } from '../app/vendor/sutra/i18n/index.js';
import { problems, PEOPLE, scene, tile, face } from '../app/js/art.js';

test('every episode exists for every story in every language', () => {
  const gaps = missing(CURRICULUM, Object.values(TRACKS), Object.values(LOCALES));
  assert.deepEqual(gaps.map((g) => `${g.locale} ${g.track}/${g.skill}: ${g.what}`), []);
});

test('every language has every piece of text the others have', () => {
  const [base, ...rest] = Object.values(LOCALES);
  for (const l of rest) {
    const c = coverage(base.text, l.text);
    assert.deepEqual([l.id, c.missing, c.broken, c.unknown], [l.id, [], [], []]);
    assert.deepEqual(Object.keys(l.meaning).sort(), Object.keys(base.meaning).sort());
    assert.deepEqual(Object.keys(l.sound).sort(), Object.keys(base.sound).sort());
  }
});

test('every drawing a scene asks for can be drawn', () => {
  for (const track of Object.values(TRACKS)) {
    assert.ok(PEOPLE[track.who], `track ${track.id} needs a face`);
    for (const [skill, sc] of Object.entries(track.scenes)) for (const b of sc.beats) {
      if (b.t === 'tell' || b.t === 'teach') assert.ok(b.art, `${track.id}/${skill}: every story beat needs a picture, so the story can be followed without reading`);
      for (const d of [b.art, ...(b.options || []).map((o) => o.art)].filter(Boolean)) assert.deepEqual(problems(d), [], `${track.id}/${skill}: "${d}"`);
      if (b.who) assert.ok(PEOPLE[b.who], `nobody called "${b.who}"`);
    }
  }
  assert.deepEqual(problems('shop boss:talk ravi:shock bus'), []);
  assert.deepEqual(problems('moon ravi:dancing nobody:happy'), ['moon', 'ravi:dancing', 'nobody:happy']);
  for (const svg of [scene('city ravi:happy asha:worry munni:laugh'), tile('bus'), tile('asha:wave'), face('boss', 'talk')]) assert.match(svg, /^<svg [^>]*viewBox="[^"]+"[^>]*>.*<\/svg>$/s);
});

test('every voice on offer has a face and a word in every language', async () => {
  const { VOICES } = await import('../app/js/config.js');
  assert.ok(Object.keys(VOICES).length >= 2);
  for (const [id, v] of Object.entries(VOICES)) {
    assert.match(id, /^[a-z0-9_-]+$/, 'a voice id is a folder name');
    assert.ok(PEOPLE[v.who], `voice ${id} needs a face`);
    for (const l of Object.values(LOCALES)) assert.ok(l.text[v.name], `${l.id} has no word for ${v.name}`);
  }
});

test('an episode is a few minutes long, ends on its recap, and makes the learner choose and speak', () => {
  for (const track of Object.values(TRACKS)) for (const locale of Object.values(LOCALES)) CURRICULUM.skills.forEach((_, i) => {
    const e = buildEpisode(CURRICULUM, track, locale, i + 1).value;
    assert.ok(e.steps.length >= 8 && e.steps.length <= 18, `${e.id} has ${e.steps.length} steps`);
    assert.equal(e.steps.at(-1).t, 'recap');
    assert.ok(e.steps.some((s) => s.t === 'say'), 'the learner gets to speak');
    assert.ok(e.steps.some((s) => s.t === 'choose'), 'the learner gets to choose');
    for (const s of e.steps) if (s.t === 'tell') assert.ok(s.text.length <= 75, `${e.id}: a line too long to follow by ear (${s.text.length}): ${s.text}`);
  });
});

test('every episode after the first has a line to sell it the day before', () => {
  for (const track of Object.values(TRACKS)) CURRICULUM.skills.slice(1).forEach((k) => assert.ok(track.scenes[k.id].tease, `${track.id}/${k.id} needs a tease`));
});

test('a shared link shows a picture: the page names a preview image that exists, at the public address', async () => {
  const { readFileSync, existsSync, statSync } = await import('node:fs');
  const { SHARE_URL } = await import('../app/js/config.js');
  const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const meta = (p) => (html.match(new RegExp(`<meta property="${p}" content="([^"]*)"`)) || [])[1];
  assert.equal(meta('og:url'), SHARE_URL);
  assert.ok(meta('og:title') && meta('og:description'));
  const image = meta('og:image'); assert.ok(image.startsWith(SHARE_URL), 'the image address must be absolute');
  const file = new URL('../app/' + image.slice(SHARE_URL.length), import.meta.url);
  assert.ok(existsSync(file)); assert.ok(statSync(file).size < 300_000, 'small enough for WhatsApp to show');
});

test('colours are readable in both themes: text 4.5:1, large text and outlines 3:1', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../app/css/app.css', import.meta.url), 'utf8');
  const vars = (block) => Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
  const light = vars(css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root'))));
  const at = css.indexOf('prefers-color-scheme: dark');
  assert.ok(at > 0, 'there is a dark theme');
  const dark = { ...light, ...vars(css.slice(at, css.indexOf('}', at))) };
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const pairs = [['ink', 'paper', 4.5], ['ink', 'card', 4.5], ['soft', 'paper', 4.5], ['soft', 'card', 4.5], ['soft', 'tint', 4.5], ['english', 'card', 4.5], ['good-ink', 'good', 4.5], ['on-sun', 'sun', 4.5],
    ['edge', 'paper', 3], ['edge', 'card', 3], ['seg-done', 'paper', 3], ['sun', 'paper', 1.9], ['leaf', 'paper', 3]];
  for (const [name, theme] of [['light', light], ['dark', dark]]) for (const [a, b, min] of pairs) {
    assert.ok(theme[a] && theme[b], `${name}: --${a} and --${b} exist`);
    assert.ok(ratio(theme[a], theme[b]) >= min, `${name}: --${a} on --${b} is ${ratio(theme[a], theme[b]).toFixed(2)}, needs ${min}`);
  }
  assert.ok(ratio('#FFFFFF', dark.leaf) >= 4 && ratio('#FFFFFF', light.leaf) >= 4, 'white on the green button');
});
