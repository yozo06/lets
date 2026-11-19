// The whole app as one pure function:   update(state, event) -> [next state, effects]
// Nothing here reads the clock, touches storage or makes a sound. Events carry the day;
// effects are descriptions ("speak this", "save", "send these counts") that main.js carries out.
// So every behaviour below can be tested by feeding events in and comparing data out.
import { fold } from '../vendor/sutra/core/program.js';
import * as story from '../vendor/sutra/story/index.js';
import { touch, NO_STREAK } from '../vendor/sutra/habit/index.js';
import { meter, NEW_METER } from '../vendor/sutra/analytics/index.js';
import { translate } from '../vendor/sutra/i18n/index.js';
import { CURRICULUM, TRACKS, LOCALES } from '../content/index.js';
import { PACE } from './config.js';

/** Saved between visits: everything except what is on screen right now. */
export const init = {
  v: 1,
  lang: '',            // teaching language: 'hi', 'or'
  track: '',           // whose story: 'work', 'home'
  finished: {},        // skill id -> the day its episode was first finished
  streak: NO_STREAK,
  meter: NEW_METER,    // anonymous counting (see docs/analytics.md)
  bell: false,         // true once the learner asked to be reminded
  voice: '',           // the voice pack the learner chose; '' = the default one
  // ----- not saved -----
  screen: 'lang',      // lang | track | home | play | done | settings
  n: 0,                // episode being played
  player: null,        // where the learner is inside it
  paused: false,       // the story plays by itself unless paused
  day: '',             // today, as told by the last event
  canCount: false,     // whether this copy may send counts at all
  canRemind: false,    // whether this phone can show a reminder
  installable: false,  // whether the phone is offering to keep the app on the home screen
  mic: true,           // false once recording has failed on this phone
  rec: 'idle',         // idle | on
  nudge: false,        // true just after a wrong choice
  packs: [],           // the voice packs this copy carries: [{ id, label }]
  fallback: '',        // the default voice pack
};
const TRANSIENT = { screen: 'lang', n: 0, player: null, paused: false, day: '', canCount: false, canRemind: false, installable: false, mic: true, rec: 'idle', nudge: false, packs: [], fallback: '' };
/** The part of the state worth keeping. */
export const toSave = (s) => ({ v: s.v, lang: s.lang, track: s.track, finished: s.finished, streak: s.streak, meter: s.meter, bell: s.bell, voice: s.voice });
/** A saved state brought back to life. */
export const fromSave = (saved) => ({ ...init, ...(saved && saved.v === 1 ? saved : {}), ...TRANSIENT });

/* ---------- reading the state ---------- */

export const text = (s, key, vars) => translate((LOCALES[s.lang] || {}).text || {}, key, vars);
/** The episode with this number, in the learner's story and language; null if it cannot be built. */
export const episodeOf = (s, n = s.n) => {
  if (!TRACKS[s.track] || !LOCALES[s.lang]) return null;
  const built = story.buildEpisode(CURRICULUM, TRACKS[s.track], LOCALES[s.lang], n);
  return built.ok ? built.value : null;
};
/** Which episode is next, whether it only opens tomorrow, and which can be replayed. */
export const todayOf = (s) => story.today(CURRICULUM, s.finished, s.day, PACE);
/** The lines the learner has finished learning, most recent last. */
export const learned = (s) => CURRICULUM.skills.filter((k) => s.finished[k.id]).flatMap((k) => k.lines)
  .map((id) => ({ line: CURRICULUM.lines[id], meaning: LOCALES[s.lang].meaning[id], sound: LOCALES[s.lang].sound[id] }));
/** The next episode the learner has not finished: its number, title, the line that sells it, and a picture. */
export const upcoming = (s) => {
  const i = CURRICULUM.skills.findIndex((k) => !s.finished[k.id]);
  const ep = i < 0 ? null : episodeOf(s, i + 1); if (!ep) return null;
  const scene = TRACKS[s.track].scenes[ep.skill];
  return { n: i + 1, title: ep.title, tease: scene.tease ? text(s, scene.tease) : '', art: (scene.beats.find((b) => b.t === 'tell' && b.art) || {}).art || '' };
};
/** The voice pack in use: the learner's choice if this copy carries it, otherwise the default. */
export const voiceOf = (s) => (s.packs.some((p) => p.id === s.voice) ? s.voice : s.fallback);
const stepWords = (step) => (step.t === 'tell' ? [step.text] : step.t === 'teach' ? [step.line.text, step.meaning] : step.t === 'choose' ? [step.ask] : step.t === 'say' ? [step.line.text] : step.t === 'recap' ? step.lines.map((l) => l.line.text) : []);
/** Everything that may be spoken from the home screen to the end of the next episode. */
export const wordsAhead = (s) => {
  const up = s.lang && s.track ? upcoming(s) : null, ep = up ? episodeOf(s, up.n) : null; if (!ep) return [];
  const after = upcoming({ ...s, finished: { ...s.finished, [ep.skill]: s.day || 'x' } });
  const words = [text(s, 'ui.press.play'), up.tease, ...ep.steps.flatMap(stepWords), text(s, 'ui.retry'), text(s, 'ui.done.title'), text(s, 'ui.done.body'), ...(after && after.tease ? [text(s, 'ui.tomorrow.title'), after.tease] : [])];
  return [...new Set(words.filter(Boolean))];
};
/** What a reminder should say, and from which day on it may be shown. Pure; the shell hands it to the phone. */
export const reminderFor = (s) => {
  const up = s.lang && s.track ? upcoming(s) : null, last = Object.values(s.finished).sort().pop() || '';
  return { show: !!(s.bell && up && last), after: last, title: text(s, 'ui.notify.title'), body: up ? up.tease || up.title : '' };
};

