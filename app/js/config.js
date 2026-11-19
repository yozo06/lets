// Facts about this copy of the app.
export const VERSION = '0.4.0';
/** Where anonymous usage counts go (a GoatCounter site). Empty turns counting off. Forks: use your own or leave it empty. */
export const COUNT_ENDPOINT = 'https://yozo.goatcounter.com/count';
/** A serial with a little slack: how many new episodes may be watched in one day. The first opens by itself;
 *  the rest are offered beside tomorrow's teaser, for the learner who wants more. 1 = strictly one a day. */
export const PER_DAY = 2;
/** The link people share with friends. */
/** Voice packs (app/audio/<id>/), and how each is shown to someone who cannot read its name: a drawn person and a word. */
export const VOICES = { gokul: { who: 'clerk', name: 'ui.voice.man' }, roopa: { who: 'teacher', name: 'ui.voice.woman' } };
export const SHARE_URL = 'https://yozo06.github.io/lets/';
