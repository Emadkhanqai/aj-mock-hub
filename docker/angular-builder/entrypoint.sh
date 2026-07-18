#!/bin/sh
set -eu

case "${1:-}" in
  lint|test|build) command="$1" ;;
  *) echo "Command is not approved" >&2; exit 64 ;;
esac

for entry in /input/* /input/.[!.]*; do
  [ -e "$entry" ] || continue
  name="$(basename "$entry")"
  case "$name" in node_modules|dist|.angular|coverage) continue ;; esac
  if [ -L "$entry" ]; then
    echo "Workspace symbolic links are not permitted" >&2
    exit 65
  fi
  cp -R "$entry" /workspace/
done
ln -s /opt/template/node_modules node_modules
cleanup() { rm -f node_modules; }
trap cleanup EXIT INT TERM
npm run "$command"