/* ---------- the rules ---------- */

const say = (s, key, vars) => ({ t: 'speak', text: text(s, key, vars), lang: 'own' });
const home = (s) => ({ ...s, screen: s.lang ? (s.track ? 'home' : 'track') : 'lang', player: null, n: 0, rec: 'idle', nudge: false, paused: false });
/** What to say when a screen opens, so that nobody has to read to know what to do. */
const greet = (s) => (s.screen === 'track' ? [say(s, 'ui.pick.track')] : s.screen === 'home' && todayOf(s).next ? [say(s, 'ui.press.play')] : []);
/** While waiting on the home screen, fetch the next episode's clips, so the story does not stall on a slow connection. */
const ahead = (s) => (s.screen === 'home' && s.packs.length ? [{ t: 'fetch-ahead', texts: wordsAhead(s) }] : []);
const arrive = (s) => [s, [{ t: 'hush' }, ...greet(s), ...ahead(s)]];

/** Story and taught lines play by themselves, like a video, and move on when their voice has finished. */
const playsItself = (step) => !!step && (step.t === 'tell' || step.t === 'teach');
/** "Tell me when you have finished saying that": the shell answers with a 'spoken' event for this step. */
const andThen = (s, cues) => ({ t: 'after-speech', n: s.n, at: s.player.at, chars: cues.filter((c) => c.t === 'speak').reduce((n, c) => n + c.text.length, 0) });

function tap(s, ep, t) {
  const step = ep.steps[s.player.at];
  const [player, cues] = story.play(ep)(s.player, t);
  const end = cues.find((c) => c.t === 'finished');
  if (end) {
    const first = !s.finished[ep.skill];
    const done = { ...s, screen: 'done', player, rec: 'idle', nudge: false, paused: false, finished: first ? { ...s.finished, [ep.skill]: s.day } : s.finished, streak: touch(s.streak, s.day) };
    const up = upcoming(done);
    return [done, [{ t: 'hush' }, { t: 'cheer' }, say(done, 'ui.done.title'), say(done, 'ui.done.body'), ...(up && up.tease ? [say(done, 'ui.tomorrow.title'), { t: 'speak', text: up.tease, lang: 'own' }] : [])]];
  }
  const moved = player.at !== s.player.at, now = { ...s, player, rec: moved ? 'idle' : s.rec };
  if (moved) { const next = ep.steps[player.at]; return [{ ...now, nudge: false, paused: false }, [{ t: 'hush' }, ...cues, ...(playsItself(next) ? [andThen(now, cues)] : [])]]; }
  if (t.t === 'again') return [now, [{ t: 'hush' }, ...cues, ...(!s.paused && (playsItself(step) || (player.ready && step.t !== 'recap')) ? [andThen(now, cues)] : [])]];
  if (cues.some((c) => c.t === 'retry')) return [{ ...now, nudge: true }, [...cues, say(s, 'ui.retry')]];
  // A right choice, or a line said (or passed over): a short beat, then the story carries on by itself.
  if (player.ready && !s.player.ready) return [{ ...now, nudge: false }, [...cues, andThen(now, [])]];
  return [now, cues];
}

