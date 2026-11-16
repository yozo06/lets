# LETS: Learn English Through Stories

A daily story, told in your own language, that leaves you with one line of English you can use the
same day. For people who never had the chance to learn English at school.

**Status: episode 1 is playable** in Hindi and Odia, with two stories to choose from. More episodes are being written.

## The idea

- **A serial, not a syllabus.** One short episode a day about a family that has moved to the city.
  You come back to find out what happens next.
- **Listen and speak.** No reading is needed. Tap pictures, repeat aloud, hear yourself.
- **No failing.** A wrong tap means the character tries again and the story carries on.
- **Your language first.** Hindi and Odia to begin with; Marathi, Kannada and Telugu next.
- **Your own life.** Follow the character whose day looks like yours: Ravi at work, or Asha running the home.
- **Works offline** on a basic Android phone. No account, no ads.

## Run it

```bash
npm start        # serves app/ on http://localhost:8080 (Node 20+, nothing to install)
npm run check    # tests, content completeness, offline file list
```

The voice is the phone's own Hindi and English voice until recorded clips are added
(`npm run audio`, see [docs/content-guide.md](docs/content-guide.md#voices)). Few phones have an Odia voice,
so Odia is text-only until then.

## How it is made

```
app/                    the whole site; no build step
  content/curriculum.js   what is learned: skills, each a few English lines
  content/tracks.js       whose life the story follows: one scene per skill, per track
  content/locales/        the language it is told in: hi.js, or.js
  js/program.js           the whole app as one pure function: (state, event) -> [state, effects]
  js/view.js              state -> screen
  js/main.js              the only file that touches the phone: voice, storage, microphone, network
  vendor/sutra/           shared libraries copied from wildarc-sutra (do not edit here)
scripts/                serve, build-sw, gen-audio-sarvam, sync-sutra
tests/                  node --test
docs/                   plan, content guide, analytics
```

A lesson, a story and a language are three separate pieces of data. Adding a language means translating
one file; adding a kind of learner means writing one track; neither touches code.
[docs/content-guide.md](docs/content-guide.md) explains how, and `npm run check` lists anything missing.

Built on [wildarc-sutra](https://github.com/yozo06/wildarc-sutra), the shared libraries that also run
[Kannada Kali](https://github.com/yozo06/kannada-kali). LETS is the second experiment: Kannada Kali
teaches with a map, quizzes and points; LETS teaches with a story. Both count the same anonymous
numbers ([docs/analytics.md](docs/analytics.md)), so we can see which keeps people coming back.

## Help wanted

- **Odia speakers:** the Odia text has not been checked by a native speaker yet. Fix `app/content/locales/or.js`.
- Speakers of Hindi, Marathi, Kannada or Telugu, to check that the stories sound natural.
- Anyone teaching English to adults: tell us what the first 30 lines should be.

## Licence

Code: MIT ([LICENSE](LICENSE)). Stories, translations and audio: CC BY-SA 4.0 ([LICENSE-content](LICENSE-content)). A WildArc project.
