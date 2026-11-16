# Writing for LETS

No programming is needed for any of this. Three files hold three separate things:

| File | Holds | You edit it to |
|---|---|---|
| `app/content/curriculum.js` | **What is learned**: skills in order, each with a few English lines | add a lesson |
| `app/content/tracks.js` | **Whose life the story follows**: one scene per skill, for each track | add a scene, or a new kind of learner |
| `app/content/locales/<lang>.js` | **The language it is told in**: every sentence, plus each English line's meaning and sound | translate, or fix wording |

Run `npm run check` after any change. It fails with a precise list of whatever is missing: a scene with
no translation, a line with no pronunciation, a picture that does not exist.

## A scene

A scene is a list of beats. There are only four kinds:

```js
{ t: 'tell',   say: 'work.hello.1', who: 'ravi', art: 'city' }   // story, in the learner's language
{ t: 'teach',  line: 'hello', who: 'boss' }                      // a character uses an English line
{ t: 'choose', ask: 'ask.phone', answer: 'phone',                // the learner helps by tapping a picture
  options: [{ id: 'bus', art: 'bus' }, { id: 'phone', art: 'phone' }] }
{ t: 'say',    line: 'hello' }                                   // the learner says it aloud; never judged
```

- `say`, `ask` and `title` are **keys**, not text. The text for each key lives in every locale file.
- `art` names a picture in `ART`, `who` names a speaker in `CAST` (both at the top of `tracks.js`).
- Every line of the skill must be taught in the scene, and taught before the learner is asked to say it.
- A recap of the day's lines is added automatically at the end.

### What makes a good episode

1. **Three to four minutes.** Ten to fourteen beats.
2. **One or two English lines**, no more. The learner should be able to use them the same day.
3. **A real moment** from the life of that track's learner: a counter, a gate, a phone call.
4. **Choices by picture.** Never make reading the only way to answer.
5. **Wrong answers are safe.** Write choices where a wrong tap is funny or harmless, never shaming.
6. **End on a question.** The last beat should make the learner want tomorrow's episode.
7. **Short sentences.** They are read aloud by a voice; write for the ear. Avoid brackets and symbols.

## A new language

1. Copy `app/content/locales/hi.js` to `<code>.js` (for example `mr.js`) and translate every value.
   Keep the keys. Set `id`, `name` (the language's own name for itself) and `voice` (its language code).
2. For each English line fill in `meaning` (what it means) and `sound` (how it sounds, written in that
   language's script, the way people would write an English word they hear).
3. Add it to `LOCALES` in `app/content/index.js`.
4. `npm run check`.

## A new kind of learner

Add a track to `TRACKS` in `tracks.js` with an `id`, a `name` key, a face (`who`) and one scene for every
skill in the curriculum. Add its sentences to every locale file. `npm run check` lists what is left.

## Voices

Until clips are recorded the app uses the phone's own voice, which exists for Hindi and English on
most Android phones and for Odia on very few.

To record every sentence once with [Sarvam AI](https://www.sarvam.ai) (natural Indian voices, including Odia):

- on your machine: `SARVAM_API_KEY=... npm run audio`, then `npm run sw`; or
- on GitHub: add the secret `SARVAM_API_KEY` to the repository and run the **audio-sarvam** workflow
  from the Actions tab. Tick "sample" first to hear six clips before recording everything.

`npm run audio -- --list` shows how much there is to record (no key needed). Clips are named after the
sentence, so changing a sentence means recording that one again; untouched ones are kept.
A person's own recording saved under the same file name works just as well.
