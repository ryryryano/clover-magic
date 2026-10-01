# Turn off the clover@clover-security plugin for one folder and everything under it.
# Project settings don't carry into subfolders, so this passes them in explicitly.
# Set CLOVER_OFF_DIR to your folder (no trailing slash).
CLOVER_OFF_DIR="$HOME/cloverPOVs"

claude() {
  # Guard: an empty CLOVER_OFF_DIR would match every folder, and a missing
  # settings file would make claude refuse to start. Either way, run it unchanged.
  if [[ -n "$CLOVER_OFF_DIR" && -f "$CLOVER_OFF_DIR/.claude/settings.json" && "$PWD/" == "$CLOVER_OFF_DIR/"* ]]; then
    command claude --settings "$CLOVER_OFF_DIR/.claude/settings.json" "$@"
  else
    command claude "$@"
  fi
}
