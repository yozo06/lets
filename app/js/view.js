// What the learner sees:   view(state) -> HTML text.   Pure: same state, same screen.
// Anything tappable carries data-a="<action>" (and data-v for its value); main.js turns taps into events.
// The audience may read little, so every screen works from pictures, one big button and a spoken voice.
import { esc } from '../vendor/sutra/browser/runtime.js';
import { current } from '../vendor/sutra/habit/index.js';
import { text, episodeOf, todayOf, learned } from './program.js';
import { ART, CAST, TRACKS, LOCALES, CURRICULUM } from '../content/index.js';
import { VERSION } from './config.js';

const PLAY = '<svg class="tri" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';
const emo = (e, cls = '') => `<span class="emo ${cls}" aria-hidden="true">${e || ''}</span>`;
const btn = (action, inner, attrs = '') => `<button data-a="${action}" ${attrs}>${inner}</button>`;

/** An English line with how it sounds and what it means. The sound comes first: it is what the learner can read. */
const lineCard = (s, l, hear = true) => `<div class="line">
  <div class="line-sound">${esc(l.sound)}</div>
  <div class="line-en" lang="en">${esc(l.line.text)}</div>
  <div class="line-meaning">${esc(l.meaning)}</div>
  ${hear ? btn('hear', emo('🔊'), `class="round small" data-v="${esc(l.line.text)}" aria-label="${esc(text(s, 'ui.again'))}"`) : ''}
</div>`;

const langScreen = () => `<main class="screen cover">
  <div class="brand"><div class="brand-mark">LETS</div><div class="brand-sub" lang="en">Learn English Through Stories</div></div>
  <div class="stack">${Object.values(LOCALES).map((l) => btn('lang', esc(l.name), `class="choice" data-v="${l.id}" lang="${l.id}"`)).join('')}</div>
</main>`;

const trackScreen = (s) => `<main class="screen">
  <h1 class="ask">${esc(text(s, 'ui.pick.track'))}</h1>
  <div class="pair">${Object.values(TRACKS).map((t) => btn('track', emo(CAST[t.who], 'face') + `<span class="card-label">${esc(text(s, t.name))}</span>`, `class="card${s.track === t.id ? ' on' : ''}" data-v="${t.id}"`)).join('')}</div>
  ${s.canCount ? `<p class="fine">${esc(text(s, 'ui.counting.note'))}</p>` : ''}
</main>`;

function homeScreen(s) {
  const now = todayOf(s), track = TRACKS[s.track], streak = current(s.streak, s.day), known = learned(s);
  const ep = now.next ? episodeOf(s, now.next) : null;
  const today = ep
    ? `<section class="today">
        <div class="eyebrow">${esc(text(s, 'ui.today'))} · ${esc(text(s, 'ui.episode', { n: ep.number }))}</div>
        ${emo(CAST[track.who], 'face')}
        <h1 class="title">${esc(ep.title)}</h1>
        ${btn('start', PLAY, `class="play" data-v="${ep.number}" aria-label="${esc(text(s, 'ui.play'))}"`)}
        <div class="play-label">${esc(text(s, 'ui.play'))}</div>
      </section>`
    : `<section class="today rest">${emo(now.wait ? '🌙' : '✨', 'face')}<h1 class="title">${esc(text(s, now.wait ? 'ui.tomorrow' : 'ui.soon'))}</h1></section>`;
  const practice = known.length ? `<section class="shelf"><h2 class="eyebrow">${esc(text(s, 'ui.recap'))}</h2>${known.map((l) => lineCard(s, l)).join('')}</section>` : '';
  const replay = now.seen.length ? `<section class="shelf">${now.seen.map((n) => { const e = episodeOf(s, n); return e ? btn('start', `${emo('↻')}<span>${esc(text(s, 'ui.episode', { n }))} · ${esc(e.title)}</span>`, `class="row" data-v="${n}" aria-label="${esc(text(s, 'ui.replay'))}"`) : ''; }).join('')}</section>` : '';
  return `<header class="bar"><span class="streak">${streak ? emo('🔥') + esc(text(s, 'ui.streak', { n: streak })) : ''}</span>${btn('settings', emo('⚙️'), `class="icon" aria-label="${esc(text(s, 'ui.settings'))}"`)}</header>
  <main class="screen">${today}${practice}${replay}</main>`;
}

function stage(s, step, p) {
  switch (step.t) {
    case 'tell':
      return `${step.art ? emo(ART[step.art], 'scene') : ''}<div class="bubble${step.who ? ' said' : ''}">${step.who ? emo(CAST[step.who], 'who') : ''}<p>${esc(step.text)}</p></div>`;
    case 'teach':
      return `${emo(CAST[step.who] || '🗣️', 'scene')}${lineCard(s, step, false)}`;
    case 'choose':
      return `<p class="ask">${esc(step.ask)}</p>
        <div class="options n${step.options.length}">${step.options.map((o) => {
          const wrong = p.tried.includes(o.id), right = p.ready && o.id === step.answer, hint = p.hint && o.id === step.answer;
          return btn('pick', emo(ART[o.art]) + (o.label ? `<span>${esc(o.label)}</span>` : ''), `class="opt${wrong ? ' wrong' : ''}${right ? ' right' : ''}${hint ? ' hint' : ''}" data-v="${esc(o.id)}"${wrong || p.ready ? ' disabled' : ''}`);
        }).join('')}</div>
        <p class="nudge" role="status">${s.nudge ? esc(text(s, 'ui.retry')) : ''}</p>`;
    case 'say':
      return `<p class="ask">${esc(text(s, 'ui.say'))}</p>${lineCard(s, step, false)}
        ${s.mic && !p.ready ? btn('mic', emo(s.rec === 'on' ? '⏺️' : '🎤') + `<span>${esc(text(s, s.rec === 'on' ? 'ui.recording' : 'ui.record'))}</span>`, `class="mic${s.rec === 'on' ? ' on' : ''}"`) : ''}`;
    case 'recap':
      return `<p class="ask">${esc(text(s, 'ui.recap'))}</p>${step.lines.map((l) => lineCard(s, l, false)).join('')}`;
  }
  return '';
}

