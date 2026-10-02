# Turn off the clover@clover-security plugin for some folders and everything under them.
# Project settings don't carry into subfolders, so this passes them in explicitly.
# List your folders (no trailing slash). Each needs its own .claude/settings.json.
CLOVER_OFF_DIRS=("$HOME/cloverPOVs")

claude() {
  # Use the first listed folder that contains $PWD and has a settings file.
  # Guards: an empty entry would match every folder, and a missing settings file
  # would make claude refuse to start. Either way, run it unchanged.
  # CLOVER_OFF_DIR (single folder, older versions) still works.
  local d
  for d in "${CLOVER_OFF_DIRS[@]}" "$CLOVER_OFF_DIR"; do
    if [[ -n "$d" && -f "$d/.claude/settings.json" && "$PWD/" == "$d/"* ]]; then
      command claude --settings "$d/.claude/settings.json" "$@"
      return
    fi
  done
  command claude "$@"
}
