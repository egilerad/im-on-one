# i'm on one

**[play it](https://egilerad.github.io/im-on-one/)** · [manual](MANUAL.md)

a livecoding walk through a torqued steel spiral. it starts from zero: an empty page, silence, your body as a small jagged spiral at the entrance. each line adds one thing. two sine tones raise the walls; the body walks in; the sound becomes more dampened and lingering as it goes. judd-like metal units ring as you pass them. other people walk too. delete the lines and you are back at zero.

```text
sine 110
pair sine + 1/4
linger 3
walk 1/15
side sin(2*pi*t/40) * .8
metal .4
people 3
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
node tests/audio-runner.mjs         # real offline audio: zero is silent, a lone sine is steady, beating, steps, metal, people, walls, damping, stability
node tests/browser.mjs              # zero point, one line adds only itself, live update, errors, stop, restart, image drop, phone
```

set `BASE_URL` to test another address. the tests check how the instrument behaves; they are not a listening judgement.

no build step, no dependencies, no tracking, nothing stored. the spiral and acoustics are an interpretation, not a model of serra's *2000*. see the manual for sources.
