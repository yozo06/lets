// The shell: the only file that touches the phone. It turns taps into events, hands them to
// the pure program, draws what comes back, and carries out the effects it asks for
// (speak, save, send counts, record, remind, share).
import { start, onActions } from '../vendor/sutra/browser/runtime.js';
import { readClock } from '../vendor/sutra/browser/clock.js';
import { localStore, readJson, writeJson } from '../vendor/sutra/browser/storage.js';
import { loadVoices, speaker, deviceVoice } from '../vendor/sutra/browser/audio.js';
import { sendToGoatcounter } from '../vendor/sutra/browser/send.js';
import { plan, NO_VOICES } from '../vendor/sutra/audio/index.js';
import { transliterate } from '../vendor/sutra/i18n/indic.js';
import { dayOf } from '../vendor/sutra/core/time.js';
import { update, fromSave, toSave, episodeOf, reminderFor } from './program.js';
import { view } from './view.js';
import { LOCALES } from '../content/index.js';
import { COUNT_ENDPOINT, SHARE_URL } from './config.js';

const store = localStore('lets.');
const root = document.getElementById('app');
const today = () => dayOf(readClock());
const onDevMachine = /^(localhost$|127\.|\[::1\])/.test(location.hostname) && store.get('countLocal') !== '1';
const canCount = !!COUNT_ENDPOINT && !onDevMachine;
const canRemind = 'Notification' in window && 'serviceWorker' in navigator && 'PeriodicSyncManager' in window;

/* ----- voice: one thing at a time, in order -----
   A sentence is played from the first of these that exists:
   a recorded clip; the phone's own voice for that language; for Odia, the phone's Hindi voice reading
   the same words in Devanagari letters (a stopgap until clips are recorded); otherwise nothing. */
let voices = NO_VOICES, generation = 0, talking = Promise.resolve(), heard = false, player = null;
const speakers = {};
const speakerFor = (tag) => (speakers[tag] = speakers[tag] || speaker(tag, tag.startsWith('en') ? 0.8 : 0.9));
const tagFor = (state, which) => (which === 'target' ? (deviceVoice('en-IN') ? 'en-IN' : 'en') : (LOCALES[state.lang] || {}).voice || 'hi');
function hush() { generation++; talking = Promise.resolve(); heard = false; for (const s of Object.values(speakers)) s.stop(); if (player) { player.pause(); player = null; } }
function queue(job) { const mine = generation; talking = talking.then(() => (mine === generation ? job() : undefined)).catch(() => {}); }
function speak(state, words, which) {
  queue(() => {
    const tag = tagFor(state, which);
    let what = plan(voices, words, { base: 'audio', chosen: state.voice || '', deviceVoice: !!deviceVoice(tag) }), who = tag;
    if (what.t === 'silent' && tag === 'or' && deviceVoice('hi')) { what = { t: 'voice', text: transliterate(words, 'odia', 'devanagari') }; who = 'hi'; }
    if (what.t !== 'silent') heard = true;
    return speakerFor(who).play(what);
  });
}
const playUrl = (url) => queue(() => new Promise((done) => { heard = true; player = new Audio(url); player.onended = player.onerror = () => done(); player.play().catch(() => done()); }));
/** Fetch the next episode's clips ahead of time, one after another; the service worker keeps them for offline. */
const fetched = new Set();
function fetchAhead(state, texts) {
  if (navigator.onLine === false || (navigator.connection && navigator.connection.saveData)) return;
  const urls = texts.map((t) => plan(voices, t, { base: 'audio', chosen: state.voice || '' })).filter((p) => p.t === 'clip').map((p) => p.url).filter((u) => !fetched.has(u));
  urls.forEach((u) => fetched.add(u));
  (async () => { for (const u of urls) { try { await fetch(u); } catch (e) { fetched.delete(u); } } })();
}
/** After the voice has finished (or, with no voice, after time to read), tell the program so the story can move on. */
function afterSpeech(effect, dispatch) {
  queue(() => new Promise((done) => {
    const mine = generation, wait = effect.chars === 0 ? 900 : heard ? 500 : Math.max(1800, effect.chars * 70);
    setTimeout(() => { done(); if (mine === generation) dispatch({ t: 'spoken', n: effect.n, at: effect.at }); }, wait);
  }));
}

/* ----- small sounds, made on the spot so there is nothing to download ----- */
let ac = null;
function tone(notes) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    notes.forEach(([hz, at, len]) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = hz; o.type = 'sine'; g.gain.setValueAtTime(0.0001, ac.currentTime + at); g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + len); o.connect(g).connect(ac.destination); o.start(ac.currentTime + at); o.stop(ac.currentTime + at + len + 0.02); });
  } catch (e) { /* sound is a nicety */ }
}
const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } };

