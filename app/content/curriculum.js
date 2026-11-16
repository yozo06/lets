// What is learned, in order. One skill is one episode. The same for every learner,
// whichever story they follow and whichever language it is told in.
// `text` is what is spoken; `show` (optional) is what is written when that differs.
export const CURRICULUM = {
  lines: {
    hello: { id: 'hello', text: 'Hello' },
    whatname: { id: 'whatname', text: 'What is your name?' },
    myname: { id: 'myname', text: 'My name is', show: 'My name is …' },
  },
  skills: [
    { id: 'hello', lines: ['hello'] },
    { id: 'name', lines: ['whatname', 'myname'] },
  ],
};
