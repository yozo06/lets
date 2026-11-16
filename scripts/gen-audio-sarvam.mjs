#!/usr/bin/env node
// Records every sentence the app speaks, once, with Sarvam AI's Bulbul voices, into
// app/audio/sarvam/<clip id>.mp3. After that the clips are part of the app: learners never
// call Sarvam, and the story has a voice even on phones with no Hindi or Odia voice built in.
//
//   node scripts/gen-audio-sarvam.mjs --list                    how much there is to record (no key needed)
//   SARVAM_API_KEY=... node scripts/gen-audio-sarvam.mjs        record what is missing
//   SARVAM_API_KEY=... node scripts/gen-audio-sarvam.mjs --sample   six clips only, to judge the voice
//   options: --speaker <name>  --pace <0.5-2>  --force (record again)
//
// No key on your machine? Add it as the repository secret SARVAM_API_KEY and run the
// "audio-sarvam" workflow from the Actions tab. API: https://docs.sarvam.ai (text-to-speech).
import { mkdirSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spokenTexts } from '../app/js/spoken.js';
import { clipId, writeManifest } from '../app/vendor/sutra/audio/index.js';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const SPEAKER = opt('speaker', process.env.SARVAM_SPEAKER || 'ritu');
const PACE = Number(opt('pace', process.env.SARVAM_PACE || '0.9'));
const MODEL = 'bulbul:v3';
const CODE = { hi: 'hi-IN', or: 'od-IN', en: 'en-IN' };   // Sarvam writes Odia as od-IN
const dir = fileURLToPath(new URL('../app/audio/sarvam/', import.meta.url));
const manifest = fileURLToPath(new URL('../app/audio/manifest.json', import.meta.url));
const key = process.env.SARVAM_API_KEY;

const all = spokenTexts();
const chars = all.reduce((n, x) => n + x.text.length, 0);
function refreshManifest() {
  const have = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)) : [];
  const wanted = new Set(all.map((x) => clipId(x.text)));
  const clips = have.filter((id) => wanted.has(id));
  writeFileSync(manifest, JSON.stringify(clips.length ? writeManifest([{ id: 'sarvam', label: 'Sarvam', clips }], 'sarvam') : { default: null, packs: {} }) + '\n');
  return clips.length;
}
if (args.includes('--list')) {
  const by = {}; for (const x of all) by[x.lang] = (by[x.lang] || 0) + 1;
  console.log(`${all.length} sentences, ${chars} characters: ${JSON.stringify(by)}; ${refreshManifest()} already recorded`);
  process.exit(0);
}
if (!key) { console.error('Set SARVAM_API_KEY, or run with --list. Nothing recorded.'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function record(text, lang) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST', headers: { 'content-type': 'application/json', 'api-subscription-key': key },
      body: JSON.stringify({ text, target_language_code: CODE[lang], speaker: SPEAKER, model: MODEL, pace: PACE, output_audio_codec: 'mp3' }),
    });
    if (res.ok) { const j = await res.json(); if (!j.audios || !j.audios.length) throw new Error('no audio in the reply'); return Buffer.from(j.audios.join(''), 'base64'); }
    const body = (await res.text()).slice(0, 300);
    if ((res.status === 429 || res.status >= 500) && attempt < 5) { await sleep(2000 * (attempt + 1)); continue; }
    throw new Error(`Sarvam ${res.status}: ${body}`);
  }
}

mkdirSync(dir, { recursive: true });
const force = args.includes('--force');
const todo = args.includes('--sample') ? ['hi', 'or', 'en'].flatMap((l) => all.filter((x) => x.lang === l).slice(0, 2)) : all;
let made = 0, kept = 0; const failed = [];
console.log(`Sarvam ${MODEL}, speaker ${SPEAKER}, pace ${PACE}: ${todo.length} sentences`);
for (const { text, lang } of todo) {
  const file = join(dir, clipId(text) + '.mp3');
  if (existsSync(file) && !force) { kept++; continue; }
  try { writeFileSync(file, await record(text, lang)); made++; }
  catch (e) { failed.push(`[${lang}] ${text} | ${e.message}`); if (made === 0 && failed.length === 1) { console.error('The first request failed, stopping:\n  ' + failed[0]); process.exit(1); } }
  await sleep(150);
}
console.log(`recorded ${made}, kept ${kept}, failed ${failed.length}; ${refreshManifest()} clips listed in app/audio/manifest.json`);
for (const f of failed) console.log('  FAILED: ' + f);
console.log('Now run: npm run sw');
process.exit(failed.length ? 1 : 0);
