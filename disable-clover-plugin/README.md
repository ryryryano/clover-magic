# Turn off the Clover plugin for one folder

How to stop the **Clover Security - Kura** plugin (`clover@clover-security`) from running in Claude Code inside one folder and every folder under it, including folders created later. It keeps running everywhere else.

## Files

| File | What it does |
| --- | --- |
| `settings.json` | Project setting that turns the plugin off. Goes in `<your folder>/.claude/settings.json`. |
| `claude-wrapper.zsh` | zsh function that applies that setting in subfolders too. Goes in `~/.zshrc`. |

## Why you need both

A project's `.claude/settings.json` can turn a plugin off:

```json
{
  "enabledPlugins": {
    "clover@clover-security": false
  }
}
```

That only works when you start Claude in the folder that contains `.claude/`. Subfolders don't pick up the setting. We checked with `claude plugin list`:

| Started from | Plugin status |
| --- | --- |
| `~/cloverPOVs` | ✘ disabled |
| `~/cloverPOVs/Alpaca` | ✔ **enabled** |

`claude --settings <file>` does apply from a subfolder, so the zsh function adds that flag whenever you start Claude anywhere under the folder.

## Setup

1. **Add the project setting.** Copy `settings.json` into your folder:

   ```sh
   mkdir -p ~/cloverPOVs/.claude
   cp settings.json ~/cloverPOVs/.claude/settings.json
   ```

   If `.claude/settings.json` already exists, merge the `enabledPlugins` entry into it instead of overwriting.

2. **Add the zsh function.** Change `CLOVER_OFF_DIR` in `claude-wrapper.zsh` to your folder, then add it to `~/.zshrc`:

   ```sh
   cat claude-wrapper.zsh >> ~/.zshrc
   source ~/.zshrc
   ```

3. **Check it.** `type claude` should say `claude is a shell function`. Then:

   ```sh
   cd ~/cloverPOVs/some-subfolder
   claude plugin list | grep -A3 "clover@clover-security"   # Status: ✘ disabled
   cd ~
   claude plugin list | grep -A3 "clover@clover-security"   # Status: ✔ enabled
   ```

## How the function works

```zsh
claude() {
  case "$PWD/" in
    "$CLOVER_OFF_DIR/"*) command claude --settings "$CLOVER_OFF_DIR/.claude/settings.json" "$@" ;;
    *) command claude "$@" ;;
  esac
}
```

- Inside the folder or anything below it, it starts Claude with `--settings` pointing at the folder's settings file.
- Anywhere else, it runs `claude` unchanged. `command` calls the real program instead of the function again.
- The trailing `/` on both sides makes the folder itself match, and keeps folders with similar names (like `~/cloverPOVs-old`) from matching.

## Limits

- **zsh only.** Claude started from the desktop app, an IDE, or another shell skips the function. In those, open the top folder itself, not a subfolder. For bash, the same function works in `~/.bashrc`.
- **Check the plugin ID.** Run `claude plugin list` to confirm yours is `clover@clover-security`. Other Clover plugins (`clover-for-developers`, `clover-for-security-teams`) have their own IDs and need their own `false` entries.
- **Admin policy.** The plugin may be installed through managed (organization) settings. Turning it off this way worked for us, but if your admin locks it on, a project setting can't override that.

## Undo

Delete the function from `~/.zshrc`, delete the `enabledPlugins` entry from `.claude/settings.json`, and open a new terminal.
