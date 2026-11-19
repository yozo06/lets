// What is learned, in order. One skill is one episode. The same for every learner,
// whichever story they follow and whichever language it is told in.
// `text` is what is spoken; `show` (optional) is what is written when that differs.
export const CURRICULUM = {
  lines: {
    hello: { id: 'hello', text: 'Hello' },
    whatname: { id: 'whatname', text: 'What is your name?' },
    myname: { id: 'myname', text: 'My name is', show: 'My name is …' },
    howmuch: { id: 'howmuch', text: 'How much?' },
    twenty: { id: 'twenty', text: 'Twenty rupees' },
    please: { id: 'please', text: 'Please' },
    thankyou: { id: 'thankyou', text: 'Thank you' },
    sorry: { id: 'sorry', text: 'Sorry' },
    wherebus: { id: 'wherebus', text: 'Where is the bus?' },
    there: { id: 'there', text: 'There' },
    whatwant: { id: 'whatwant', text: 'What do you want?' },
    iwant: { id: 'iwant', text: 'I want soap' },
    notunderstand: { id: 'notunderstand', text: "I don't understand" },
    sayagain: { id: 'sayagain', text: 'Please say it again' },
  },
  skills: [
    { id: 'hello', lines: ['hello'] },
    { id: 'name', lines: ['whatname', 'myname'] },
    { id: 'price', lines: ['howmuch', 'twenty'] },
    { id: 'polite', lines: ['sorry', 'please', 'thankyou'] },
    { id: 'where', lines: ['wherebus', 'there'] },
    { id: 'want', lines: ['whatwant', 'iwant'] },
    { id: 'again', lines: ['notunderstand', 'sayagain'] },
  ],
};
