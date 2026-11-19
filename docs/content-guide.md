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
{ t: 'tell',  say: 'work.hello.3', who: 'ravi', art: 'home ravi:worry asha:happy' }  // story, in the learner's language
{ t: 'teach', line: 'hello', who: 'boss', art: 'shop boss:talk ravi:worry' }         // a character uses an English line
pick('ask.phone', 'phone', 'clock', 'bus', 'phone')                                  // the learner taps a picture: question, answer, then the pictures
{ t: 'say',   line: 'hello' }                                                        // the learner says it aloud; never judged
```

- `say`, `ask`, `title` and `tease` are **keys**, not text. The text for each key lives in every locale file.
- Every line of the skill must be taught in the scene, and taught before the learner is asked to say it.
- A recap of the day's lines is added automatically at the end.
- `tease` (on every scene after the first) is the one line shown and spoken the day before, and used in the reminder.

### Pictures

`art` is a short description, and the drawing is made from it (`app/js/art.js`):

```
'shop boss:talk ravi:shock'      a place, then who is there and how they look
'bus'   'ravi:wave'              a picture to tap: a thing, or a person doing something
```

- Places: `home`, `city`, `shop`, `school`, `plain`.
- People: `ravi`, `asha`, `munni`, `boss`, `teacher`, `customer`, `clerk`.
- Looks: `happy`, `worry`, `laugh`, `talk`, `shock`, `quiet`, `wave`, `hide`.
- Things: `bus`, `phone`, `ticket`, `school`, `clock`, `name`, `money`.

Every `tell` and `teach` beat needs a picture, so the story can be followed without reading.
Change the faces from beat to beat: the pictures should tell the story on their own.
A new place, person or thing is a few lines of drawing code in `art.js`.

### What makes a good episode

1. **Three to four minutes.** Twelve to sixteen beats. The story plays by itself and stops only where the learner chooses or speaks.
2. **One or two English lines**, no more. The learner should be able to use them the same day.
3. **A real moment** from the life of that track's learner: a counter, a gate, a phone call.
4. **Choices by picture.** Never make reading the only way to answer.
5. **Wrong answers are safe.** Write choices where a wrong tap is funny or harmless, never shaming.
6. **End on a question.** The last beat should make the learner want tomorrow's episode.
7. **Short sentences.** One thought per beat, 75 characters at most (the check enforces it). They are read aloud; write for the ear. Avoid brackets and symbols.

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

A sentence is spoken from the first of these that exists: a recorded clip; the phone's own voice for that
language (Hindi and English on most Android phones, Odia on very few); for Odia only, the phone's Hindi voice
reading the same words in Devanagari letters, which is understandable but accented, a stopgap. With no voice at
all the story still plays, pausing on each line long enough to read it.

To record every sentence once with [Sarvam AI](https://www.sarvam.ai) (natural Indian voices, including Odia),
add the secret `SARVAM_API_KEY` to the repository (Settings → Secrets and variables → Actions) and run the
**tts** workflow from the Actions tab, twice:

1. mode **sample**: records two long sentences per language in a few voices and attaches them to the run as
   `tts-voice-samples`. Nothing is saved to the app. Download it, open `index.html` inside to hear the voices
   side by side, pick one.
2. mode **full**, with that voice in "speaker": records everything still missing, saves it to the app and
   publishes it.

The recorder is shared: it lives in [wildarc-sutra's `tts`](https://github.com/yozo06/wildarc-sutra/tree/main/src/tts),
and this app only tells it which sentences exist (`npm run sentences`). To record by hand instead, pipe that
list into `sutra-tts` from a checkout of wildarc-sutra, with the key in the environment, then `npm run sw`.
The key never goes in a file.

Clips are named after the sentence, so changing a sentence means recording that one again (run **full** again:
only new sentences are recorded, and clips of sentences that no longer exist are deleted).
A person's own recording saved under the same file name works just as well.