function playScreen(s) {
  const ep = episodeOf(s), p = s.player; if (!ep || !p) return homeScreen(s);
  const step = ep.steps[p.at], last = p.at === ep.steps.length - 1;
  const segs = ep.steps.map((_, i) => `<i class="${i < p.at ? 'done' : i === p.at ? 'now' : ''}"></i>`).join('');
  const again = btn('again', emo('🔊'), `class="round" aria-label="${esc(text(s, 'ui.again'))}"`);
  const go = p.ready
    ? btn('next', `<span>${esc(text(s, last ? 'ui.finish' : 'ui.next'))}</span>${last ? emo('✓') : PLAY}`, 'class="go" id="go"')
    : step.t === 'say' ? btn('said', `${emo('✓')}<span>${esc(text(s, 'ui.said'))}</span>`, 'class="go yes" id="go"') + btn('skip', esc(text(s, 'ui.skip')), 'class="skip"') : '';
  return `<div class="playing t-${step.t}">
    <header class="prog"><div class="segs" role="progressbar" aria-valuemin="0" aria-valuemax="${ep.steps.length}" aria-valuenow="${p.at + 1}">${segs}</div>${btn('quit', emo('✕'), `class="icon" aria-label="${esc(text(s, 'ui.close'))}"`)}</header>
    <main class="stage" data-step="${p.at}">${stage(s, step, p)}</main>
    <footer class="actions">${again}${go}</footer>
  </div>`;
}

function doneScreen(s) {
  const ep = episodeOf(s), now = todayOf(s);
  const lines = ep ? ep.steps[ep.steps.length - 1].lines : [];
  return `<main class="screen done">
    ${emo('🎉', 'party')}<h1 class="title">${esc(text(s, 'ui.done.title'))}</h1><p class="lead">${esc(text(s, 'ui.done.body'))}</p>
    ${lines.map((l) => lineCard(s, l)).join('')}
    <p class="lead quiet">${esc(text(s, now.next || now.wait ? 'ui.tomorrow' : 'ui.soon'))}</p>
    <div class="stack">${btn('home', `${emo('🏠')}<span>${esc(text(s, 'ui.back'))}</span>`, 'class="go" id="go"')}${btn('share', `${emo('📤')}<span>${esc(text(s, 'ui.share'))}</span>`, 'class="ghost"')}</div>
  </main>`;
}

const settingsScreen = (s) => `<header class="bar">${btn('home', emo('←'), `class="icon" aria-label="${esc(text(s, 'ui.back'))}"`)}<span class="bar-title">${esc(text(s, 'ui.settings'))}</span><span class="icon"></span></header>
<main class="screen settings">
  <section class="set"><h2 class="eyebrow">${esc(text(s, 'ui.language'))}</h2><div class="pair">${Object.values(LOCALES).map((l) => btn('lang', esc(l.name), `class="choice small${s.lang === l.id ? ' on' : ''}" data-v="${l.id}" lang="${l.id}" aria-pressed="${s.lang === l.id}"`)).join('')}</div></section>
  <section class="set"><h2 class="eyebrow">${esc(text(s, 'ui.story'))}</h2><div class="pair">${Object.values(TRACKS).map((t) => btn('track', emo(CAST[t.who], 'face') + `<span class="card-label">${esc(text(s, t.name))}</span>`, `class="card small${s.track === t.id ? ' on' : ''}" data-v="${t.id}" aria-pressed="${s.track === t.id}"`)).join('')}</div></section>
  ${s.canCount ? `<section class="set"><h2 class="eyebrow">${esc(text(s, 'ui.counting'))}</h2><div class="pair">${btn('counting', esc(text(s, 'ui.on')), `class="choice small${s.meter.on ? ' on' : ''}" data-v="1" aria-pressed="${s.meter.on}"`)}${btn('counting', esc(text(s, 'ui.off')), `class="choice small${s.meter.on ? '' : ' on'}" data-v="0" aria-pressed="${!s.meter.on}"`)}</div><p class="fine">${esc(text(s, 'ui.counting.note'))}</p></section>` : ''}
  <p class="fine center" lang="en">LETS ${VERSION} · ${CURRICULUM.skills.length} episode${CURRICULUM.skills.length === 1 ? '' : 's'}</p>
</main>`;

export function view(s) {
  switch (s.screen) {
    case 'track': return trackScreen(s);
    case 'home': return homeScreen(s);
    case 'play': return playScreen(s);
    case 'done': return doneScreen(s);
    case 'settings': return settingsScreen(s);
    default: return langScreen();
  }
}
