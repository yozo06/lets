// Whose life the story follows. Each track tells the same lessons through a different day:
//   work  Ravi: the job, the boss, customers
//   home  Asha: the school, the bank, the shops
// A scene is a list of beats (tell / teach / choose / say). Text is never written here:
// every `say`, `ask`, `title` and `label` is a key into the locale files, so a scene
// can be told in any language. See docs/content-guide.md.

/** Pictures. For now these are emoji: every phone has them and they need no download. */
export const ART = {
  bus: '🚌', phone: '📱', ticket: '🎫', school: '🏫', clock: '⏰',
  wave: '👋', run: '🏃', hide: '🙈',
  village: '🏡', city: '🏙️', shop: '🏪', worry: '😟', laugh: '😄', idea: '💡', question: '❓',
};
/** Who is speaking. */
export const CAST = { ravi: '👨', asha: '👩', munni: '👧', boss: '👨‍💼', teacher: '👩‍🏫' };

const greetingChoice = { t: 'choose', ask: 'ask.hello', answer: 'wave', options: [{ id: 'wave', art: 'wave' }, { id: 'run', art: 'run' }, { id: 'hide', art: 'hide' }] };

export const TRACKS = {
  work: {
    id: 'work', name: 'track.work', who: 'ravi',
    scenes: {
      hello: {
        title: 'work.hello.title',
        beats: [
          { t: 'tell', say: 'work.hello.1', art: 'city' },
          { t: 'tell', say: 'work.hello.2', who: 'ravi', art: 'worry' },
          { t: 'tell', say: 'work.hello.3', who: 'asha', art: 'laugh' },
          { t: 'choose', ask: 'work.hello.ask.bus', answer: 'bus', options: [{ id: 'phone', art: 'phone' }, { id: 'bus', art: 'bus' }, { id: 'ticket', art: 'ticket' }] },
          { t: 'choose', ask: 'ask.phone', answer: 'phone', options: [{ id: 'clock', art: 'clock' }, { id: 'bus', art: 'bus' }, { id: 'phone', art: 'phone' }] },
          { t: 'tell', say: 'known.already', art: 'idea' },
          { t: 'tell', say: 'work.hello.4', art: 'shop' },
          { t: 'teach', line: 'hello', who: 'boss' },
          { t: 'tell', say: 'work.hello.5', who: 'ravi' },
          { t: 'say', line: 'hello' },
          greetingChoice,
          { t: 'tell', say: 'work.hello.6', who: 'boss', art: 'question' },
        ],
      },
    },
  },
  home: {
    id: 'home', name: 'track.home', who: 'asha',
    scenes: {
      hello: {
        title: 'home.hello.title',
        beats: [
          { t: 'tell', say: 'home.hello.1', art: 'city' },
          { t: 'tell', say: 'home.hello.2', who: 'asha', art: 'worry' },
          { t: 'tell', say: 'home.hello.3', who: 'ravi', art: 'laugh' },
          { t: 'choose', ask: 'home.hello.ask.school', answer: 'school', options: [{ id: 'bus', art: 'bus' }, { id: 'school', art: 'school' }, { id: 'phone', art: 'phone' }] },
          { t: 'choose', ask: 'ask.phone', answer: 'phone', options: [{ id: 'ticket', art: 'ticket' }, { id: 'phone', art: 'phone' }, { id: 'bus', art: 'bus' }] },
          { t: 'tell', say: 'known.already', art: 'idea' },
          { t: 'tell', say: 'home.hello.4', art: 'school' },
          { t: 'teach', line: 'hello', who: 'teacher' },
          { t: 'tell', say: 'home.hello.5', who: 'asha' },
          { t: 'say', line: 'hello' },
          greetingChoice,
          { t: 'tell', say: 'home.hello.6', who: 'teacher', art: 'question' },
        ],
      },
    },
  },
};
