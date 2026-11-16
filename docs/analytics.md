# Anonymous counts

The hosted copy of LETS counts a few things, to learn whether teaching through a story keeps people
coming back. It learns nothing about you.

## What is sent

Short names, one small request each, with nothing attached. `<lang>` is the teaching language (hi, or).

| Name | When | What it tells us |
|---|---|---|
| `lets/<lang>/new` | the first time a language is chosen on a phone | how many people tried it |
| `lets/<lang>/day` | the first open of each day | how much it is used |
| `lets/<lang>/back/d1`, `d3`, `d7`, `d14`, `d30` | once each, the first open on or after that many days | do people come back |
| `lets/<lang>/track/<work or home>` | once, when a story is chosen | which story people pick |
| `lets/<lang>/unit/<track>-<skill>/start` and `/done` | once per episode | how far people get |
| `lets/<lang>/unit/<track>-<skill>/quit/<step>` | once, the first time an episode is left unfinished | where episodes lose people |
| `lets/<lang>/spoke`, `lets/<lang>/skipped` | when a line is said aloud, or passed over | whether people speak |

## What is never sent

No name, no user or device id, no cookie, nothing you say or record. Recordings of your voice never
leave the phone: they are played back to you once and discarded. "Came back after a week" is worked out
on the phone; only that conclusion is sent.

The counting service ([GoatCounter](https://www.goatcounter.com), open source) sees what any website
sees: the IP address and browser of the request. It says it tells visits apart with a non-identifiable
hash of these and uses no cookies; its privacy policy has the details.

## Turning it off

The gear on the home screen → the last switch. Off means nothing is sent and anything waiting is thrown
away. The same note is shown when a story is first chosen.

Counting is also off when the app runs from `localhost`, and when `COUNT_ENDPOINT` in `app/js/config.js`
is empty. **If you host your own copy, set that to your own GoatCounter site or to `''`.**

The design, and how to read the numbers, are documented in
[wildarc-sutra](https://github.com/yozo06/wildarc-sutra/blob/main/docs/analytics.md).
