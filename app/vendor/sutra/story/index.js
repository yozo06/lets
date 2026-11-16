// Teaching through a serial story. Three things are kept apart so each can grow alone:
//
//   Curriculum  what is learned: ordered skills, each a few lines of the target language
//   Track       whose life the story follows (one per kind of learner): a scene for every skill
//   Locale      the language the story is told in: its text, and each line's meaning and sound
//
//   buildEpisode(curriculum, track, locale, n)  ->  an episode ready to play, or what is missing
//   play(episode)                               ->  the step function of the player; it cannot be failed
//
// A new kind of learner is a new Track. A new language is a new Locale. A new lesson is a new
// Skill, and `missing` lists exactly which scenes and translations it still needs.
import { err, ok } from '../core/result.js';
const opt = (key, value) => (value === undefined ? {} : { [key]: value });
/** Episode `n` (from 1) of a track, told in a locale. Either the whole episode or every problem with it. */
export const buildEpisode = (c, track, locale, n) => {
    const skill = c.skills[n - 1];
    if (!skill)
        return err([{ track: track.id, skill: '?', locale: locale.id, what: `there is no episode ${n}` }]);
    const problems = [];
    const bad = (what) => { problems.push({ track: track.id, skill: skill.id, locale: locale.id, what }); };
    const text = (key) => {
        const t = locale.text[key];
        if (t === undefined || t.trim() === '')
            bad(`no text for "${key}"`);
        return t ?? key;
    };
    const taught = (id) => {
        const line = c.lines[id];
        if (!line)
            bad(`unknown line "${id}"`);
        const [meaning, sound] = [locale.meaning[id], locale.sound[id]];
        if (line && !meaning)
            bad(`no meaning for line "${id}"`);
        if (line && !sound)
            bad(`no sound (pronunciation) for line "${id}"`);
        return { line: line ?? { id, text: id }, meaning: meaning ?? '', sound: sound ?? '' };
    };
    const scene = track.scenes[skill.id];
    if (!scene)
        return err([{ track: track.id, skill: skill.id, locale: locale.id, what: 'no scene for this skill' }]);
    if (skill.lines.length === 0)
        bad('the skill teaches no lines');
    const heard = new Set();
    const steps = scene.beats.map((b) => {
        switch (b.t) {
            case 'tell':
                return { t: 'tell', text: text(b.say), ...opt('who', b.who), ...opt('art', b.art) };
            case 'teach':
                heard.add(b.line);
                return { t: 'teach', ...taught(b.line), ...opt('who', b.who), ...opt('art', b.art) };
            case 'say':
                if (!heard.has(b.line))
                    bad(`line "${b.line}" is to be said before it has been taught`);
                return { t: 'say', ...taught(b.line) };
            case 'choose': {
                if (!b.options.some((o) => o.id === b.answer))
                    bad(`the answer "${b.answer}" is not one of the options`);
                if (b.options.length < 2)
                    bad('a choice needs at least two options');
                if (b.options.some((o) => o.art === undefined && o.label === undefined))
                    bad('every option needs a picture or a label');
                return { t: 'choose', ask: text(b.ask), answer: b.answer, options: b.options.map((o) => ({ id: o.id, ...opt('art', o.art), ...opt('label', o.label === undefined ? undefined : text(o.label)) })) };
            }
        }
    });
    for (const id of skill.lines)
        if (!heard.has(id))
            bad(`the scene never teaches line "${id}"`);
    const title = text(scene.title);
    if (problems.length)
        return err(problems);
    return ok({
        id: `${track.id}/${skill.id}`, number: n, skill: skill.id, track: track.id, locale: locale.id, title,
        steps: [...steps, { t: 'recap', lines: skill.lines.map(taught) }],
    });
};
/** Everything still to write: every problem in every episode of every track in every locale. Empty means ready. */
export const missing = (c, tracks, locales) => tracks.flatMap((track) => locales.flatMap((locale) => c.skills.flatMap((_, i) => {
    const built = buildEpisode(c, track, locale, i + 1);
    return built.ok ? [] : built.error;
})));
/**
 * A serial is one new episode a day. `finished` maps skill id -> the day it was first finished.
 * With pace 'daily' the next episode opens the day after the previous one was finished.
 */
export const today = (c, finished, day, pace = 'daily') => {
    const seen = c.skills.flatMap((s, i) => (finished[s.id] ? [i + 1] : []));
    const index = c.skills.findIndex((s) => !finished[s.id]);
    if (index < 0)
        return { next: undefined, wait: false, seen };
    const previous = index > 0 ? finished[c.skills[index - 1]?.id ?? ''] : undefined;
    const wait = pace === 'daily' && previous !== undefined && previous >= day;
    return { next: wait ? undefined : index + 1, wait, seen };
};
/** How many wrong tries before the right option is pointed out. */
export const HINT_AFTER = 2;
const voice = (step) => {
    if (!step)
        return [];
    switch (step.t) {
        case 'tell': return [{ t: 'speak', text: step.text, lang: 'own' }];
        case 'teach': return [{ t: 'speak', text: step.line.text, lang: 'target' }, { t: 'speak', text: step.meaning, lang: 'own' }];
        case 'choose': return [{ t: 'speak', text: step.ask, lang: 'own' }];
        case 'say': return [{ t: 'speak', text: step.line.text, lang: 'target' }];
        case 'recap': return step.lines.map((l) => ({ t: 'speak', text: l.line.text, lang: 'target' }));
    }
};
/** Steps that only need listening are ready at once; a choice or a line to say waits for the learner. */
const readyOnArrival = (step) => !step || step.t === 'tell' || step.t === 'teach' || step.t === 'recap';
const arrive = (at, e, p) => ({ ...p, at, ready: readyOnArrival(e.steps[at]), tried: [], hint: false });
/** The first state of an episode, with the cue to speak its first step. */
export const begin = (e) => [
    arrive(0, e, { at: 0, ready: false, tried: [], hint: false, slips: 0, spoken: 0, done: e.steps.length === 0 }),
    voice(e.steps[0]),
];
/** The player's step function. Every tap either moves the story on or changes nothing: there is no way to lose. */
export const play = (e) => (p, tap) => {
    const step = e.steps[p.at];
    if (p.done || !step)
        return [p, []];
    switch (tap.t) {
        case 'again':
            return [p, voice(step)];
        case 'next': {
            if (!p.ready)
                return [p, []];
            if (p.at + 1 >= e.steps.length)
                return [{ ...p, done: true }, [{ t: 'finished', episode: e.id, slips: p.slips, spoken: p.spoken }]];
            return [arrive(p.at + 1, e, p), voice(e.steps[p.at + 1])];
        }
        case 'pick': {
            if (step.t !== 'choose' || p.ready || p.tried.includes(tap.option) || !step.options.some((o) => o.id === tap.option))
                return [p, []];
            if (tap.option === step.answer)
                return [{ ...p, ready: true, hint: false }, [{ t: 'cheer' }]];
            const tried = [...p.tried, tap.option];
            return [{ ...p, tried, slips: p.slips + 1, hint: tried.length >= HINT_AFTER }, [{ t: 'retry' }]];
        }
        case 'said':
            return step.t === 'say' && !p.ready ? [{ ...p, ready: true, spoken: p.spoken + 1 }, [{ t: 'cheer' }]] : [p, []];
        case 'skip':
            return step.t === 'say' && !p.ready ? [{ ...p, ready: true }, []] : [p, []];
    }
};
/** How far through the episode the learner is, from 0 to 1. */
export const progress = (p, e) => (e.steps.length === 0 || p.done ? 1 : p.at / e.steps.length);
