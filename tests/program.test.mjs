import { test } from 'node:test';
import assert from 'node:assert/strict';
import { init, update, fromSave, toSave, episodeOf, todayOf, learned, upcoming, reminderFor, text } from '../app/js/program.js';
import { fold } from '../app/vendor/sutra/core/program.js';

const D1 = '2026-11-16', D2 = '2026-11-17', D3 = '2026-11-18';
const run = (s, events) => fold(update, s, events);
const kinds = (fx) => fx.map((f) => f.t);
const spoken = (fx) => fx.filter((f) => f.t === 'speak').map((f) => f.text);
const hits = (fx) => fx.filter((f) => f.t === 'send').flatMap((f) => f.hits.map((h) => h.name));
const stepNow = (s) => episodeOf(s).steps[s.player.at];
/** The shell's side of the conversation: answer every "after-speech" with "spoken", as a phone would. */
function settle(s, fx) {
  let all = [...fx], todo = fx.filter((f) => f.t === 'after-speech');
  while (todo.length) { const a = todo.shift(); const [next, more] = update(s, { t: 'spoken', n: a.n, at: a.at }); s = next; all = all.concat(more); todo = todo.concat(more.filter((f) => f.t === 'after-speech')); }
  return [s, all];
}
/** Watch an episode the way a learner would: it plays by itself; they only choose, speak and finish. */
function watch(s, { wrongFirst = false } = {}) {
  let all = [], taps = 0;
  for (let i = 0; i < 80 && s.screen === 'play'; i++) {
    const step = stepNow(s);
    const wrong = wrongFirst && step.t === 'choose' ? step.options.find((o) => o.id !== step.answer && !s.player.tried.includes(o.id)) : null;
    const tap = step.t === 'choose' ? { t: 'pick', option: wrong ? wrong.id : step.answer } : step.t === 'say' ? { t: 'said' } : { t: 'next' };
    assert.ok(step.t === 'choose' || step.t === 'say' || step.t === 'recap', `the story stopped by itself on a "${step.t}" step`);
    const [a, fx] = update(s, { t: 'tap', tap, day: s.day }); taps++;
    const [b, more] = settle(a, fx); s = b; all = all.concat(more);
  }
  return [s, all, taps];
}
const begin = (s, n, day = D1) => { const [a, fx] = update(s, { t: 'start', n, day }); return settle(a, fx); };
const ready = (lang = 'hi', track = 'work', canCount = false) => run(init, [{ t: 'opened', day: D1, canCount, canRemind: true }, { t: 'lang', lang, day: D1 }, { t: 'track', track, day: D1 }])[0];

test('first visit: pick a language, pick a story, land on today\'s episode', () => {
  let [s, fx] = update(init, { t: 'opened', day: D1, canCount: false });
  assert.equal(s.screen, 'lang'); assert.deepEqual(spoken(fx), [], 'nothing is spoken before the first tap');
  [s, fx] = update(s, { t: 'lang', lang: 'hi', day: D1 });
  assert.equal(s.screen, 'track'); assert.deepEqual(spoken(fx), ['आप किसकी कहानी देखेंगे?'], 'the question is asked aloud');
  [s, fx] = update(s, { t: 'track', track: 'home', day: D1 });
  assert.equal(s.screen, 'home'); assert.deepEqual(todayOf(s), { next: 1, wait: false, seen: [] });
  assert.ok(kinds(fx).includes('save'));
  assert.deepEqual(update(s, { t: 'lang', lang: 'xx', day: D1 })[0], s, 'an unknown language changes nothing');
});

test('the story plays by itself: each line moves on when its voice has finished', () => {
  let [s, fx] = update(ready(), { t: 'start', n: 1, day: D1 });
  assert.deepEqual(kinds(fx), ['hush', 'speak', 'after-speech']); assert.equal(s.player.at, 0);
  const wait = fx.find((f) => f.t === 'after-speech');
  assert.deepEqual([wait.n, wait.at, wait.chars > 20], [1, 0, true], 'the shell is told how much there was to read, in case there is no voice');
  [s, fx] = update(s, { t: 'spoken', n: 1, at: 0 });
  assert.equal(s.player.at, 1); assert.deepEqual(kinds(fx), ['hush', 'speak', 'after-speech']);
  assert.deepEqual(update(s, { t: 'spoken', n: 1, at: 0 })[0], s, 'a late report about an earlier line is ignored');
  assert.deepEqual(update(s, { t: 'spoken', n: 2, at: 1 })[0], s, 'and so is one about another episode');
});

