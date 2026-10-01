# Turn off the clover@clover-security plugin for one folder and everything under it.
# Project settings don't carry into subfolders, so this passes them in explicitly.
# Set CLOVER_OFF_DIR to your folder (no trailing slash).
CLOVER_OFF_DIR="$HOME/cloverPOVs"

claude() {
  case "$PWD/" in
    "$CLOVER_OFF_DIR/"*) command claude --settings "$CLOVER_OFF_DIR/.claude/settings.json" "$@" ;;
    *) command claude "$@" ;;
  esac
}
