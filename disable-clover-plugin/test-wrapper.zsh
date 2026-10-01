#!/usr/bin/env zsh
# Self-check for claude-wrapper.zsh: zsh test-wrapper.zsh  (prints "ok" or the failing case)
set -e
tmp=$(mktemp -d); trap 'rm -rf $tmp' EXIT
mkdir -p $tmp/bin $tmp/off/.claude $tmp/off/sub $tmp/off-old $tmp/other
echo '{}' > $tmp/off/.claude/settings.json
printf '#!/bin/sh\necho "$@"\n' > $tmp/bin/claude; chmod +x $tmp/bin/claude   # fake claude: echoes its args
PATH="$tmp/bin:$PATH"
source "${0:A:h}/claude-wrapper.zsh"
check() { cd "$1"; got=$(claude x); [[ "$got" == "$2" ]] || { echo "FAIL in $1 (CLOVER_OFF_DIR='$CLOVER_OFF_DIR'): got '$got', want '$2'"; exit 1; } }
on="--settings $tmp/off/.claude/settings.json x"
CLOVER_OFF_DIR=$tmp/off
check $tmp/off "$on"; check $tmp/off/sub "$on"; check $tmp/off-old x; check $tmp/other x
CLOVER_OFF_DIR=;               check $tmp/other x      # empty var must not match everything
CLOVER_OFF_DIR=$tmp/off-old;   check $tmp/off-old x    # no settings file -> run unchanged
echo ok
