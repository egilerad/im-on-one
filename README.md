# i'm on one

**[play it](https://egilerad.github.io/im-on-one/)** · [manual](MANUAL.md)

a livecoding walk through a torqued steel spiral. it starts from zero: an empty page, silence, your body as a small jagged spiral at the entrance. each line adds one thing. two sine tones raise the walls; the body walks in; the sound becomes more dampened and lingering as it goes. a metal object can be placed, struck and repeated independently of walking. visitors touch the walls as well as stepping, and their sound depends on your relative position. delete the lines and you are back at zero.

```text
sine 110
pair sine + 1/4
linger 3
walk 1/15
side sin(2*pi*t/40) * .8
metal 1
size 2
place .18
strike .4
every 4
decay 3
echo .6
people 1
```

**⌘/ctrl + enter** plays and applies edits, keeping the clock, phase and echoes. **esc** stops.

## run locally

browser modules need a local server:

```sh
python3 -m http.server 8782 --bind 127.0.0.1
```

then open http://127.0.0.1:8782/.

## tests

```sh
node --test tests/*.test.mjs        # language, spiral geometry, walking state, marks
npm install --no-save playwright && npx playwright install chromium
node tests/audio-runner.mjs         # real offline audio regression tests
node tests/encounter-audio-runner.mjs # object, action, source resonance, space and visitor contact
node tests/browser.mjs              # zero point, continuity, validation, stop and responsive layout
node tests/material-browser.mjs     # one-shot on apply, repetition and visitor encounters
```

set `BASE_URL` to test another address. the tests check how the instrument behaves; they are not a listening judgement.

no build step, no dependencies, no tracking, nothing stored. the spiral and acoustics are an interpretation, not a model of serra's *2000*. see the manual for sources.
