# LETS plan

## What we are testing

LETS is the second of two learning apps built on the same libraries, with opposite ideas of what keeps
a learner going.

| | Kannada Kali | LETS |
|---|---|---|
| Pull | points, stars, streaks | "what happens next" |
| Shape | a map of stops the learner chooses from | one episode a day, one button |
| Mistakes | cost fare | the story carries on; no fail state |
| Medium | reading and quizzes | listening and speaking |
| Payoff | XP and badges | one line usable the same day |

Both send the same anonymous counts (see wildarc-sutra's `docs/analytics.md`), so return after a week
and drop-off per unit can be compared directly.

## Who it is for

Adults who speak Hindi, Odia, Marathi, Kannada or Telugu, may read little, and have no reason to trust
that an app will work for them. The design assumes low motivation and treats that as our problem.

## Rules for the experience

1. Opens straight to today's episode. No menus, no map.
2. Voice first: listen, tap a picture, repeat aloud. The interface is icons plus a spoken guide.
3. No failure. A wrong tap means the character tries again.
4. Three to four minutes a day, ending with one line to use today.
5. The first episode shows the learner the English words they already use (bus, phone, time, ticket).
6. Speaking is record, play back, compare with the model voice. Never graded. Works offline.
7. Letters (ABC) are a slow side track that never blocks the story.
8. Voices must sound human.
9. Small download, works offline, shared as a link.

## Structure: three things kept apart

- **Curriculum**: what is learned. An ordered list of skills, each a few English lines. The same for everyone.
- **Track**: whose life the story follows, one per kind of learner. A track supplies one scene per skill.
- **Locale**: the language the story is told in: narration, voice clips, and English pronunciation written
  in the learner's own script.

```
episode = build(skill, scene, locale)
```

A new kind of learner is a new track. A new language is a new locale. A new lesson is a new skill, and a
checker lists exactly which scenes and translations it still needs. Nothing else changes.

The story world is one family that has moved to the city. The first two tracks:

- `work`: the job, the boss, customers.
- `home`: the school, the bank, the shops.

Later tracks (shopkeeper, student, driver, farmer) are added the same way.

## Pilot (draft)

Seven skills, two tracks, two languages (Hindi, Odia):

1. Words you already know; "Hello"
2. "My name is …" / "What is your name?"
3. Numbers; "How much?"
4. "Please", "Thank you", "Sorry"
5. "Where is …?"
6. "I want …" / "I need …"
7. "I don't understand. Please say it again."; the week in review

After two weeks: who opened it on day 2 and day 7, and can they say the seven lines?

## Where it stands

- Done: the `story` library in wildarc-sutra; episodes 1 and 2 here (both tracks, Hindi and Odia), with drawn
  scenes, a story that plays by itself, microphone-first speaking, tomorrow's hook and a reminder.
- Next: episodes 3 to 7; recorded voices; a native check of the Odia text; then the test with real learners.
