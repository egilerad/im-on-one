# i'm on one — manual

a livecoding walk through a steel spiral. it starts from nothing: an empty page, silence, and a small jagged spiral (your body) at the entrance. each line you write adds one thing. two sine tones raise the walls. the deeper you walk, the more the sound is dampened, and the longer it lingers.

## start

the page opens empty with the cursor ready. begin at low volume.

- **⌘/ctrl + enter**: play (with an empty score, the clock starts in silence), or apply the edited score while playing
- **esc**: stop
- on touch screens, **play** also applies edits while playing

nothing else is on screen. there are no sliders. the score is the semi-transparent text over the drawing. after you edit it, the text turns grey until you apply it. a line that can't be applied is underlined, and the instrument keeps going with that line's last good value.

## the zero point

an empty score is a valid score: nothing sounds, nothing moves, and nothing is drawn but your body. every word is optional, and **a word you haven't written adds nothing**:

| not written | means |
|---|---|
| `sine`, `pair` | no tone, and no wall |
| `walk` | standing still |
| `side` | the middle of the corridor |
| `metal` | no metal: units neither ring nor appear |
| `people` | nobody else |
| `linger` | dry (.2 s) |
| `gain` | .12, the level a tone has once you write it |

deleting a line takes its element away again. delete everything and you are back at zero. nothing is saved between visits: every reload starts empty.

## the words

one statement per line, in any order. each word appears at most once. `#` starts a comment.

| word | what it is | range |
|---|---|---|
| `sine` | first wall tone, in hz; raises and ripples the floor edge of the steel | 30–2000 |
| `pair` | second wall tone; raises the top edge and twists it. `pair off` is the same as no pair | 30–2000 |
| `walk` | walking speed along the spiral, metres per second. negative walks back out | -2–2 |
| `side` | where the body is in the corridor: -1 against the outer wall, 0 in the middle, 1 against the inner wall | -1–1 |
| `metal` | brings in the judd units: how loud they ring when passed, plus metallic overtones on the tones | 0–1 |
| `people` | number of other walkers | 0–8 |
| `linger` | how long reflections hang in the air, in seconds | .2–20 |
| `gain` | level of each tone | 0–.25 |

### arithmetic

every value is an expression: `+ - * / % ^ **`, parentheses, `sin()`, `cos()`, `abs()`, `pi`, and three live values:

- `t`: seconds since play
- `depth`: how far into the spiral the body is, from 0 (entrance) to 1 (centre)
- `sine`: the first tone's current value. it can be used in every other line, but only once a `sine` line exists; otherwise that line is rejected

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

**the walls are the sines.** before any tone there is no wall: footsteps ring out in the open, without echoes off steel, and their rings spread freely. write `sine` and the floor edge of the spiral fades in (over a second or so) as the tone sounds; the walls start reflecting and fluttering. write `pair` and the top edge appears. a tone entering from silence starts directly at its pitch; after that, edits glide (0.12 s) and keep phase. in the drawing:
- the heavy line is the **floor edge**, rippling in proportion to `sine`;
- the thin line is the **top edge**, rippling with `pair`;
- the strands between them show the plate leaning, the torque. they appear only when both tones sound.

the difference between `pair` and `sine` is the beat you hear, and the same relation makes the lean breathe: at `pair sine + 1/4` the plate leans in and out every four seconds. as in serra's torqued pieces, the top and floor edges follow different curves. your body turns with the sound only once a tone exists.

**dampening only accumulates.** damping comes from walking in: it rises with depth and never goes back down during a performance, even if you walk back out. standing at the entrance never dampens. it darkens the tones, footsteps and reflections, lowers the direct sound, and stretches lingering. the drawing gets grainier. stop and play again to start fresh.

**the body and the walls.** `side` places the body in the corridor. once the walls exist:
- near a wall, that wall's reflection arrives sooner and louder and pans to its side, low frequencies swell, and the wall line darkens around you;
- staying close leaves rubbed marks along the steel;
- between the walls, sound flutters back and forth at a pitch set by the corridor width;
- dashed lines connect the body to both walls and darken as you get closer.

