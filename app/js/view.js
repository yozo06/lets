// What the learner sees:   view(state) -> HTML text.   Pure: same state, same screen.
// Anything tappable carries data-a="<action>" (and data-v for its value); main.js turns taps into events.
// The audience may read little, so every screen works from pictures, one big button and a spoken voice.
import { esc } from '../vendor/sutra/browser/runtime.js';
import { current } from '../vendor/sutra/habit/index.js';
import { text, episodeOf, todayOf, learned, upcoming } from './program.js';
import { scene, tile, face, icon } from './art.js';
import { TRACKS, LOCALES, CURRICULUM } from '../content/index.js';
import { VERSION } from './config.js';

const btn = (action, inner, attrs = '') => `<button data-a="${action}" ${attrs}>${inner}</button>`;
const label = (s, key) => `aria-label="${esc(text(s, key))}"`;

/** An English line with how it sounds and what it means. The sound comes first: it is what the learner can read. */
const lineCard = (s, l, hear = true) => `<div class="line">
  <div class="line-sound">${esc(l.sound)}</div>
  <div class="line-en" lang="en">${esc(l.line.show || l.line.text)}</div>
  <div class="line-meaning">${esc(l.meaning)}</div>
  ${hear ? btn('hear', icon('sound'), `class="round small" data-v="${esc(l.line.text)}" ${label(s, 'ui.again')}`) : ''}
</div>`;

/** First screen: no English to read. The family, and each language offering itself in its own words. */
const langScreen = () => `<main class="screen cover">
  <div class="frame hero">${scene('plain ravi:happy asha:happy munni:happy')}</div>
  <div class="stack">${Object.values(LOCALES).map((l) => btn('lang', `<span class="choice-name">${esc(l.name)}</span><span class="choice-sub">${esc(l.text['ui.tagline'])}</span>`, `class="choice" data-v="${l.id}" lang="${l.id}"`)).join('')}</div>
  <div class="wordmark" lang="en">LETS</div>
</main>`;

const trackCards = (s, small = '') => Object.values(TRACKS).map((t) => btn('track', face(t.who) + `<span class="card-label">${esc(text(s, t.name))}</span>`, `class="card${small}${s.track === t.id ? ' on' : ''}" data-v="${t.id}" aria-pressed="${s.track === t.id}"`)).join('');

const trackScreen = (s) => `<main class="screen">
  <h1 class="ask">${esc(text(s, 'ui.pick.track'))}</h1>
  <div class="pair">${trackCards(s)}</div>
  ${s.canCount ? `<p class="fine">${esc(text(s, 'ui.counting.note'))}</p>` : ''}
</main>`;

/** Tomorrow's episode: a picture, the one line that sells it, and a way to be reminded. */
const tomorrow = (s, up) => `<section class="tomorrow">
  <div class="eyebrow">${icon('moon')}${esc(text(s, 'ui.tomorrow.title'))}</div>
  ${up.art ? `<div class="frame dim">${scene(up.art)}</div>` : ''}
  <p class="tease">${esc(up.tease || up.title)}</p>
  ${s.bell ? `<div class="pill">${icon('bell')}<span>${esc(text(s, 'ui.remind.on'))}</span></div>` : s.canRemind ? btn('remind', `${icon('bell')}<span>${esc(text(s, 'ui.remind'))}</span>`, 'class="ghost"') : ''}
  ${s.installable ? btn('install', `${icon('keep')}<span>${esc(text(s, 'ui.install'))}</span>`, 'class="ghost"') : ''}
</section>`;

