# Cactus Whistle browser engine

These unmodified runtime files power the app's optional Whistle dictation. The engine is loaded in a dedicated Web Worker; audio is processed locally and never uploaded.

## Bundled engine

- Project: https://github.com/cactus-compute/needle
- Source: https://huggingface.co/Cactus-Compute/needle3/tree/2ae11323dc000f5e70c49f7403efa6af12ba9e67/wasm
- Files: `needle.js`, `needle.wasm`
- Engine license: Apache 2.0; see [LICENSE](LICENSE).
- `needle.wasm` SHA-256: `c43f48e11f302087250d1e406024956781cd2f02595a5e343b3d7ddd5ef707fa`

## Downloaded model

The model is not bundled in this repository. Selecting Whistle downloads it once into browser Cache Storage, subject to browser storage availability.

- Source: https://huggingface.co/Cactus-Compute/whistle/tree/b358ddadd89b7a713b5aa131f23032d3cca1b251
- File: `whistle.cact` (approximately 16.9 MB)
- Model license: Apache 2.0, as declared in the source repository's model card.
- SHA-256: `b6e02f048568ac5d01a2042556c658061e699acbc0aa2a1439f52f3d461dffeb`
- Announcement: https://cactuscompute.com/blog/whistle

The app verifies both the model and WASM bytes before loading them. Runtime adapters in `js/whistle.js`, `js/whistle-worker.js` and `js/whistle-audio-worklet.js` handle microphone capture, resampling, transcription and cancellation. No native wrapper is required.
