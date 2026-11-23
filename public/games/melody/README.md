# Melody artwork

`expressions.webp` is a WebP copy of the user-supplied **Mint-Green Musical Phone Sprite Sheet.png** (1217 × 1293). The game displays face viewports from this sheet, with interactive buttons and the phone body drawn in CSS.

`phone.webp` is a resized WebP copy of the user-supplied **Mint Melody Toy Phone.png**, used in the games library.

`voices/warm/` and `voices/story/` contain two AI-generated character narration packs, created with OpenAI's Speech API using Marin and Cedar. Each pack has 171 sentence clips. The tracked `lib/melody-voice-manifest.json` maps supported sentences to their content-derived filenames. Clips load as needed; play does not call a speech API or require a key. The voice disclosure appears in the game and sound settings. Device voices remain available as a selectable alternative and as a fallback when an audio clip cannot play.

Regenerate missing narration with `node --import tsx scripts/generate-melody-voices.ts`, using the existing server-side `CHATGPT_API_KEY` or `OPENAI_API_KEY`. The generator reuses existing files. `MELODY_TTS_MODEL` overrides its generation model; this affects asset generation only. See the [Speech API documentation](https://developers.openai.com/api/docs/guides/text-to-speech).

`audio/` contains 20 original WAV effects: standard DTMF number pairs, three toy-phone ringtones, an outgoing ring, connection and hang-up tones, a success melody, bubbles, a boing, and sparkles. A short silent `unlock.wav` supports mobile media activation. Regenerate these with `python3 scripts/generate-melody-sounds.py`; the script uses only Python's standard library.

Voice, pace, volume, ringtone, keypad style, and fictional contacts save locally on the device. Family calls use authored branching stories and pretend three-digit numbers. No microphone or actual calling service is used.