function main(s0, e) {
  const s = e.day ? { ...s0, day: e.day } : s0;
  const ep = s.screen === 'play' && s.player ? episodeOf(s) : null;
  switch (e.t) {
    case 'opened': return [home({ ...s, canCount: !!e.canCount, canRemind: !!e.canRemind }), []]; // nothing is spoken before the first tap: browsers do not allow it
    case 'lang': return LOCALES[e.lang] ? arrive(home({ ...s, lang: e.lang })) : [s, []];
    case 'track': return TRACKS[e.track] ? arrive(home({ ...s, track: e.track })) : [s, []];
    case 'home': case 'quit': return arrive(home(s));
    case 'settings': return [{ ...s, screen: 'settings', player: null }, [{ t: 'hush' }]];
    // The shell has read which voice packs exist.
    case 'voices': { const now = { ...s, packs: Array.isArray(e.packs) ? e.packs : [], fallback: e.fallback || '' }; return [now, ahead(now)]; }
    // The learner picks a voice: remember it and let them hear it at once.
    case 'voice': { if (!s.packs.some((p) => p.id === e.pack)) return [s, []]; const now = { ...s, voice: e.pack }; return [now, [{ t: 'hush' }, say(now, 'ui.done.body')]]; }
    case 'start': {
      const first = episodeOf(s, e.n); if (!first) return [s, []];
      const [player, cues] = story.begin(first), now = { ...s, screen: 'play', n: e.n, player, rec: 'idle', nudge: false, paused: false };
      return [now, [{ t: 'hush' }, ...cues, ...(playsItself(first.steps[0]) ? [andThen(now, cues)] : [])]];
    }
    case 'tap': return ep ? tap(s, ep, e.tap) : [s, []];
    // The shell reports that a step's voice has finished: move on, unless the learner paused or has gone elsewhere.
    case 'spoken': return ep && !s.paused && e.n === s.n && e.at === s.player.at && s.player.ready && ep.steps[s.player.at].t !== 'recap' ? tap(s, ep, { t: 'next' }) : [s, []];
    case 'pause': {
      if (!ep) return [s, []];
      if (!s.paused) return [{ ...s, paused: true }, [{ t: 'hush' }]];
      return tap({ ...s, paused: false }, ep, { t: 'again' });
    }
    case 'hear': return [s, [{ t: 'hush' }, { t: 'speak', text: e.text, lang: 'target' }]];
    // Speaking: one tap starts recording, the next (or four seconds) stops it; the shell then plays the
    // line and the learner's own voice, and reports the line as said.
    case 'mic': return !ep ? [s, []] : s.rec === 'on' ? [{ ...s, rec: 'idle' }, [{ t: 'record-stop' }]] : [{ ...s, rec: 'on' }, [{ t: 'hush' }, { t: 'record-start' }]];
    case 'mic-failed': return [{ ...s, mic: false, rec: 'idle' }, []];
    case 'remind': return [s, [{ t: 'remind' }]];
    case 'reminded': return [{ ...s, bell: !!e.ok, canRemind: !!e.ok }, []];
    case 'installable': return [{ ...s, installable: !!e.on }, []];
    case 'install': return [{ ...s, installable: false }, [{ t: 'install' }]];
    case 'share': return [s, [{ t: 'share', text: text(s, 'ui.share.text') }]];
    default: return [s, []];
  }
}

/** What the meter should hear about a step. Only ever short names; see docs/analytics.md. */
export function signalsFor(before, e, after) {
  if (e.t === 'counting') return [{ t: 'opt', on: !!e.on }, ...(e.on && after.lang ? [{ t: 'open', day: after.day }] : [])];
  if (e.t === 'sent' || e.t === 'failed') return [e];
  if (!after.canCount || !after.lang) return [];
  const day = after.day, unit = (s) => `${s.track}-${(CURRICULUM.skills[s.n - 1] || {}).id}`;
  const out = [];
  if (e.t === 'opened' || e.t === 'online' || (e.t === 'lang' && !before.lang)) out.push({ t: 'open', day });   // 'online': send whatever waited
  if (e.t === 'track' && after.track) out.push({ t: 'count', day, name: 'track/' + after.track, once: true });
  if (e.t === 'start' && after.screen === 'play') out.push({ t: 'start', day, unit: unit(after) });
  if (e.t === 'quit' && before.screen === 'play' && before.player) out.push({ t: 'quit', day, unit: unit(before), at: before.player.at });
  if (e.t === 'tap' && before.screen === 'play' && before.player && after.player) {
    if (after.screen === 'done') out.push({ t: 'done', day, unit: unit(before) });
    if (after.player.spoken > before.player.spoken) out.push({ t: 'count', day, name: 'spoke' });
    if (e.tap.t === 'skip' && after.player.ready && !before.player.ready) out.push({ t: 'count', day, name: 'skipped' });
  }
  if (e.t === 'reminded' && e.ok) out.push({ t: 'count', day, name: 'reminder', once: true });
  if (e.t === 'install') out.push({ t: 'count', day, name: 'install-asked', once: true });
  if (e.t === 'voice' && after.voice !== before.voice) out.push({ t: 'count', day, name: 'voice/' + after.voice });
  return out;
}

/** The app: the rules above, then the meter, then "save" if anything worth keeping changed. */
export function update(s, e) {
  const [mid, fx] = main(s, e);
  const [m, sends] = fold(meter({ app: 'lets', lang: mid.lang }), mid.meter, signalsFor(s, e, mid));
  const next = m === mid.meter ? mid : { ...mid, meter: m };
  const keep = JSON.stringify(toSave(next)) !== JSON.stringify(toSave(s));
  return [next, [...fx, ...sends, ...(keep ? [{ t: 'save' }] : [])]];
}
