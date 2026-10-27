# i'm on one — language reference

the empty editor is silence. every line is optional. type, then ⌘/ctrl + enter to apply the whole editor; esc stops. play after stop restarts at the entrance with current text. reload clears the editor. updates retain time, position and echo tails. this is expressive spatial sound, not measured sculpture acoustics.

## body and walls

| word | meaning | range; absent value |
|---|---|---|
| sine | first sustained tone and floor edge | 30–2000 hz; absent = none |
| pair | second tone and top edge | 30–2000 hz; absent or off = none |
| gain | level of each sustained tone, not master volume | 0–.25; .12 |
| walk | path speed, negative reverses | -2–2 m/s; 0 |
| side | outer wall -1, inner wall +1 | -1–1; 0 |
| people | other bodies, footsteps and localized wall encounters | 0–8 rounded; 0 |
| linger | shared reflection decay target | .2–20 seconds; .2 |

`pair sine + 1/4` needs a `sine` line. `pair 165` can stand alone. a sine never implies walking. damping records deepest progress, not time waiting, and never lifts during the run.

## object, action, rhythm and space

metal now enables one silent object. it no longer adds overtones to sustained sines or automatically strikes repeated units while walking.

| word | independent function | range; absent value |
|---|---|---|
| metal | object enabled / material amount | 0–1; 0 |
| place | position along path: entrance 0, centre 1 | 0–1; .12 |
| size | relative resonant size: larger = lower pitch | .25–4; 1 |
| strike | excitation strength | 0–1; 0 |
| every | repetition interval | .25–60 s; 0 = one shot |
| decay | source ring, distinct from room lingering | .1–12 s; 2 |
| echo | reflected contribution of encounters | 0–1; .3 |
| reach | listening-distance scale | .5–20 m; 6 |

with metal enabled, `strike .4` without every sounds once **each explicit apply**. continuous expression updates do not retrigger it. unrelated applies also strike if the one-shot line remains. delete strike when an apply should not sound a hit. `every 4` repeats every four seconds; removing strike stops new attacks but keeps old tails. removing every while strike remains returns to one-shot mode: that apply may strike once.

size alters resonances; place alters source location; strike alters excitation; decay alters the source envelope; echo alters reflected contribution. spatial attenuation, stereo and obstruction depend on the listener relative to the source. visitors interact at their own wall positions, heard from your moving position, not as a global murmur. this is not acoustic ray tracing.

## livecoding and calculation

one statement per line, at most one of each word, any order. `#` comments. constants are enough: `every 3`, `size 2`, `walk 1/8`, `place 1/5`.

arithmetic: `+ - * / % ^ **`, parentheses, `sin()`, `cos()`, `abs()`, `pi`. no tan. live values: `t` (global seconds since play), `depth` (current path progress 0–1), and `sine` (first tone's target, only when its line exists). a meaningful spatial relation: `linger 2 + depth*8`.

expressions evaluate about 40 times per second. typing is staged: grey text changes nothing until apply. apply evaluates the **whole editor**, not selection. syntax errors reject the draft, preserving old music. a later runtime error underlines its line and holds its previous good value. controls are bounded; every below .25 seconds is rejected except 0.

## subtraction and history

remove lines that refer to sine before removing sine. deleting a source leaves echoes and drawing traces; empty code does not reset body position, clock or damping. esc immediately silences and freezes; play then restarts. gain affects only sustained tones: deleting gain with a tone present returns its level to .12.

visuals remain overhead, grayscale, arial and lowercase: jagged body/visitor spirals, rough footprint scuffs, contact marks and reflected rings. drag a local image onto the page for a faint grayscale background. reload removes it. nothing is stored by the instrument.

## references and limits

- serra's torqued spiral *2000*: https://www.diaart.org/exhibition/exhibitions-projects/richard-serra-exhibition
- judd, industrial material: https://juddfoundation.org/wp-content/uploads/2016/04/Specific_Objects_1964.pdf

all sounds are synthesized, not gallery recordings. two user-pitched sustained voices; metal derives resonances. no microphone, midi, osc, samples, built-in recording, or true pause/resume. performance cue sheets are local rehearsal material and are not included in this public reference.