test('it stops only where the learner has something to do', () => {
  const [s, , taps] = watch(begin(ready(), 1)[0]);
  const ep = episodeOf({ ...ready(), n: 1 });
  const mine = ep.steps.filter((x) => x.t === 'choose' || x.t === 'say' || x.t === 'recap').length;
  assert.equal(s.screen, 'done'); assert.equal(taps, mine, `${taps} taps for ${ep.steps.length} steps`);
  assert.ok(taps <= 6);
});

test('pause holds the story; resume says the line again and carries on', () => {
  let [s, fx] = update(ready(), { t: 'start', n: 1, day: D1 });
  [s, fx] = update(s, { t: 'pause' }); assert.equal(s.paused, true); assert.deepEqual(kinds(fx), ['hush']);
  assert.equal(update(s, { t: 'spoken', n: 1, at: 0 })[0].player.at, 0, 'nothing moves while paused');
  [s, fx] = update(s, { t: 'pause' }); assert.equal(s.paused, false); assert.deepEqual(kinds(fx), ['hush', 'speak', 'after-speech']);
  [s] = update(s, { t: 'tap', tap: { t: 'next' }, day: D1 }); assert.equal(s.player.at, 1, 'the learner can still skip ahead by hand');
});

test('finishing: well done, the line to take away, and tomorrow\'s hook said aloud', () => {
  const [s, fx] = watch(begin(ready(), 1)[0]);
  assert.equal(s.screen, 'done'); assert.deepEqual(s.finished, { hello: D1 }); assert.equal(s.streak.n, 1);
  assert.ok(spoken(fx).includes('Hello'));
  assert.deepEqual(spoken(fx).slice(-4), ['शाबाश!', 'आज ही किसी से बोलकर देखिए।', 'कल की कहानी', 'मालिक ने क्या पूछा? रवि क्या जवाब देगा?']);
  assert.deepEqual(learned(s).map((l) => [l.line.text, l.sound, l.meaning]), [['Hello', 'हेलो', 'नमस्ते']]);
  assert.deepEqual(todayOf(s), { next: undefined, wait: true, seen: [1] }, 'the next episode opens tomorrow');
  assert.deepEqual(upcoming(s), { n: 2, title: 'आपका नाम?', tease: 'मालिक ने क्या पूछा? रवि क्या जवाब देगा?', art: 'shop boss:talk ravi:shock' });
});

test('the next day the second episode is there, and after it the shelf is empty until more is written', () => {
  let [s] = watch(begin(ready(), 1)[0]);
  [s] = update(s, { t: 'opened', day: D2, canCount: false });
  assert.deepEqual(todayOf(s), { next: 2, wait: false, seen: [1] });
  let fx; [s, fx] = watch(begin(s, 2, D2)[0]);
  assert.deepEqual(s.finished, { hello: D1, name: D2 }); assert.equal(s.streak.n, 2);
  assert.deepEqual(learned(s).map((l) => l.line.text), ['Hello', 'What is your name?', 'My name is']);
  assert.equal(upcoming(s), null); assert.ok(!spoken(fx).includes('कल की कहानी'), 'no promise of an episode that does not exist');
  assert.deepEqual(todayOf({ ...s, day: D3 }), { next: undefined, wait: false, seen: [1, 2] });
});

test('the same lesson is a different story for a different learner and language', () => {
  const a = episodeOf({ ...ready('hi', 'work'), n: 2 }), b = episodeOf({ ...ready('or', 'home'), n: 2 });
  assert.notEqual(a.steps[1].text, b.steps[1].text);
  assert.deepEqual(a.steps.filter((x) => x.t === 'teach').map((x) => x.line.text), b.steps.filter((x) => x.t === 'teach').map((x) => x.line.text), 'the English taught is identical');
  assert.equal(b.title, 'ଆପଣଙ୍କ ନାମ?'); assert.equal(b.steps.find((x) => x.t === 'teach').sound, 'ହ୍ୱାଟ୍ ଇଜ୍ ୟୋର୍ ନେମ୍?');
});

