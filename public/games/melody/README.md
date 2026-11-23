# Melody artwork

`expressions.webp` is a WebP copy of the user-supplied **Mint-Green Musical Phone Sprite Sheet.png** (1217 × 1293). The game displays face viewports from this sheet, with interactive buttons and the phone body drawn in CSS.

`phone.webp` is a resized WebP copy of the user-supplied **Mint Melody Toy Phone.png**, used in the games library.

`voices/warm/` and `voices/story/` contain two AI-generated character narration packs, created with OpenAI's Speech API using Marin and Cedar. Both packs cover the current library of 660 narration sentences, including Little Letter Garden's examples and tracing instructions, alongside compatible clips from earlier versions. The tracked `lib/melody-voice-manifest.json` maps supported sentences to their content-derived filenames. Clips load as needed; play does not call a speech API or require a key. The voice disclosure appears in the games and sound settings. Device voices remain available as a selectable alternative and as a fallback when an audio clip cannot play.

Regenerate missing narration with `node --import tsx scripts/generate-melody-voices.ts`, using the existing server-side `CHATGPT_API_KEY` or `OPENAI_API_KEY`. The generator reuses existing files. `MELODY_TTS_MODEL` overrides its generation model; this affects asset generation only. See the [Speech API documentation](https://developers.openai.com/api/docs/guides/text-to-speech).

`audio/` contains 20 original WAV effects: standard DTMF number pairs, three toy-phone ringtones, an outgoing ring, connection and hang-up tones, a success melody, bubbles, a boing, and sparkles. A short silent `unlock.wav` supports mobile media activation. Regenerate these with `python3 scripts/generate-melody-sounds.py`; the script uses only Python's standard library.

Voice, pace, volume, ringtone, keypad style, and fictional contacts save locally on the device. Family calls use authored branching stories and pretend three-digit numbers. No microphone or actual calling service is used.

`lib/melody-content.ts` defines 32 discovery objects across hearts, fruit, shapes, toys, colors, pets, nature, and sky friends, plus 88 reusable dialogue lines and varied question templates. Free play and counting rotate objects; children can also choose a collection. Shapes and paint drops render as colored SVGs rather than relying on emoji appearance.

`lib/melody-family-library.ts` contains three branching adventures per family theme (12 total). Visits rotate through the theme's adventures. Object position, dialogue cursors, adventure visits, and telephone preferences persist under `melody-play:v2:<profile>` (or `guest`) so reopening continues the library. Session rewards and activity totals remain separate.

`lib/melody-telephone.ts` defines Little Explorer (2–4 digits), Number Detective (3–7 digits), and Secret Agent (5–10 digits in reverse order). Codes vary by round and visit, avoid adjacent duplicate digits, and grow every two successful rounds. Child profiles default to a level for their age; children can change levels at any time between missions. Replays remain available at every level. The game catalog defaults to ages 3–12; existing household age restrictions stay under parent control.

Little Letter Garden is available in the Games library and at `/play/letters`. `lib/letter-garden.ts` defines all 26 uppercase and lowercase letters as ordered, resampled centerline strokes, with a picture word and spoken instructions. Pointer input must start at the current marker and follow nearby upcoming stroke points; taps at a loop's endpoint and shortcuts through a curve cannot complete the stroke. A partial stroke can be resumed. Touch, mouse, pen, and arrow-key input share the same checks. Demonstrations animate the same paths without awarding completion. Progress saves separately for each child or guest under `letter-garden:v1:<profile>`; completed letter stamps persist, while partial traces start fresh on reopening. Game-session rewards are submitted only after at least one letter has actually been traced.
