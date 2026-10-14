# Clover mascot example

A Claude Code mod that opens a pane where two pixel-art clover mascots play side by side: **Idea** (a lightbulb moment) and **Send** (folds a paper airplane and throws it off the edge). Each is a 16-frame GIF drawn with half-block characters, so it works in any true-color terminal with no image support.

It's also a worked example of turning your own GIFs into a mod: drop them in `assets/`, run the build script, and the pane plays them.

## Files

| File | What it does |
| --- | --- |
| `.claude-plugin/plugin.json` | Plugin manifest. |
| `hooks/hooks.json` | Points Claude Code at `register.tsx`. |
| `hooks/register.tsx` | Registers `/clover-mascot-example`, runs the animation clock and draws the pane. |
| `hooks/pixels.ts` | Turns a frame into rows of half blocks (two pixels per cell). |
| `hooks/clips.ts` | The frames, generated from the GIFs. Don't edit by hand. |
| `assets/idea.gif`, `assets/send.gif` | The source animations. |
| `tools/build_frames.py` | Rebuilds `hooks/clips.ts` from the GIFs. |
| `types/index.d.ts` | Types for the mod's saved state. |
| `tests/clover.test.tsx` | Tests: every frame is whole and uses the palette, both clips show side by side, the command toggles. |

## Set up

1. Copy this folder somewhere on your machine.
2. Start Claude Code with the folder loaded:

   ```sh
   claude --plugin-dir /path/to/clover-mascot-example
   ```

You need a Claude Code version that supports TSX hook modules (dev mods). On older versions `/clover-mascot-example` won't appear. Colors need a true-color terminal; macOS Terminal before Tahoe 26 shows approximate colors.

## Use

| Command | What happens |
| --- | --- |
| `/clover-mascot-example` | Opens both mascots side by side. Run it again to close. |
| `/clover-mascot-example idea` | Just Idea. |
| `/clover-mascot-example send` | Just Send. |

Side by side needs about 107 columns; in a narrower pane Send wraps below Idea. Closing the pane also stops the animation.

## Change the animations

Replace `assets/idea.gif` or `assets/send.gif` (or add a clip to `CLIPS` in `tools/build_frames.py`), then from this folder run:

```sh
python3 tools/build_frames.py
```

It needs `ffmpeg` and `ffprobe`. Each GIF is cropped to its opaque area, shrunk to about 40×48 pixels (`SCALE`) and reduced to a shared 63-color palette.

The Send GIF's plane vanishes mid-air in the source, so the script gives that clip extra room on the right and keeps the plane flying and shrinking until it leaves the frame (`fly_out` settings in `CLIPS`: `dx`/`dy` per frame and `shrink`).

## Check it works

Run `/clover-mascot-example`. The pane opens with both clovers and the reply says `Clover mascot: Idea + Send`. Run it again to close, and the reply says `The clover mascots waved goodbye. ☘`.
