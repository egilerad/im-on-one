# i'm on one — manual

a livecoding walk through a steel spiral. two sine tones are the walls. a point is your body. the deeper it goes, the more the sound is dampened, and the longer it lingers.

## start

open the site and press **play** (or ⌘/ctrl + enter). begin at low volume.

- **⌘/ctrl + enter**: play, or apply the edited score while playing
- **esc**: stop
- on touch screens, **play** also applies edits while playing

nothing else is on screen. there are no sliders. the score is the semi-transparent text over the drawing. after you edit it, the text turns grey until you apply it. a line that can't be applied is underlined, and the instrument keeps going with that line's last good value.

## the score

```text
sine 110
pair sine + 1/4
walk 1/3
side sin(t/7)/2
metal .5
people 2
linger 6
```

one statement per line. each word appears at most once. `#` starts a comment. only `sine` is required; anything you leave out uses the value shown here (`gain .12` and `people 0` are hidden defaults).

| word | what it is | range |
|---|---|---|
| `sine` | first wall tone, in hz; draws the floor edge of the steel | 30–2000 |
| `pair` | second wall tone; twists the top edge. `pair off` removes it | 30–2000 |
| `walk` | walking speed along the spiral, metres per second. negative walks back out | -2–2 |
| `side` | where the body is in the corridor: -1 against the outer wall, 0 in the middle, 1 against the inner wall | -1–1 |
| `metal` | metallic overtones on the wall tones, and how loud the judd units ring | 0–1 |
| `people` | number of other walkers | 0–8 |
| `linger` | how long reflections hang in the air, in seconds | .2–20 |
| `gain` | level of each wall tone (optional) | 0–.25 |

### arithmetic

every value is an expression: `+ - * / % ^ **`, parentheses, `sin()`, `cos()`, `abs()`, `pi`, and three live values:

- `t`: seconds since play
- `depth`: how far into the spiral the body is, from 0 (entrance) to 1 (centre)
- `sine`: the first tone's current value (in every line except `sine` itself)

```text
sine 110 + depth*40          # the walls rise as you go in
pair sine + 1/4 + depth/2    # beating gets faster deeper inside
walk 1/3 * (1 - depth/2)     # slow down near the centre
side sin(t/5) * .9           # drift from wall to wall
people 4 - depth*4           # the others thin out
```

expressions are re-evaluated about 40 times a second. `sin()` uses radians, so `sin(t/7)` takes 2·π·7 ≈ 44 seconds per cycle; `sin(2*pi*t/60)` takes exactly 60.

## what you hear and see

**the spiral.** a single steel wall winds inward for three turns, to a small chamber. the path is about 54 metres long, so `walk 1/3` reaches the centre in roughly 2¾ minutes. in the chamber the body keeps circling until you walk back out (negative `walk`).

**sine and pair are the steel.** the two tones run for the whole performance and never restart; edits glide (0.12 s smoothing) and keep phase. the body eases into a new `walk` or `side` over a second or so. in the drawing:
- the heavy line is the **floor edge**, rippling in proportion to `sine`;
- the thin line is the **top edge**;
- the strands between them show the plate leaning, the torque.

the difference between `pair` and `sine` is the beat you hear, and the same relation makes the lean breathe: at `pair sine + 1/4` the plate leans in and out every four seconds. as in serra's torqued pieces, the top and floor edges follow different curves.

**dampening only accumulates.** damping rises with depth (and slowly with time) and never goes back down during a performance, even if you walk back out. it darkens the tones, footsteps and reflections, lowers the direct sound, and stretches lingering. the drawing gets grainier. stop and play again to start fresh.

**the body and the walls.** `side` places the body in the corridor:
- near a wall, that wall's reflection arrives sooner and louder and pans to its side, low frequencies swell, and the wall line darkens around you;
- staying close leaves rubbed marks along the steel;
- between the walls, sound flutters back and forth at a pitch set by the corridor width;
- dashed lines connect the body to both walls and darken as you get closer.

**footsteps, reflections.** the body steps every 0.7 m and leaves footprints that slowly fade. each step sends a broken ring outward, held inside the corridor by the steel. arcs come back from each wall (drawn from mirror positions behind the walls, the way a reflection behaves), and the walls keep faint marks where sound struck them. the rings travel at a slowed, visible speed, not 343 m/s.

**judd's metal.** grey boxes sit at equal intervals (3.2 m) along the outer wall, like a row of identical units. walking past one rings it with clashing, struck-metal overtones, pitched from `sine`. the ring sounds closer when you walk near the outer wall, and darker deeper inside. `metal` also adds these overtones to the two wall tones themselves.

**other people.** each walker is a grey dot moving at its own pace, in and out, with footprints and footsteps of their own. people behind a wall sound muffled. more people add a faint murmur of presence and slightly shorten the reverberation, as bodies absorb sound.

**images.** drag your own image onto the page and it sits faintly in grey behind the drawing. it stays on your computer; reload to remove it.

## a short performance

1. **enter.** play the default. listen to the two tones beating, steps and the first metal unit.
2. **touch the wall.** `side -.9`. the outer wall comes close: the reflection tightens and the wall darkens.
3. **cross.** `side .9`. the image moves across your head.
4. **others arrive.** `people 4`.
5. **twist.** `pair sine + 1/2`: the lean breathes faster, and so does the beating.
6. **go in.** `walk 1/2` and `pair sine + 1/4 + depth`. the sound closes in and darkens, and won't brighten again.
7. **remain.** in the chamber: `walk 0`, `linger 14`, `metal 0`. only tones and their long tails.
8. **leave, or stop.** `walk -1` walks out through dampened sound; **esc** ends it.

each step is a single-line edit; let each one sound before the next.

## sources and limits

- dia beacon's text on serra describes *2000* (2000) as a torqued spiral, a corridor that "unpredictably narrows or opens", upper and lower edges that "never align", and the body passing through space: https://www.diaart.org/exhibition/exhibitions-projects/richard-serra-exhibition
- donald judd, "specific objects" (1964), on industrial materials and the single repeated unit: https://juddfoundation.org/wp-content/uploads/2016/04/Specific_Objects_1964.pdf

this is an interpretation, not a reconstruction:
- the spiral is schematic, not the plan of *2000*;
- the sound is expressive, not measured from the sculpture;
- footsteps, metal and people are synthesized, not gallery recordings.

the only thing stored is the last applied score, in this browser's local storage.
