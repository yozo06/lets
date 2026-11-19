#!/usr/bin/env node
// Records every sentence the app speaks, once, with Sarvam AI's Bulbul voices, into
// app/audio/sarvam/<clip id>.mp3. After that the clips are part of the app: learners never
// call Sarvam, and the story has a voice even on phones with no Hindi or Odia voice built in.
//
//   node scripts/gen-audio-sarvam.mjs --list          how much there is to record (no key needed)
//   1. Hear some voices first (six short sentences each: two Hindi, two Odia, two English):
//        SARVAM_API_KEY=sk_... npm run audio -- --sample --speakers ritu,kavya,roopa,gokul
//      Clips land in samples/sarvam/<speaker>/ (not part of the app, not committed).
//   2. Record everything with the voice you liked:
//        SARVAM_API_KEY=sk_... npm run audio -- --speaker ritu
//        npm run sw
//   options: --pace 0.9 (0.5 to 2.0) · --force (record again)
//   The model is bulbul:v3, the one with Odia. (bulbul:v4-flash has no Odia voices and names its voices differently.)
//
// No key on your machine? Add it as the repository secret SARVAM_API_KEY and run the
// "audio-sarvam" workflow from the Actions tab. API: https://docs.sarvam.ai (text-to-speech).
import { mkdirSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spokenTexts } from '../app/js/spoken.js';
import { clipId, writeManifest } from '../app/vendor/sutra/audio/index.js';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : dflt; };
const MODEL = opt('model', process.env.SARVAM_MODEL || 'bulbul:v3');
const PACE = Number(opt('pace', process.env.SARVAM_PACE || '0.9'));
const CODE = { hi: 'hi-IN', or: 'od-IN', en: 'en-IN' };   // Sarvam writes Odia as od-IN
const dir = fileURLToPath(new URL('../app/audio/sarvam/', import.meta.url));
const manifest = fileURLToPath(new URL('../app/audio/manifest.json', import.meta.url));
const key = process.env.SARVAM_API_KEY;

const all = spokenTexts();
function refreshManifest() {
  const have = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)) : [];
  const wanted = new Set(all.map((x) => clipId(x.text)));
  const clips = have.filter((id) => wanted.has(id));
  writeFileSync(manifest, JSON.stringify(clips.length ? writeManifest([{ id: 'sarvam', label: 'Sarvam', clips }], 'sarvam') : { default: null, packs: {} }) + '\n');
  return clips.length;
}
if (args.includes('--list')) {
  const by = {}; for (const x of all) by[x.lang] = (by[x.lang] || 0) + 1;
  console.log(`${all.length} sentences, ${all.reduce((n, x) => n + x.text.length, 0)} characters: ${JSON.stringify(by)}; ${refreshManifest()} already recorded`);
  process.exit(0);
}
if (!key) { console.error('Set SARVAM_API_KEY, or run with --list. Nothing recorded.'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isMp3 = (b) => b.length > 300 && ((b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0));
// Sarvam's reference names the language field `language_code`; older examples use `target_language_code`.
// Try the first, switch once if the API objects, then keep what worked.
let langField = 'language_code';
async function record(text, lang, speaker) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST', headers: { 'content-type': 'application/json', 'api-subscription-key': key },
      body: JSON.stringify({ text, [langField]: CODE[lang], speaker, model: MODEL, pace: PACE, output_audio_codec: 'mp3' }),
    });
    if (res.ok) {
      const j = await res.json(); if (!j.audios || !j.audios.length) throw new Error('no audio in the reply');
      const clip = Buffer.from(j.audios.join(''), 'base64'); if (!isMp3(clip)) throw new Error('the reply is not MP3 audio');
      return clip;
    }
    const body = (await res.text()).slice(0, 300);
    if ((res.status === 400 || res.status === 422) && /language_code/.test(body) && attempt === 0) { langField = langField === 'language_code' ? 'target_language_code' : 'language_code'; continue; }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) { await sleep(2000 * (attempt + 1)); continue; }
    throw new Error(`Sarvam ${res.status}: ${body}`);
  }
}

if (args.includes('--sample')) {
  const speakers = opt('speakers', opt('speaker', 'ritu,kavya,roopa,gokul')).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const root = fileURLToPath(new URL('../samples/sarvam/', import.meta.url));
  const story = (l) => all.filter((x) => x.lang === l).sort((a, b) => b.text.length - a.text.length).slice(0, 2);   // the two longest sentences show a voice best
  const picks = ['hi', 'or', 'en'].flatMap(story); let chars = 0, made = 0;
  for (const sp of speakers) {
    const out = join(root, sp); mkdirSync(out, { recursive: true });
    for (const [i, { text, lang }] of picks.entries()) {
      try { writeFileSync(join(out, `${i + 1}-${lang}.mp3`), await record(text, lang, sp)); chars += text.length; made++; }
      catch (e) { console.error(`${sp} [${lang}]: ${e.message}`); if (i === 0) break; }
      await sleep(150);
    }
    console.log('sampled ' + sp);
  }
  console.log(`${made} samples in samples/sarvam/ (${MODEL}, pace ${PACE}, ${chars} characters used). Listen, then run again with --speaker <name>.`);
  process.exit(made ? 0 : 1);
}

const SPEAKER = opt('speaker', process.env.SARVAM_SPEAKER || 'ritu').toLowerCase();
mkdirSync(dir, { recursive: true });
const force = args.includes('--force');
let made = 0, kept = 0; const failed = [];
console.log(`Sarvam ${MODEL}, speaker ${SPEAKER}, pace ${PACE}: ${all.length} sentences`);
for (const { text, lang } of all) {
  const file = join(dir, clipId(text) + '.mp3');
  if (existsSync(file) && !force) { kept++; continue; }
  try { writeFileSync(file, await record(text, lang, SPEAKER)); made++; }
  catch (e) { failed.push(`[${lang}] ${text} | ${e.message}`); if (made === 0 && failed.length === 1) { console.error('The first request failed, stopping:\n  ' + failed[0]); process.exit(1); } if (failed.length > 20) { console.error('Too many failures, stopping.'); break; } }
  await sleep(150);
}
console.log(`recorded ${made}, kept ${kept}, failed ${failed.length}; ${refreshManifest()} clips listed in app/audio/manifest.json`);
for (const f of failed) console.log('  FAILED: ' + f);
console.log('Now run: npm run sw');
process.exit(failed.length ? 1 : 0);
