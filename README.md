# i'm on one

**[play it](https://egilerad.github.io/im-on-one/)** · [manual](MANUAL.md)

a livecoding walk through a torqued steel spiral. two sine tones are the walls, a small jagged spiral is your body, and the sound becomes more dampened and lingering as it goes in. judd-like metal units ring as you pass them. other people walk too.

```text
sine 110
pair sine + 1/4
walk 1/3
side sin(t/7)/2
metal .5
people 2
linger 6
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
node --test tests/*.test.mjs        # language, spiral geometry, walking state
npm install --no-save playwright && npx playwright install chromium
node tests/audio-runner.mjs         # real offline audio: beating, steps, metal, people, walls, damping, stability
node tests/browser.mjs              # interface, live update, errors, stop, restart, image drop, phone
```

set `BASE_URL` to test another address. the tests check how the instrument behaves; they are not a listening judgement.

no build step, no dependencies, no tracking. the spiral and acoustics are an interpretation, not a model of serra's *2000*. see the manual for sources.
