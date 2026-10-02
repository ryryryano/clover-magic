#!/usr/bin/env zsh
# Self-check for claude-wrapper.zsh: zsh test-wrapper.zsh  (prints "ok" or the failing case)
set -e
tmp=$(mktemp -d); trap 'rm -rf $tmp' EXIT
mkdir -p $tmp/bin $tmp/off/.claude $tmp/off/sub $tmp/off2/.claude $tmp/off2/sub $tmp/off-old $tmp/other
echo '{}' > $tmp/off/.claude/settings.json
echo '{}' > $tmp/off2/.claude/settings.json
printf '#!/bin/sh\necho "$@"\n' > $tmp/bin/claude; chmod +x $tmp/bin/claude   # fake claude: echoes its args
PATH="$tmp/bin:$PATH"
source "${0:A:h}/claude-wrapper.zsh"
check() { cd "$1"; got=$(claude x); [[ "$got" == "$2" ]] || { echo "FAIL in $1 (CLOVER_OFF_DIRS=(${CLOVER_OFF_DIRS[*]}) CLOVER_OFF_DIR='$CLOVER_OFF_DIR'): got '$got', want '$2'"; exit 1; } }
on="--settings $tmp/off/.claude/settings.json x"
on2="--settings $tmp/off2/.claude/settings.json x"

# Two folders: each uses its own settings file, subfolders included
CLOVER_OFF_DIRS=($tmp/off $tmp/off2); CLOVER_OFF_DIR=
check $tmp/off "$on"; check $tmp/off/sub "$on"; check $tmp/off2 "$on2"; check $tmp/off2/sub "$on2"
check $tmp/off-old x; check $tmp/other x            # similar name and outside: unchanged

# Guards
CLOVER_OFF_DIRS=("");            check $tmp/other x   # empty entry must not match everything
CLOVER_OFF_DIRS=();              check $tmp/other x   # empty list
CLOVER_OFF_DIRS=($tmp/off-old);  check $tmp/off-old x # no settings file -> run unchanged

# Older single-folder variable still works
CLOVER_OFF_DIRS=(); CLOVER_OFF_DIR=$tmp/off; check $tmp/off/sub "$on"; check $tmp/other x
echo ok