test('a wrong choice is not a failure: a gentle retry, a hint, and the story still finishes', () => {
  let [s] = begin(ready(), 1); let fx;
  assert.equal(stepNow(s).t, 'choose', 'the story ran by itself up to the first choice');
  const step = stepNow(s), wrong = step.options.filter((o) => o.id !== step.answer).map((o) => o.id);
  [s, fx] = update(s, { t: 'tap', tap: { t: 'pick', option: wrong[0] }, day: D1 });
  assert.equal(s.screen, 'play'); assert.equal(s.nudge, true); assert.ok(kinds(fx).includes('retry')); assert.ok(spoken(fx).includes('एक बार और कोशिश कीजिए।'));
  assert.ok(!kinds(fx).includes('after-speech'), 'a wrong answer never moves the story on');
  [s] = update(s, { t: 'tap', tap: { t: 'pick', option: wrong[1] }, day: D1 }); assert.equal(s.player.hint, true);
  [s, fx] = update(s, { t: 'tap', tap: { t: 'pick', option: step.answer }, day: D1 });
  assert.equal(s.nudge, false); assert.deepEqual(kinds(fx), ['cheer', 'after-speech']);
  [s] = watch(settle(s, fx)[0], { wrongFirst: true }); assert.equal(s.screen, 'done');
});

test('speaking: the microphone starts and stops a recording, and a said line moves the story on', () => {
  let [s] = begin(ready(), 1); let fx;
  while (stepNow(s).t !== 'say') { const st = stepNow(s); const [a, f] = update(s, { t: 'tap', tap: { t: 'pick', option: st.answer }, day: D1 }); [s] = settle(a, f); }
  [s, fx] = update(s, { t: 'mic' }); assert.deepEqual([s.rec, kinds(fx)], ['on', ['hush', 'record-start']]);
  [s, fx] = update(s, { t: 'mic' }); assert.deepEqual([s.rec, kinds(fx)], ['idle', ['record-stop']]);
  const at = s.player.at;
  [s, fx] = update(s, { t: 'tap', tap: { t: 'said' }, day: D1 });   // the shell reports this once the learner has heard themselves
  assert.equal(s.player.spoken, 1); assert.deepEqual(kinds(fx), ['cheer', 'after-speech']);
  [s] = settle(s, fx); assert.ok(s.player.at > at);
  assert.deepEqual([update(s, { t: 'mic-failed' })[0].mic, update(s, { t: 'mic-failed' })[0].rec], [false, 'idle'], 'a phone with no microphone just hides the button');
});

test('leaving half way loses nothing and nothing is marked finished', () => {
  let [s] = begin(ready(), 1); [s] = update(s, { t: 'quit', day: D1 });
  assert.equal(s.screen, 'home'); assert.equal(s.player, null); assert.deepEqual(s.finished, {});
});

test('saving keeps progress and drops what was on screen', () => {
  let [s] = watch(begin(ready('or', 'home'), 1)[0]); [s] = update(s, { t: 'reminded', ok: true, day: D1 });
  const back = fromSave(JSON.parse(JSON.stringify(toSave(s))));
  assert.deepEqual([back.lang, back.track, back.finished, back.streak.n, back.bell, back.screen, back.player, back.paused], ['or', 'home', { hello: D1 }, 1, true, 'lang', null, false]);
  assert.equal(update(back, { t: 'opened', day: D2, canCount: false })[0].screen, 'home', 'a returning learner goes straight to today');
  assert.deepEqual(fromSave(null).lang, ''); assert.deepEqual(fromSave({ v: 99, lang: 'hi' }).lang, '', 'a save from an unknown version is ignored');
});

test('reminders: asked for by the learner, about a real episode, and only from the next day', () => {
  let [s] = watch(begin(ready(), 1)[0]);
  assert.equal(reminderFor(s).show, false, 'never without being asked');
  let fx; [s, fx] = update(s, { t: 'remind', day: D1 }); assert.deepEqual(kinds(fx), ['remind']);
  [s, fx] = update(s, { t: 'reminded', ok: true, day: D1 }); assert.equal(s.bell, true); assert.ok(kinds(fx).includes('save'));
  assert.deepEqual(reminderFor(s), { show: true, after: D1, title: 'आज की कहानी तैयार है', body: 'मालिक ने क्या पूछा? रवि क्या जवाब देगा?' });
  assert.deepEqual([update(s, { t: 'reminded', ok: false, day: D1 })[0].bell, update(s, { t: 'reminded', ok: false, day: D1 })[0].canRemind], [false, false], 'a phone that refuses just hides the bell');
  [s] = update(s, { t: 'opened', day: D2, canCount: false }); [s] = watch(begin(s, 2, D2)[0]);
  assert.equal(reminderFor(s).show, false, 'nothing to remind about once every episode is finished');
});