function homeScreen(s) {
  const now = todayOf(s), streak = current(s.streak, s.day), known = learned(s), up = upcoming(s);
  const ep = now.next ? episodeOf(s, now.next) : null;
  const today = ep
    ? `<section class="today">
        <div class="eyebrow">${esc(text(s, 'ui.today'))} · ${esc(text(s, 'ui.episode', { n: ep.number }))}</div>
        <div class="frame">${scene((up && up.art) || 'plain')}</div>
        <h1 class="title">${esc(ep.title)}</h1>
        ${btn('start', icon('play'), `class="play" data-v="${ep.number}" ${label(s, 'ui.play')}`)}
        <div class="play-label">${esc(text(s, 'ui.play'))}</div>
      </section>`
    : now.wait && up ? tomorrow(s, up)
      : `<section class="today rest"><div class="frame">${scene('plain ravi:happy asha:happy munni:happy')}</div><h1 class="title">${esc(text(s, 'ui.soon'))}</h1>${s.installable ? btn('install', `${icon('keep')}<span>${esc(text(s, 'ui.install'))}</span>`, 'class="ghost"') : ''}</section>`;
  const practice = known.length ? `<section class="shelf"><h2 class="eyebrow">${esc(text(s, 'ui.recap'))}</h2>${known.map((l) => lineCard(s, l)).join('')}</section>` : '';
  const replay = now.seen.length ? `<section class="shelf">${now.seen.map((n) => { const e = episodeOf(s, n); return e ? btn('start', `${icon('again')}<span>${esc(text(s, 'ui.episode', { n }))} · ${esc(e.title)}</span>`, `class="row" data-v="${n}" ${label(s, 'ui.replay')}`) : ''; }).join('')}</section>` : '';
  return `<header class="bar"><span class="streak">${streak ? icon('flame') + esc(text(s, 'ui.streak', { n: streak })) : ''}</span>${btn('settings', icon('gear'), `class="icon" ${label(s, 'ui.settings')}`)}</header>
  <main class="screen">${today}${practice}${replay}</main>`;
}

function stage(s, step, p) {
  const pic = step.art ? `<div class="frame">${scene(step.art)}</div>` : '';
  switch (step.t) {
    case 'tell':
      return `${pic}<div class="caption${step.who ? ' said' : ''}">${step.who ? face(step.who, 'talk') : ''}<p>${esc(step.text)}</p></div>`;
    case 'teach':
      return `${pic}${lineCard(s, step, false)}`;
    case 'choose':
      return `<p class="ask">${esc(step.ask)}</p>
        <div class="options n${step.options.length}">${step.options.map((o) => {
          const wrong = p.tried.includes(o.id), right = p.ready && o.id === step.answer, hint = p.hint && o.id === step.answer;
          return btn('pick', tile(o.art), `class="opt${wrong ? ' wrong' : ''}${right ? ' right' : ''}${hint ? ' hint' : ''}" data-v="${esc(o.id)}"${wrong || p.ready ? ' disabled' : ''}`);
        }).join('')}</div>
        <p class="nudge" role="status">${s.nudge ? esc(text(s, 'ui.retry')) : ''}</p>`;
    case 'say':
      // Speaking is the point of this step, so the microphone is the big button.
      return `<p class="ask">${esc(text(s, 'ui.say'))}</p>${lineCard(s, step, false)}
        ${s.mic && !p.ready ? btn('mic', icon(s.rec === 'on' ? 'stop' : 'mic'), `class="talk${s.rec === 'on' ? ' on' : ''}" id="talk" ${label(s, s.rec === 'on' ? 'ui.recording' : 'ui.mic')}`) + `<p class="hint">${esc(text(s, s.rec === 'on' ? 'ui.recording' : 'ui.mic'))}</p>` : ''}`;
    case 'recap':
      return `<p class="ask">${esc(text(s, 'ui.recap'))}</p>${step.lines.map((l) => lineCard(s, l, false)).join('')}`;
  }
  return '';
}

