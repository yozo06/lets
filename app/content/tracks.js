// Whose life the story follows. Each track tells the same lessons through a different day:
//   work  Ravi: the job, the boss, customers
//   home  Asha: the school, the bank, the shops
// A scene is a list of beats (tell / teach / choose / say). Text is never written here:
// every `say`, `ask`, `title` and `tease` is a key into the locale files, so a scene can be
// told in any language. `art` describes the drawing: a place, then who is there and how they
// look, e.g. 'shop boss:talk ravi:shock' (see app/js/art.js). `tease` is the one line shown
// the day before, to make the learner want this episode. See docs/content-guide.md.

const pick = (ask, answer, ...arts) => ({ t: 'choose', ask, answer, options: arts.map((art) => ({ id: art.split(':').pop(), art })) });
const FAMILY = 'city ravi:happy asha:happy munni:happy';

export const TRACKS = {
  work: {
    id: 'work', name: 'track.work', who: 'ravi',
    scenes: {
      hello: {
        title: 'work.hello.title',
        beats: [
          { t: 'tell', say: 'family.arrive', art: FAMILY },
          { t: 'tell', say: 'work.hello.2', art: 'home ravi:worry' },
          { t: 'tell', say: 'work.hello.3', who: 'ravi', art: 'home ravi:worry asha:happy' },
          { t: 'tell', say: 'work.hello.4', who: 'asha', art: 'home asha:laugh ravi:worry' },
          { t: 'tell', say: 'work.hello.5', who: 'asha', art: 'home asha:talk ravi:happy' },
          pick('ask.bus', 'bus', 'phone', 'bus', 'ticket'),
          pick('ask.phone', 'phone', 'clock', 'bus', 'phone'),
          { t: 'tell', say: 'known.already', art: 'home ravi:happy asha:happy' },
          { t: 'tell', say: 'work.hello.6', art: 'shop boss:happy ravi:worry' },
          { t: 'teach', line: 'hello', who: 'boss', art: 'shop boss:talk ravi:worry' },
          { t: 'tell', say: 'work.hello.7', art: 'shop boss:happy ravi:happy' },
          { t: 'say', line: 'hello' },
          pick('ask.hello', 'wave', 'ravi:shock', 'ravi:wave', 'ravi:hide'),
          { t: 'tell', say: 'work.hello.8', who: 'boss', art: 'shop boss:talk ravi:shock' },
          { t: 'tell', say: 'work.hello.9', art: 'shop boss:happy ravi:shock' },
        ],
      },
      name: {
        title: 'work.name.title', tease: 'work.name.tease',
        beats: [
          { t: 'tell', say: 'work.name.1', who: 'boss', art: 'shop boss:talk ravi:shock' },
          { t: 'tell', say: 'work.name.2', art: 'shop boss:happy ravi:worry' },
          { t: 'teach', line: 'whatname', who: 'boss', art: 'shop boss:talk ravi:worry' },
          { t: 'tell', say: 'work.name.3', art: 'shop boss:happy ravi:happy' },
          { t: 'teach', line: 'myname', who: 'ravi', art: 'shop boss:happy ravi:talk' },
          { t: 'tell', say: 'work.name.4', who: 'ravi', art: 'shop boss:happy ravi:talk' },
          { t: 'tell', say: 'work.name.5', who: 'boss', art: 'shop boss:laugh ravi:happy' },
          { t: 'tell', say: 'say.name', art: 'plain ravi:happy' },
          { t: 'say', line: 'myname' },
          pick('ask.name', 'name', 'bus', 'name', 'clock'),
          { t: 'tell', say: 'say.ask', art: 'plain ravi:talk' },
          { t: 'say', line: 'whatname' },
          { t: 'tell', say: 'work.name.6', who: 'boss', art: 'shop boss:talk ravi:happy' },
          { t: 'tell', say: 'work.name.7', art: 'shop customer:talk ravi:shock' },
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
          { t: 'tell', say: 'family.arrive', art: FAMILY },
          { t: 'tell', say: 'home.hello.2', art: 'home asha:worry munni:happy' },
          { t: 'tell', say: 'home.hello.3', who: 'asha', art: 'home asha:worry ravi:happy' },
          { t: 'tell', say: 'home.hello.4', who: 'ravi', art: 'home ravi:laugh asha:worry' },
          { t: 'tell', say: 'home.hello.5', who: 'ravi', art: 'home ravi:talk asha:happy' },
          pick('ask.school', 'school', 'bus', 'school', 'phone'),
          pick('ask.phone', 'phone', 'ticket', 'phone', 'bus'),
          { t: 'tell', say: 'known.already', art: 'home ravi:happy asha:happy' },
          { t: 'tell', say: 'home.hello.6', art: 'school teacher:happy asha:worry' },
          { t: 'teach', line: 'hello', who: 'teacher', art: 'school teacher:talk asha:worry' },
          { t: 'tell', say: 'home.hello.7', art: 'school teacher:happy asha:happy' },
          { t: 'say', line: 'hello' },
          pick('ask.hello', 'wave', 'asha:hide', 'asha:shock', 'asha:wave'),
          { t: 'tell', say: 'home.hello.8', who: 'teacher', art: 'school teacher:talk asha:shock' },
          { t: 'tell', say: 'home.hello.9', art: 'school asha:shock munni:happy' },
        ],
      },
      name: {
        title: 'home.name.title', tease: 'home.name.tease',
        beats: [
          { t: 'tell', say: 'home.name.1', who: 'teacher', art: 'school teacher:talk asha:shock' },
          { t: 'tell', say: 'home.name.2', art: 'school teacher:happy asha:worry' },
          { t: 'teach', line: 'whatname', who: 'teacher', art: 'school teacher:talk asha:worry' },
          { t: 'tell', say: 'home.name.3', art: 'school asha:happy munni:happy' },
          { t: 'teach', line: 'myname', who: 'asha', art: 'school teacher:happy asha:talk' },
          { t: 'tell', say: 'home.name.4', who: 'asha', art: 'school teacher:happy asha:talk' },
          { t: 'tell', say: 'home.name.5', who: 'teacher', art: 'school teacher:laugh asha:happy' },
          { t: 'tell', say: 'say.name', art: 'plain asha:happy' },
          { t: 'say', line: 'myname' },
          pick('ask.name', 'name', 'clock', 'name', 'bus'),
          { t: 'tell', say: 'say.ask', art: 'plain asha:talk' },
          { t: 'say', line: 'whatname' },
          { t: 'tell', say: 'home.name.6', who: 'teacher', art: 'school teacher:talk asha:happy' },
          { t: 'tell', say: 'home.name.7', art: 'plain clerk:talk asha:shock' },
        ],
      },
    },
  },
};
