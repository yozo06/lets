import { test } from 'node:test';
import assert from 'node:assert/strict';
import { init, update, fromSave, toSave, episodeOf, todayOf, learned, text } from '../app/js/program.js';
import { fold } from '../app/vendor/sutra/core/program.js';

const D1 = '2026-11-16', D2 = '2026-11-17';
const run = (s, events) => fold(update, s, events);
const kinds = (fx) => fx.map((f) => f.t);
const spoken = (fx) => fx.filter((f) => f.t === 'speak').map((f) => f.text);
const hits = (fx) => fx.filter((f) => f.t === 'send').flatMap((f) => f.hits.map((h) => h.name));
/** Play the open episode to the end the patient way: right answers, say every line. */
const finish = (s) => {
  let all = [];
  for (let i = 0; i < 200 && s.screen === 'play'; i++) {
    const step = episodeOf(s).steps[s.player.at];
    const tap = s.player.ready ? { t: 'next' } : step.t === 'choose' ? { t: 'pick', option: step.answer } : { t: 'said' };
    const [next, fx] = update(s, { t: 'tap', tap, day: s.day }); s = next; all = all.concat(fx);
  }
  return [s, all];
};
const ready = (lang = 'hi', track = 'work', canCount = false) => run(init, [{ t: 'opened', day: D1, canCount }, { t: 'lang', lang, day: D1 }, { t: 'track', track, day: D1 }])[0];

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

test('an episode plays from the first line to "well done", and is remembered', () => {
  let [s, fx] = update(ready(), { t: 'start', n: 1, day: D1 });
  assert.equal(s.screen, 'play'); assert.deepEqual(spoken(fx), ['रवि और आशा गाँव से शहर आए हैं। आज रवि का काम पर पहला दिन है।']);
  const ep = episodeOf(s);
  assert.equal(ep.title, 'पहला दिन'); assert.equal(ep.steps.at(-1).t, 'recap');
  [s, fx] = finish(s);
  assert.equal(s.screen, 'done'); assert.deepEqual(s.finished, { hello: D1 }); assert.equal(s.streak.n, 1);
  assert.ok(spoken(fx).includes('Hello'), 'the English line was spoken');
  assert.ok(spoken(fx).includes('शाबाश!'));
  assert.deepEqual(learned(s).map((l) => [l.line.text, l.sound, l.meaning]), [['Hello', 'हेलो', 'नमस्ते']]);
  assert.deepEqual(todayOf(s), { next: undefined, wait: false, seen: [1] }, 'episode 1 is the only one so far');
});

test('the same lesson is a different story for a different learner and language', () => {
  const a = episodeOf({ ...ready('hi', 'work'), n: 1 }), b = episodeOf({ ...ready('or', 'home'), n: 1 });
  assert.notEqual(a.steps[0].text, b.steps[0].text);
  assert.deepEqual(a.steps.filter((x) => x.t === 'teach').map((x) => x.line.text), b.steps.filter((x) => x.t === 'teach').map((x) => x.line.text), 'the English taught is identical');
  assert.equal(b.title, 'ନୂଆ ସ୍କୁଲ୍'); assert.equal(b.steps.find((x) => x.t === 'teach').sound, 'ହେଲୋ');
});

test('a wrong choice is not a failure: a gentle retry, and the story still finishes', () => {
  let [s] = update(ready(), { t: 'start', n: 1, day: D1 }); let fx;
  while (episodeOf(s).steps[s.player.at].t !== 'choose') [s] = update(s, { t: 'tap', tap: { t: 'next' }, day: D1 });
  const step = episodeOf(s).steps[s.player.at]; const wrong = step.options.find((o) => o.id !== step.answer).id;
  [s, fx] = update(s, { t: 'tap', tap: { t: 'pick', option: wrong }, day: D1 });
  assert.equal(s.screen, 'play'); assert.equal(s.nudge, true); assert.ok(kinds(fx).includes('retry')); assert.ok(spoken(fx).includes('एक बार और कोशिश कीजिए।'));
  [s, fx] = update(s, { t: 'tap', tap: { t: 'pick', option: step.answer }, day: D1 });
  assert.equal(s.nudge, false); assert.ok(kinds(fx).includes('cheer'));
  [s] = finish(s); assert.equal(s.screen, 'done');
});

test('leaving half way loses nothing and nothing is marked finished', () => {
  let [s] = run(ready(), [{ t: 'start', n: 1, day: D1 }, { t: 'tap', tap: { t: 'next' }, day: D1 }, { t: 'quit', day: D1 }]);
  assert.equal(s.screen, 'home'); assert.equal(s.player, null); assert.deepEqual(s.finished, {});
});