function playScreen(s) {
  const ep = episodeOf(s), p = s.player; if (!ep || !p) return homeScreen(s);
  const step = ep.steps[p.at], auto = step.t === 'tell' || step.t === 'teach';
  const segs = ep.steps.map((_, i) => `<i class="${i < p.at ? 'done' : i === p.at ? 'now' : ''}"></i>`).join('');
  const again = btn('again', icon('sound'), `class="round" ${label(s, 'ui.again')}`);
  const controls = auto
    ? again + btn('pause', icon(s.paused ? 'play' : 'pause'), `class="round${s.paused ? ' on' : ''}" id="pause" ${label(s, s.paused ? 'ui.resume' : 'ui.pause')}`) + btn('next', `<span>${esc(text(s, 'ui.next'))}</span>${icon('next')}`, 'class="go soft" id="go"')
    : step.t === 'recap' ? again + btn('next', `<span>${esc(text(s, 'ui.finish'))}</span>${icon('check')}`, 'class="go" id="go"')
      : step.t === 'say' && !p.ready ? again + btn('said', `${icon('check')}<span>${esc(text(s, 'ui.said'))}</span>`, `class="go ${s.mic ? 'soft' : 'yes'}" id="go"`) + btn('skip', esc(text(s, 'ui.skip')), 'class="skip"')
        : again;
  return `<div class="playing t-${step.t}${s.paused ? ' paused' : ''}">
    <header class="prog"><div class="segs" role="progressbar" aria-valuemin="0" aria-valuemax="${ep.steps.length}" aria-valuenow="${p.at + 1}">${segs}</div>${btn('quit', icon('close'), `class="icon" ${label(s, 'ui.close')}`)}</header>
    <main class="stage" data-step="${p.at}">${stage(s, step, p)}</main>
    <footer class="actions">${controls}</footer>
  </div>`;
}

function doneScreen(s) {
  const ep = episodeOf(s), up = upcoming(s), now = todayOf(s);
  const lines = ep ? ep.steps[ep.steps.length - 1].lines : [];
  return `<main class="screen done">
    <div class="frame">${scene('plain ravi:laugh asha:laugh munni:laugh')}</div>
    <h1 class="title">${esc(text(s, 'ui.done.title'))}</h1><p class="lead">${esc(text(s, 'ui.done.body'))}</p>
    ${lines.map((l) => lineCard(s, l)).join('')}
    ${up && (now.wait || now.next) ? tomorrow(s, up) : `<p class="lead quiet">${esc(text(s, 'ui.soon'))}</p>${s.installable ? btn('install', `${icon('keep')}<span>${esc(text(s, 'ui.install'))}</span>`, 'class="ghost"') : ''}`}
    <div class="stack">${btn('share', `${icon('share')}<span>${esc(text(s, 'ui.share'))}</span>`, 'class="ghost"')}${btn('home', `${icon('home')}<span>${esc(text(s, 'ui.back'))}</span>`, 'class="go soft" id="go"')}</div>
  </main>`;
}

const settingsScreen = (s) => `<header class="bar">${btn('home', icon('back'), `class="icon" ${label(s, 'ui.back')}`)}<span class="bar-title">${esc(text(s, 'ui.settings'))}</span><span class="icon"></span></header>
<main class="screen settings">
  <section class="set"><h2 class="eyebrow">${esc(text(s, 'ui.language'))}</h2><div class="pair">${Object.values(LOCALES).map((l) => btn('lang', esc(l.name), `class="choice small${s.lang === l.id ? ' on' : ''}" data-v="${l.id}" lang="${l.id}" aria-pressed="${s.lang === l.id}"`)).join('')}</div></section>
  <section class="set"><h2 class="eyebrow">${esc(text(s, 'ui.story'))}</h2><div class="pair">${trackCards(s, ' small')}</div></section>
  ${s.canCount ? `<section class="set"><h2 class="eyebrow">${esc(text(s, 'ui.counting'))}</h2><div class="pair">${btn('counting', esc(text(s, 'ui.on')), `class="choice small${s.meter.on ? ' on' : ''}" data-v="1" aria-pressed="${s.meter.on}"`)}${btn('counting', esc(text(s, 'ui.off')), `class="choice small${s.meter.on ? '' : ' on'}" data-v="0" aria-pressed="${!s.meter.on}"`)}</div><p class="fine">${esc(text(s, 'ui.counting.note'))}</p></section>` : ''}
  <p class="fine center" lang="en">LETS ${VERSION} · ${CURRICULUM.skills.length} episodes</p>
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
