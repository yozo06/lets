#!/usr/bin/env node
// Prints every sentence the app can speak, as JSON: [{ "text": "...", "lang": "hi" }, ...].
// This is all the recorder needs. The recording itself is done by wildarc-sutra's `tts`
// (the "tts" workflow in the Actions tab, or sutra-tts by hand): see docs/content-guide.md#voices.
import { spokenTexts } from '../app/js/spoken.js';

process.stdout.write(JSON.stringify(spokenTexts(), null, 1) + '\n');
