# Starting MCP error messages

Draft. Each state and event pair has one fixed destination.

| Event column | Error code | Message template |
|---|---|---|
| mcp_configuration_missing | MCP_CONFIG_MISSING | Required setting {name} is missing. |
| mcp_configuration_invalid | MCP_CONFIG_INVALID | Setting {name} is invalid. Expected {requirement}. |
| mcp_dependency_missing | MCP_DEPENDENCY_MISSING | Required dependency {name} is unavailable. |
| mcp_state_storage_unavailable | MCP_STATE_STORAGE_UNAVAILABLE | Could not {operation} OAuth state at {path} ({os_code}). |
| mcp_state_invalid | MCP_STATE_INVALID | OAuth state at {path} is invalid ({reason}). |
| mcp_launch_failed | MCP_SPAWN_FAILED | Could not launch {executable} from {cwd} ({os_code}). |
| mcp_process_exited | MCP_PROCESS_EXITED | MCP process {pid} exited before readiness with code {exit_code}. |
| mcp_process_exited | MCP_PROCESS_SIGNALED | MCP process {pid} received {signal} before readiness. |
| local_readiness_failed | MCP_PROBE_CONNECTION_FAILED | Could not connect to {host}:{port} ({os_code}). |
| local_readiness_failed | MCP_PROBE_TIMEOUT | The local readiness probe exceeded {timeout_ms} ms. |
| local_readiness_failed | MCP_PROBE_HTTP_ERROR | The local readiness endpoint returned HTTP {status} ({response_code}). |
| local_readiness_failed | MCP_PROBE_INVALID_METADATA | The local readiness endpoint returned invalid discovery metadata ({reason}). |
| local_readiness_failed | MCP_PROBE_ISSUER_MISMATCH | The discovery issuer was {actual_issuer}. Expected {expected_issuer}. |
| mcp_startup_deadline_elapsed | MCP_STARTUP_TIMEOUT | MCP did not become ready within {timeout_ms} ms. Last probe result was {last_probe_code}. |
| container_stopped | MCP_CONTAINER_STOPPED | Codespace {codespace_name} stopped before MCP became ready. |
| mcp_startup_error | MCP_STARTUP_UNEXPECTED_ERROR | Unexpected error during {operation} ({error_code}). See startup log {log_id}. |
