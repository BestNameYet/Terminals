#!/usr/bin/env bash
set -u
cd -- "$(dirname -- "$0")"
child=
trap 'if [[ -n $child ]]; then kill "$child" 2>/dev/null; wait "$child" 2>/dev/null; fi; exit 0' TERM INT
delay=1
while true; do
  started=$SECONDS
  node http-server.mjs &
  child=$!
  wait "$child"
  status=$?
  child=
  if (( SECONDS - started >= 60 )); then delay=1; fi
  printf "MCP exited (%s). Retrying in %ss.\n" "$status" "$delay"
  sleep "$delay" &
  child=$!
  wait "$child"
  child=
  delay=$(( delay < 16 ? delay * 2 : 30 ))
done
