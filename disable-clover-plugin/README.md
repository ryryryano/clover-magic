# Turn off the Clover plugin for one folder

How to stop the **Clover Security - Kura** plugin (`clover@clover-security`) from running in Claude Code inside one folder and every folder under it, including folders created later. It keeps running everywhere else.

## Files

| File | What it does |
| --- | --- |
| `settings.json` | Project setting that turns the plugin off. Goes in `<your folder>/.claude/settings.json`. |
| `claude-wrapper.zsh` | zsh function that applies that setting in subfolders too. Goes in `~/.zshrc`. |
| `test-wrapper.zsh` | Self-check for the function: `zsh test-wrapper.zsh` prints `ok`. |

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
| `~/cloverPOVs/prospect1` | ✔ **enabled** |

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
  if [[ -n "$CLOVER_OFF_DIR" && -f "$CLOVER_OFF_DIR/.claude/settings.json" && "$PWD/" == "$CLOVER_OFF_DIR/"* ]]; then
    command claude --settings "$CLOVER_OFF_DIR/.claude/settings.json" "$@"
  else
    command claude "$@"
  fi
}
```

- Inside the folder or anything below it, the function starts Claude with `--settings` pointing at the folder's settings file.
- Anywhere else, it runs `claude` unchanged. `command` calls the real program instead of calling the function again.
- The trailing `/` on both sides does two things: the folder itself matches, and folders with similar names (like `~/cloverPOVs-old`) don't.
- **Guards:** if `CLOVER_OFF_DIR` is empty, or the settings file is missing, it runs `claude` unchanged.
  - The first version had no guard. An empty variable turned the pattern into `/*`, which matches every folder, so Claude failed everywhere with `Settings file not found: /.claude/settings.json`.
  - That happens when a tool snapshots your shell functions without their variables, as Claude Code's own Bash tool does.

**Test it:** `zsh test-wrapper.zsh` runs the function against a fake `claude` in temporary folders and prints `ok`. It covers:
- the folder and a subfolder;
- a folder with a similar name;
- a folder outside;
- an empty `CLOVER_OFF_DIR`;
- a missing settings file.

**Upgrading from the first version:** replace the old function in `~/.zshrc` instead of appending. Running `cat … >> ~/.zshrc` twice leaves two copies, and the last one wins. `grep -n 'claude() {' ~/.zshrc` should print exactly one line.

## Limits

- **zsh only.** Claude started from the desktop app, an IDE, or another shell skips the function. In those, open the top folder itself, not a subfolder. For bash, the same function works in `~/.bashrc`.
- **Check the plugin ID.** Run `claude plugin list` to confirm yours is `clover@clover-security`. Other Clover plugins (`clover-for-developers`, `clover-for-security-teams`) have their own IDs and need their own `false` entries.
- **Admin policy.** The plugin may be installed through managed (organization) settings. Turning it off this way worked for us, but if your admin locks it on, a project setting can't override that.

## Resume a session that was started somewhere else

You can't turn a plugin off in a session that's already running. Plugins and their hooks load when Claude starts.

`claude --continue` resumes the latest session *from the folder you're in*, and the function only turns the plugin off inside your folder. So for a session you started elsewhere (e.g. `~/projects`), go back to that folder and pass the setting yourself:

```sh
cd ~/projects    # the folder the session was started from
command claude --settings ~/cloverPOVs/.claude/settings.json --continue
```

- `command` skips the function.
- `--settings` turns the plugin off for the whole session, whatever folder its files live in.
- To pick a specific older session instead of the latest, use `--resume` in place of `--continue`.

To check it worked, run `/plugin` inside Claude. `clover@clover-security` should show as disabled.

## Undo

Delete the function from `~/.zshrc`, delete the `enabledPlugins` entry from `.claude/settings.json`, and open a new terminal.
