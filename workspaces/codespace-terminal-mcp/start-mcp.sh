#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

export PORT="${PORT:-3000}"
export MCP_AUTH_STATE_FILE="${MCP_AUTH_STATE_FILE:-/workspaces/.terminals-mcp/${CODESPACE_NAME:?Codespace name is required}/oauth.json}"
for name in MCP_GH_OAUTH_CLIENT_ID MCP_GH_OAUTH_CLIENT_SECRET MCP_ALLOWED_GITHUB_LOGIN MCP_PUBLIC_ORIGIN; do
  if [[ -z ${!name:-} ]]; then
    printf 'Terminals MCP startup: %s is missing.\n' "$name" >&2
    exit 1
  fi
done

umask 077
state_dir=$(dirname -- "$MCP_AUTH_STATE_FILE")
mkdir -p -- "$state_dir"
log="$state_dir/server.log"
exec 9>"$state_dir/start.lock"
flock -w 35 9

ready() {
  curl -fsS --max-time 1 "http://127.0.0.1:$PORT/.well-known/oauth-authorization-server" |
    node -e 'const data=JSON.parse(require("node:fs").readFileSync(0,"utf8")); process.exitCode=Number(data.issuer!==process.env.MCP_PUBLIC_ORIGIN.replace(/\/$/,""));' 2>/dev/null
}

if ready 2>/dev/null; then
  exit 0
fi

printf 'Starting Terminals MCP on port %s.\n' "$PORT" >>"$log"
setsid --fork flock -n "$state_dir/supervisor.lock" bash supervise-mcp.sh </dev/null >>"$log" 2>&1 9>&-
for ((attempt=0; attempt<30; attempt++)); do
  if ready 2>/dev/null; then
    printf 'Terminals MCP is ready on port %s.\n' "$PORT"
    exit 0
  fi
  sleep 1
done
printf 'Terminals MCP did not become ready. See %s.\n' "$log" >&2
exit 1