/* ----- speaking: record the learner, play the line and then their own voice, and count the line as said ----- */
let recorder = null, clip = '', stopAt = 0;
async function recordStart(dispatch) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = []; recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (clip) URL.revokeObjectURL(clip); clip = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));   // stays on the phone
      const s = app.state(), ep = s.player && episodeOf(s), step = ep && ep.steps[s.player.at];
      if (!step || step.t !== 'say') return;
      speak(s, step.line.text, 'target'); playUrl(clip);
      queue(() => dispatch({ t: 'tap', tap: { t: 'said' } }));
    };
    recorder.start(); stopAt = setTimeout(() => { if (recorder && recorder.state === 'recording') dispatch({ t: 'mic' }); }, 4000);
  } catch (e) { dispatch({ t: 'mic-failed' }); }
}
function recordStop() { clearTimeout(stopAt); try { if (recorder && recorder.state === 'recording') recorder.stop(); } catch (e) { /* ignore */ } }

/* ----- coming back tomorrow ----- */
async function remind(dispatch) {
  try {
    if (!canRemind || (await Notification.requestPermission()) !== 'granted') return dispatch({ t: 'reminded', ok: false });
    const reg = await navigator.serviceWorker.ready;
    await reg.periodicSync.register('lets-daily', { minInterval: 20 * 60 * 60 * 1000 });
    dispatch({ t: 'reminded', ok: true });
  } catch (e) { dispatch({ t: 'reminded', ok: false }); }   // usually: the app is not on the home screen yet
}
/** Leave the reminder's words where the service worker can find them. */
async function leavePlan(state) {
  try { const cache = await caches.open('lets-remind'); await cache.put('plan', new Response(JSON.stringify({ ...reminderFor(state), lang: state.lang }))); } catch (e) { /* no cache, no reminder */ }
}
let installOffer = null;
function install() { const offer = installOffer; installOffer = null; if (offer) { offer.prompt(); if (offer.userChoice) offer.userChoice.catch(() => {}); } }
function share(words) {
  const data = { text: words, url: SHARE_URL };
  if (navigator.share) navigator.share(data).catch(() => {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(words + ' ' + SHARE_URL), '_blank', 'noopener');
}

/* ----- the loop ----- */
let shown = '', where = '';
const app = start({
  program: { init: [fromSave(readJson(store, 'state', null)), []], update },
  run(effect, dispatch, state) {
    switch (effect.t) {
      case 'speak': return speak(state, effect.text, effect.lang);
      case 'after-speech': return afterSpeech(effect, dispatch);
      case 'hush': return hush();
      case 'fetch-ahead': return fetchAhead(state, effect.texts);
      case 'cheer': tone([[660, 0, 0.12], [880, 0.1, 0.12], [1320, 0.2, 0.22]]); return buzz(30);
      case 'retry': return tone([[300, 0, 0.18]]);
      case 'save': writeJson(store, 'state', toSave(state)); return void leavePlan(state);
      case 'send': return void sendToGoatcounter(COUNT_ENDPOINT, effect.hits).then((n) => dispatch(n ? { t: 'sent', n } : { t: 'failed' }));
      case 'record-start': return void recordStart(dispatch);
      case 'record-stop': return recordStop();
      case 'remind': return void remind(dispatch);
      case 'install': return install();
      case 'share': return share(effect.text);
    }
  },
  after(state) {
    const html = view(state); if (html === shown) return;
    shown = html; root.innerHTML = html;
    document.documentElement.lang = state.lang || 'en'; document.body.dataset.screen = state.screen;
    const here = state.screen + ':' + (state.player ? state.player.at : '');
    if (here !== where) { where = here; window.scrollTo(0, 0); }
  },
});

const dispatch = (event) => app.dispatch({ ...event, day: today() });
onActions(root, (name, data) => {
  switch (name) {
    case 'lang': return { t: 'lang', lang: data.v };
    case 'track': return { t: 'track', track: data.v };
    case 'start': return { t: 'start', n: Number(data.v) };
    case 'pick': return { t: 'tap', tap: { t: 'pick', option: data.v } };
    case 'next': case 'said': case 'skip': case 'again': return { t: 'tap', tap: { t: name } };
    case 'counting': return { t: 'counting', on: data.v === '1' };
    case 'voice': return { t: 'voice', pack: data.v };
    case 'hear': return { t: 'hear', text: data.v };
    default: return { t: name };
  }
}, dispatch);

dispatch({ t: 'opened', canCount, canRemind });
loadVoices('audio/manifest.json').then((v) => { voices = v; dispatch({ t: 'voices', packs: v.packs.map((p) => ({ id: p.id, label: p.label })), fallback: v.fallback }); });
try { window.speechSynthesis.getVoices(); } catch (e) { /* no device voice */ }   // asks the phone to load its voices early
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installOffer = e; dispatch({ t: 'installable', on: true }); });
window.addEventListener('appinstalled', () => { installOffer = null; dispatch({ t: 'installable', on: false }); });
window.addEventListener('online', () => dispatch({ t: 'online' }));   // send whatever waited while offline
window.addEventListener('pagehide', () => { if (app.state().screen === 'play') dispatch({ t: 'quit' }); writeJson(store, 'state', toSave(app.state())); });
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
window.__lets = app; // handy for tests and the console