test('saving keeps progress and drops what was on screen', () => {
  let [s] = update(ready('or', 'home'), { t: 'start', n: 1, day: D1 }); [s] = finish(s);
  const back = fromSave(JSON.parse(JSON.stringify(toSave(s))));
  assert.deepEqual([back.lang, back.track, back.finished, back.streak.n, back.screen, back.player], ['or', 'home', { hello: D1 }, 1, 'lang', null]);
  assert.equal(update(back, { t: 'opened', day: D2, canCount: false })[0].screen, 'home', 'a returning learner goes straight to today');
  assert.deepEqual(fromSave(null).lang, ''); assert.deepEqual(fromSave({ v: 99, lang: 'hi' }).lang, '', 'a save from an unknown version is ignored');
});

test('coming back the next day extends the streak when an episode is finished', () => {
  let [s] = update(ready(), { t: 'start', n: 1, day: D1 }); [s] = finish(s);
  [s] = run(s, [{ t: 'opened', day: D2, canCount: false }, { t: 'start', n: 1, day: D2 }]); [s] = finish(s);
  assert.equal(s.streak.n, 2); assert.deepEqual(s.finished, { hello: D1 }, 'a replay does not change the first finish day');
});

test('counting: only short names leave the phone, tagged with app and language', () => {
  let [s, fx] = run(init, [{ t: 'opened', day: D1, canCount: true }]);
  assert.deepEqual(hits(fx), [], 'nothing is counted before a language is chosen');
  [s, fx] = run(s, [{ t: 'lang', lang: 'hi', day: D1 }]);
  assert.deepEqual(hits(fx), ['lets/hi/new', 'lets/hi/day']);
  [s] = update(s, { t: 'sent', n: 2 });
  [s, fx] = run(s, [{ t: 'track', track: 'work', day: D1 }]); assert.deepEqual(hits(fx), ['lets/hi/track/work']); [s] = update(s, { t: 'sent', n: 1 });
  [s, fx] = run(s, [{ t: 'start', n: 1, day: D1 }]); assert.deepEqual(hits(fx), ['lets/hi/unit/work-hello/start']); [s] = update(s, { t: 'sent', n: 1 });
  [s, fx] = run(s, [{ t: 'tap', tap: { t: 'next' }, day: D1 }, { t: 'quit', day: D1 }]); assert.deepEqual(hits(fx), ['lets/hi/unit/work-hello/quit/1']); [s] = update(s, { t: 'sent', n: 1 });
  [s] = update(s, { t: 'start', n: 1, day: D1 }); let all; [s, all] = finish(s);
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

test('record-and-compare is a small state machine, and a phone without a microphone just hides it', () => {
  let [s, fx] = update({ ...ready(), screen: 'play' }, { t: 'mic' });
  assert.deepEqual([s.rec, kinds(fx)], ['on', ['hush', 'record-start']]);
  [s, fx] = update(s, { t: 'mic' }); assert.deepEqual([s.rec, kinds(fx)], ['have', ['record-stop']]);
  [s] = update(s, { t: 'mic-failed' }); assert.deepEqual([s.mic, s.rec], [false, 'idle']);
});

test('text falls back to the key rather than breaking', () => { assert.equal(text(ready(), 'no.such.key'), 'no.such.key'); assert.equal(text(ready(), 'ui.episode', { n: 3 }), 'भाग 3'); });

test('everything the app says aloud is on the list used to record voices', async () => {
  const { spokenTexts } = await import('../app/js/spoken.js');
  const known = new Set(spokenTexts().map((x) => x.text));
  for (const lang of ['hi', 'or']) for (const track of ['work', 'home']) {
    let [s, fx] = run(init, [{ t: 'opened', day: D1, canCount: false }, { t: 'lang', lang, day: D1 }, { t: 'track', track, day: D1 }, { t: 'start', n: 1, day: D1 }]);
    let said = spoken(fx);
    for (let i = 0; i < 200 && s.screen === 'play'; i++) {   // tap every wrong picture first, then carry on
      const step = episodeOf(s).steps[s.player.at];
      const wrong = step.t === 'choose' && !s.player.ready ? step.options.find((o) => o.id !== step.answer && !s.player.tried.includes(o.id)) : null;
      const tap = s.player.ready ? { t: 'next' } : wrong ? { t: 'pick', option: wrong.id } : step.t === 'choose' ? { t: 'pick', option: step.answer } : { t: 'said' };
      const [next, more] = update(s, { t: 'tap', tap, day: D1 }); s = next; said = said.concat(spoken(more));
    }
    assert.equal(s.screen, 'done');
    for (const words of said) assert.ok(known.has(words), `not on the recording list: ${words}`);
  }
  assert.ok(spokenTexts().some((x) => x.lang === 'en' && x.text === 'Hello'));
});
