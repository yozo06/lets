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
