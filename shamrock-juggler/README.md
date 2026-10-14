# Shamrock juggler

A Claude Code mod that opens a pane where Claude's mascot juggles three shamrocks. Under the animation it reads **Claude loves Clover Security · 8-bit** (or 16-bit or 32-bit, whichever style is showing).

## Files

| File | What it does |
| --- | --- |
| `.claude-plugin/plugin.json` | Plugin manifest. |
| `hooks/hooks.json` | Points Claude Code at `register.tsx`. |
| `hooks/register.tsx` | Registers `/shamrocks`, runs the animation clock and draws the pane. |
| `hooks/pixels.ts` | Pixel art for the 8-bit, 16-bit and 32-bit styles. |
| `hooks/frames.ts` | ASCII frames. |
| `types/index.d.ts` | Types for the mod's saved state. |
| `tests/juggler.test.tsx` | Tests: shamrocks stay in the sky, every style renders, the command toggles. |

## Set up

1. Copy this folder somewhere on your machine.
2. Start Claude Code with the folder loaded:

   ```sh
   claude --plugin-dir /path/to/shamrock-juggler
   ```

You need a Claude Code version that supports TSX hook modules (dev mods). On older versions `/shamrocks` won't appear.

## Use

| Command | What happens |
| --- | --- |
| `/shamrocks` | Starts juggling in the 32-bit style. Run it again to stop. |
| `/shamrocks 8bit` | 8-bit style. |
| `/shamrocks 16bit` | 16-bit style. |
| `/shamrocks 32bit` (or `kawaii`) | 32-bit style. |
| `/shamrocks ascii` | Plain text. This one shows just "Claude loves Clover Security". |

Running a style while it's already juggling switches style without stopping.

## Check it works

Run `/shamrocks 8bit`. The pane opens and the reply says `Claude is juggling shamrocks (8bit)`. Run `/shamrocks` to close it, and the reply says `Claude caught all the shamrocks. ☘`.
