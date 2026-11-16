// Everything the app can say aloud, as a list of { text, lang }. Pure.
// Used to record voice clips ahead of time (scripts/gen-audio-sarvam.mjs) and tested against
// the program, so that a line can never be spoken without being on this list.
import { buildEpisode } from '../vendor/sutra/story/index.js';
import { CURRICULUM, TRACKS, LOCALES } from '../content/index.js';

/** Interface sentences that are spoken, not just shown. */
export const SPOKEN_UI = ['ui.pick.track', 'ui.press.play', 'ui.retry', 'ui.done.title', 'ui.done.body'];

export function spokenTexts() {
  const seen = new Map();
  const put = (text, lang) => { if (text && !seen.has(lang + '|' + text)) seen.set(lang + '|' + text, { text, lang }); };
  for (const line of Object.values(CURRICULUM.lines)) put(line.text, 'en');
  for (const locale of Object.values(LOCALES)) {
    for (const key of SPOKEN_UI) put(locale.text[key], locale.id);
    for (const meaning of Object.values(locale.meaning)) put(meaning, locale.id);
    for (const track of Object.values(TRACKS)) CURRICULUM.skills.forEach((_, i) => {
      const built = buildEpisode(CURRICULUM, track, locale, i + 1); if (!built.ok) return;
      for (const step of built.value.steps) { if (step.t === 'tell') put(step.text, locale.id); if (step.t === 'choose') put(step.ask, locale.id); }
    });
  }
  return [...seen.values()];
}
