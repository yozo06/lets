import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULUM, TRACKS, LOCALES, ART, CAST } from '../app/content/index.js';
import { missing, buildEpisode } from '../app/vendor/sutra/story/index.js';
import { coverage } from '../app/vendor/sutra/i18n/index.js';

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

test('every picture and speaker a scene names really exists', () => {
  for (const track of Object.values(TRACKS)) {
    assert.ok(CAST[track.who], `track ${track.id} needs a face`);
    for (const scene of Object.values(track.scenes)) for (const b of scene.beats) {
      if (b.art) assert.ok(ART[b.art], `no picture "${b.art}"`);
      if (b.who) assert.ok(CAST[b.who], `nobody called "${b.who}"`);
      for (const o of b.options || []) assert.ok(ART[o.art], `no picture "${o.art}"`);
    }
  }
});

test('an episode is short enough for a few minutes and ends on its recap', () => {
  for (const track of Object.values(TRACKS)) for (const locale of Object.values(LOCALES)) CURRICULUM.skills.forEach((_, i) => {
    const e = buildEpisode(CURRICULUM, track, locale, i + 1).value;
    assert.ok(e.steps.length >= 6 && e.steps.length <= 16, `${e.id} has ${e.steps.length} steps`);
    assert.equal(e.steps.at(-1).t, 'recap');
    assert.ok(e.steps.some((s) => s.t === 'say'), 'the learner gets to speak');
    assert.ok(e.steps.some((s) => s.t === 'choose'), 'the learner gets to choose');
  });
});
