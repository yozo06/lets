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
  // ----- not saved -----
  screen: 'lang',      // lang | track | home | play | done | settings
  n: 0,                // episode being played
  player: null,        // where the learner is inside it
  day: '',             // today, as told by the last event
  canCount: false,     // whether this copy may send counts at all
  mic: true,           // false once recording has failed on this phone
  rec: 'idle',         // idle | on | have
  nudge: false,        // true just after a wrong choice
};
const TRANSIENT = { screen: 'lang', n: 0, player: null, day: '', canCount: false, mic: true, rec: 'idle', nudge: false };
/** The part of the state worth keeping. */
export const toSave = (s) => ({ v: s.v, lang: s.lang, track: s.track, finished: s.finished, streak: s.streak, meter: s.meter });
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

/* ---------- the rules ---------- */

const say = (s, key, vars) => ({ t: 'speak', text: text(s, key, vars), lang: 'own' });
const home = (s) => ({ ...s, screen: s.lang ? (s.track ? 'home' : 'track') : 'lang', player: null, n: 0, rec: 'idle', nudge: false });
/** What to say when a screen opens, so that nobody has to read to know what to do. */
const greet = (s) => (s.screen === 'track' ? [say(s, 'ui.pick.track')] : s.screen === 'home' && todayOf(s).next ? [say(s, 'ui.press.play')] : []);
const arrive = (s) => [s, [{ t: 'hush' }, ...greet(s)]];

function main(s0, e) {
  const s = e.day ? { ...s0, day: e.day } : s0;
  switch (e.t) {
    case 'opened': return [home({ ...s, canCount: !!e.canCount }), []]; // nothing is spoken before the first tap: browsers do not allow it
    case 'lang': return LOCALES[e.lang] ? arrive(home({ ...s, lang: e.lang })) : [s, []];
    case 'track': return TRACKS[e.track] ? arrive(home({ ...s, track: e.track })) : [s, []];
    case 'home': return arrive(home(s));
    case 'settings': return [{ ...s, screen: 'settings', player: null }, [{ t: 'hush' }]];
    case 'choose-lang': return [{ ...s, screen: 'lang', player: null }, [{ t: 'hush' }]];
    case 'choose-track': return arrive({ ...s, screen: 'track', player: null });
    case 'start': {
      const ep = episodeOf(s, e.n); if (!ep) return [s, []];
      const [player, cues] = story.begin(ep);
      return [{ ...s, screen: 'play', n: e.n, player, rec: 'idle', nudge: false }, [{ t: 'hush' }, ...cues]];
    }
    case 'tap': {
      const ep = s.screen === 'play' && s.player ? episodeOf(s) : null; if (!ep) return [s, []];
      const [player, cues] = story.play(ep)(s.player, e.tap);
      const moved = player.at !== s.player.at;
      const end = cues.find((c) => c.t === 'finished');
      if (end) {
        const first = !s.finished[ep.skill];
        const done = { ...s, screen: 'done', player, rec: 'idle', nudge: false, finished: first ? { ...s.finished, [ep.skill]: s.day } : s.finished, streak: touch(s.streak, s.day) };
        return [done, [{ t: 'hush' }, { t: 'cheer' }, say(done, 'ui.done.title'), say(done, 'ui.done.body')]];
      }
      const retry = cues.some((c) => c.t === 'retry');
      const fx = [...(moved || e.tap.t === 'again' ? [{ t: 'hush' }] : []), ...cues, ...(retry ? [say(s, 'ui.retry')] : [])];
      return [{ ...s, player, rec: moved ? 'idle' : s.rec, nudge: retry }, fx];
    }
    case 'quit': return arrive(home(s));
    case 'hear': return [s, [{ t: 'hush' }, { t: 'speak', text: e.text, lang: 'target' }]];
    // Record-and-compare: tap to start, tap again (or wait) to stop, then hear the line and yourself.
    case 'mic': return s.rec === 'on' ? [{ ...s, rec: 'have' }, [{ t: 'record-stop' }]] : [{ ...s, rec: 'on' }, [{ t: 'hush' }, { t: 'record-start' }]];
    case 'mic-failed': return [{ ...s, mic: false, rec: 'idle' }, []];
    case 'counting': return [s, []];   // handled by the meter below
    case 'share': return [s, [{ t: 'share', text: text(s, 'ui.share.text') }]];
    default: return [s, []];
  }
}

/** What the meter should hear about a step. Only ever short names; see docs/analytics.md. */
export function signalsFor(before, e, after) {
  if (e.t === 'counting') return [{ t: 'opt', on: !!e.on }, ...(e.on && after.lang ? [{ t: 'open', day: after.day }] : [])];
  if (e.t === 'sent' || e.t === 'failed') return [e];
  if (!after.canCount || !after.lang) return [];
  const day = after.day, unit = (s) => `${s.track}-${CURRICULUM.skills[s.n - 1]?.id}`;
  const out = [];
  if (e.t === 'opened' || (e.t === 'lang' && !before.lang)) out.push({ t: 'open', day });
  if (e.t === 'track' && after.track) out.push({ t: 'count', day, name: 'track/' + after.track, once: true });
  if (e.t === 'start' && after.screen === 'play') out.push({ t: 'start', day, unit: unit(after) });
  if (e.t === 'quit' && before.screen === 'play' && before.player) out.push({ t: 'quit', day, unit: unit(before), at: before.player.at });
  if (e.t === 'tap' && before.screen === 'play') {
    if (after.screen === 'done') out.push({ t: 'done', day, unit: unit(before) });
    if (before.player && after.player && after.player.spoken > before.player.spoken) out.push({ t: 'count', day, name: 'spoke' });
    if (e.tap.t === 'skip' && after.player !== before.player) out.push({ t: 'count', day, name: 'skipped' });
  }
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