test('coming back online sends waiting counts without disturbing the story', () => {
  let [s] = begin(ready('hi', 'work', true), 1); const at = s.player.at;
  [s] = update(s, { t: 'online', day: D1 }); assert.deepEqual([s.screen, s.player.at], ['play', at]);
});

test('counting: only short names leave the phone, tagged with app and language', () => {
  let [s, fx] = run(init, [{ t: 'opened', day: D1, canCount: true }]);
  assert.deepEqual(hits(fx), [], 'nothing is counted before a language is chosen');
  [s, fx] = run(s, [{ t: 'lang', lang: 'hi', day: D1 }]); assert.deepEqual(hits(fx), ['lets/hi/new', 'lets/hi/day']); [s] = update(s, { t: 'sent', n: 2 });
  [s, fx] = run(s, [{ t: 'track', track: 'work', day: D1 }]); assert.deepEqual(hits(fx), ['lets/hi/track/work']); [s] = update(s, { t: 'sent', n: 1 });
  [s, fx] = run(s, [{ t: 'start', n: 1, day: D1 }]); assert.deepEqual(hits(fx), ['lets/hi/unit/work-hello/start']); [s] = update(s, { t: 'sent', n: 1 });
  [s, fx] = run(s, [{ t: 'spoken', n: 1, at: 0 }, { t: 'quit', day: D1 }]); assert.deepEqual(hits(fx), ['lets/hi/unit/work-hello/quit/1']); [s] = update(s, { t: 'sent', n: 1 });
  let all; [s, all] = watch(begin(s, 1)[0]);
  const names = [...hits(all), ...s.meter.queue.map((h) => h.name)];
  assert.ok(names.includes('lets/hi/spoke')); assert.ok(names.includes('lets/hi/unit/work-hello/done'));
  for (const n of names) assert.match(n, /^lets\/hi\/[a-z0-9\/-]+$/);
});

test('counting can be switched off, and a copy that may not count never does', () => {
  let [s, fx] = run(init, [{ t: 'opened', day: D1, canCount: true }, { t: 'lang', lang: 'hi', day: D1 }, { t: 'counting', on: false }, { t: 'track', track: 'work', day: D1 }, { t: 'start', n: 1, day: D1 }]);
  assert.equal(s.meter.on, false); assert.equal(s.meter.queue.length, 0);
  assert.deepEqual(hits(fx), ['lets/hi/new', 'lets/hi/day'], 'only what was sent before switching off');
  [s, fx] = run(ready('hi', 'work', false), [{ t: 'start', n: 1, day: D1 }]);
  assert.deepEqual(hits(fx), []); assert.equal(s.meter.queue.length, 0);
});

test('everything the app says aloud is on the list used to record voices', async () => {
  const { spokenTexts } = await import('../app/js/spoken.js');
  const known = new Set(spokenTexts().map((x) => x.text));
  for (const lang of ['hi', 'or']) for (const track of ['work', 'home']) {
    let s = ready(lang, track), said = spoken(run(init, [{ t: 'opened', day: D1 }, { t: 'lang', lang, day: D1 }, { t: 'track', track, day: D1 }])[1]);
    for (const [n, day] of [[1, D1], [2, D2]]) {
      [s] = update(s, { t: 'opened', day, canCount: false });
      const [a, fx1] = begin(s, n, day); const [b, fx2] = watch(a, { wrongFirst: true }); s = b; said = said.concat(spoken(fx1), spoken(fx2));
      assert.equal(s.screen, 'done');
    }
    for (const words of said) assert.ok(known.has(words), `not on the recording list: ${words}`);
  }
  assert.ok(spokenTexts().some((x) => x.lang === 'en' && x.text === 'My name is'));
});

test('text falls back to the key rather than breaking', () => { assert.equal(text(ready(), 'no.such.key'), 'no.such.key'); assert.equal(text(ready(), 'ui.episode', { n: 3 }), 'भाग 3'); });