**figures, footsteps, reflections.** your body is a black jagged spiral that changes shape a little with every step. the body steps every 0.7 m and leaves rough, gritty scuffs that slowly fade. each step sends a broken ring outward. with walls, the steel holds the ring inside the corridor, arcs come back from each wall (drawn from mirror positions behind the walls, the way a reflection behaves), and the walls keep faint marks where sound struck them. the rings travel at a slowed, visible speed, not 343 m/s.

**judd's metal.** with `metal`, grey boxes appear at equal intervals (3.2 m) along the outer wall, like a row of identical units. walking past one rings it with clashing, struck-metal overtones, pitched from the tone. the ring sounds closer when you walk near the outer wall, and darker deeper inside. `metal` also adds these overtones to the tones themselves.

**other people.** each walker is a smaller grey jagged spiral moving at its own pace, in and out, with footprints and footsteps of their own. with walls, people behind steel sound muffled. more people add a faint murmur of presence and slightly shorten the reverberation, as bodies absorb sound.

**images.** drag your own image onto the page and it sits faintly in grey behind the drawing. it stays on your computer; reload to remove it.

## a performance from zero, and back

about 21 minutes. start with the empty page. at each cue, **add** the line (or **change** the line with the same word, or **delete** it), then ⌘/ctrl + enter. you can type early; nothing changes until you apply.

| time | edit | what happens |
|---|---|---|
| 0:00 | (empty) ⌘↵ | the clock starts. silence; only your body at the entrance |
| 0:30 | add `sine 110` | one tone, and the first wall rises |
| 1:30 | add `pair sine` | a second edge, in unison: fuller, no beating |
| 2:30 | change to `pair sine + 1/4` | beating every 4 s; the steel leans in and out |
| 3:30 | add `linger 3` | echoes |
| 4:30 | add `walk 1/15` | the first steps (about one every 10 s), footprints, rings |
| 6:00 | add `side sin(2*pi*t/40) * .8` | drifting wall to wall; echoes swing; walls darken where you pass |
| 7:30 | add `metal .4` | the judd units appear and start ringing (about one every 48 s) |
| 9:00 | add `people 3` | others arrive |
| 10:30 | change to `pair sine + 1/4 + depth` | beating quickens as you go in |
| 12:00 | change to `sine 110 * 2^(-depth/4)` | the walls sink, toward a minor third lower |
| 13:30 | change to `linger 3 + depth*12` | echoes stretch inward |
| 15:00 | change to `metal .4 + .4*abs(sin(pi*t/20))` | the metal swells every 20 s; the densest moment |
| 16:30 | change to `people 3 * (1 - depth)` | the crowd thins toward the centre |
| 18:00 | delete `walk` | arrival: standing in the chamber |
| 18:30 | delete `people` | alone |
| 19:00 | delete `metal` | the units fall silent and fade |
| 19:30 | delete `pair` | the beating stops; the top edge goes |
| 20:00 | delete `sine` | the last wall fades: silence, except echoes |
| 20:30 | delete `side`, then `linger` | the empty page again; **esc** |

delete `pair` before `sine`, because `pair` refers to `sine`. simulated end to end: no errors, the body reaches the centre at about 17:30, 77 steps, 13 metal units rung.

## sources and limits

- dia beacon's text on serra describes *2000* (2000) as a torqued spiral, a corridor that "unpredictably narrows or opens", upper and lower edges that "never align", and the body passing through space: https://www.diaart.org/exhibition/exhibitions-projects/richard-serra-exhibition
- donald judd, "specific objects" (1964), on industrial materials and the single repeated unit: https://juddfoundation.org/wp-content/uploads/2016/04/Specific_Objects_1964.pdf

this is an interpretation, not a reconstruction:
- the spiral is schematic, not the plan of *2000*;
- the sound is expressive, not measured from the sculpture;
- footsteps, metal and people are synthesized, not gallery recordings.

nothing is stored: no scores, no images, no tracking.
