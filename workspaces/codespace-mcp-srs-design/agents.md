{
  "schema": "terminals.codespace-mcp.design-bootstrap.v1",
  "version": "1.0.0",
  "format": "json-in-md",
  "type": "agent_bootstrap",
  "repository": "BestNameYet/Terminals",
  "workspace_root": "workspaces/codespace-mcp-srs-design/",
  "phase": "design",
  "status": "ready_for_planning",
  "authority": {
    "relationship": "supplements",
    "repository_agents": "AGENTS.md",
    "repository_requirements": "terminals_requirements.json",
    "workspace_context": "workspaces/codespace-mcp-srs-design/README.md",
    "self": "workspaces/codespace-mcp-srs-design/agents.md",
    "precedence": "repository_AGENTS_md_and_higher_priority_instructions_control",
    "on_conflict": "stop_and_report_without_override",
    "entrypoint_order": [
      "AGENTS.md",
      "terminals_requirements.json",
      "workspaces/codespace-mcp-srs-design/README.md",
      "workspaces/codespace-mcp-srs-design/agents.md",
      "applicable_current_interface_contracts"
    ],
    "case_sensitive_filename": true,
    "auto_discovery_assumed": false
  },
  "objective": {
    "system": "github_codespace_hosted_nodejs_mcp_development_environment",
    "goal": "complete_a_testable_design_baseline_for_a_persistent_recoverable_mcp_enabled_coding_and_terminal_workspace_accessible_to_authorized_chatgpt_agents",
    "aims": [
      "one_remote_MCP_endpoint_exposing_authorized_tools_and_resources",
      "reusable_coding_environment_with_persistent_project_files_and_recoverable_task_state",
      "authenticated_resource_and_tool_access_with_workspace_isolation",
      "terminal_process_execution_and_observable_stdout_stderr_exit_status",
      "versioned_rules_and_specifications_delivered_to_agents_prior_to_covered_actions",
      "deterministic_task_ordering_nonces_receipts_replay_protection_and_failure_recovery",
      "Codespace_lifecycle_provisioning_restart_reconnect_and_health_monitoring",
      "GitHub_repository_integration_and_compatibility_with_existing_execution_contracts",
      "verifiable_requirements_interfaces_security_and_end_to_end_acceptance_criteria"
    ]
  },
  "boundary": {
    "mode": "specification_only",
    "permitted": [
      "read_and_analyze_documentation",
      "research_current_service_constraints",
      "author_or_revise_design_artifacts_within_workspace",
      "validate_documents_and_traceability"
    ],
    "prohibited_without_separate_authorization": [
      "deploy_mcp_server",
      "provision_codespaces",
      "create_or_modify_live_workflows",
      "change_repository_runtimes",
      "alter_other_project_directories",
      "change_repository_AGENTS_md",
      "replace_existing_command_interface"
    ],
    "non_assumptions": [
      "Codespace_ports_are_not_guaranteed_available_while_stopped",
      "scheduled_workflows_do_not_guarantee_high_availability",
      "MCP_resource_listing_does_not_guarantee_model_context_injection",
      "tool_result_visibility_does_not_prove_procedural_compliance",
      "GitHub_Actions_dispatch_success_does_not_prove_effect_success",
      "hosting_terms_and_chatgpt_tool_capabilities_require_verification"
    ]
  },
  "workflow": {
    "ordering": "strict_sequential",
    "task_status_values": [
      "pending",
      "in_progress",
      "blocked",
      "verified"
    ],
    "advance_when": "all_exit_checks_verified",
    "on_block": "record_evidence_and_stop_without_skipping",
    "on_revision": "revalidate_downstream_artifacts_and_traceability",
    "required_evidence": [
      "source_identity",
      "source_revision",
      "decision_provenance",
      "requirement_ids",
      "verification_criteria",
      "unresolved_items"
    ]
  },
  "tasks": [
    {
      "id": "DES-001",
      "order": 1,
      "depends_on": [],
      "action": "read_governing_docs_and_check_workspace",
      "outputs": [
        "governing_baseline"
      ],
      "exit": [
        "instruction_precedence_recorded",
        "workspace_and_current_contracts_verified"
      ]
    },
    {
      "id": "DES-002",
      "order": 2,
      "depends_on": [
        "DES-001"
      ],
      "action": "inventory_relevant_existing_repositories_workflows_tools_and_procedures",
      "targets": [
        "Terminals",
        "CommandLine",
        "StateMachines",
        "IssueStack-",
        "IssueScratch",
        "Canonical-Skills-Location"
      ],
      "outputs": [
        "source_inventory"
      ],
      "exit": [
        "current_vs_legacy_and_proposed_distinguished",
        "existing_authority_boundaries_recorded"
      ]
    },
    {
      "id": "DES-003",
      "order": 3,
      "depends_on": [
        "DES-002"
      ],
      "action": "verify_external_technical_capabilities_and_constraints",
      "topics": [
        "MCP_protocol_and_SDK",
        "ChatGPT_MCP_tool_and_resource_support",
        "Codespaces_API_devcontainers_port_forwarding_idle_stop_restart_limits",
        "GitHub_Actions_schedule_and_token_permissions",
        "GitHub_hosting_usage_terms_cost_and_security"
      ],
      "outputs": [
        "feasibility_evidence",
        "unresolved_constraints"
      ],
      "exit": [
        "claims_have_source_dates",
        "unsupported_assumptions_flagged"
      ]
    },
    {
      "id": "DES-004",
      "order": 4,
      "depends_on": [
        "DES-003"
      ],
      "action": "define_stakeholders_goals_scope_non_goals_system_boundaries_and_operating_modes",
      "outputs": [
        "SRS.md"
      ],
      "exit": [
        "design_only_boundary_explicit",
        "acceptance_objectives_enumerated"
      ]
    },
    {
      "id": "DES-005",
      "order": 5,
      "depends_on": [
        "DES-004"
      ],
      "action": "specify_functional_and_nonfunctional_requirements_with_stable_ids",
      "topics": [
        "Codespace_provisioning",
        "MCP_server",
        "MCP_resources",
        "MCP_tools",
        "terminal_and_pty",
        "coding_and_git",
        "workspace_persistence",
        "restart_recovery",
        "agent_rules_delivery",
        "authorization",
        "task_state_nonces_ordering",
        "receipts_and_observability"
      ],
      "outputs": [
        "SRS.md"
      ],
      "exit": [
        "each_requirement_is_atomic",
        "preconditions_invariants_errors_and_acceptance_named"
      ]
    },
    {
      "id": "DES-006",
      "order": 6,
      "depends_on": [
        "DES-005"
      ],
      "action": "project_SRS_into_agent_oriented_semantic_JSON",
      "outputs": [
        "SRS.agent.json"
      ],
      "exit": [
        "machine_projection_valid",
        "no_line_by_line_mapping",
        "requirements_and_source_revision_traceable",
        "facts_inferences_assumptions_separated"
      ]
    },
    {
      "id": "DES-007",
      "order": 7,
      "depends_on": [
        "DES-006"
      ],
      "action": "design_component_topology_trust_boundaries_and_dataflows",
      "topics": [
        "Codespace",
        "devcontainer",
        "Node_MCP_server",
        "GitHub_APIs",
        "ChatGPT_client",
        "filesystem",
        "process_manager",
        "monitoring_and_watchdog",
        "agent_execution_governance"
      ],
      "outputs": [
        "ARCHITECTURE.md"
      ],
      "exit": [
        "component_ownership_and_calls_defined",
        "external_dependencies_explicit"
      ]
    },
    {
      "id": "DES-008",
      "order": 8,
      "depends_on": [
        "DES-007"
      ],
      "action": "specify_MCP_interfaces_and_resource_semantics",
      "topics": [
        "transport",
        "authentication",
        "tools/list",
        "tools/call",
        "resources/list",
        "resources/read",
        "embedded_resources",
        "prompts_optional",
        "URI_mapping",
        "revision_and_cache_behavior",
        "capability_negotiation"
      ],
      "outputs": [
        "INTERFACES.md"
      ],
      "exit": [
        "typed_requests_responses_and_errors_defined",
        "host_support_assumptions_flagged"
      ]
    },
    {
      "id": "DES-009",
      "order": 9,
      "depends_on": [
        "DES-008"
      ],
      "action": "specify_terminal_coding_and_process_session_contracts",
      "topics": [
        "exec",
        "pty",
        "stdin_stdout_stderr",
        "timeouts_and_signals",
        "interrupt",
        "concurrency",
        "working_directory",
        "repository_identity",
        "filesystem_access",
        "commit_and_test_lifecycle"
      ],
      "outputs": [
        "INTERFACES.md",
        "ARCHITECTURE.md"
      ],
      "exit": [
        "authorization_and_path_safety_rules_defined",
        "completion_vs_process_exit_distinguished"
      ]
    },
    {
      "id": "DES-010",
      "order": 10,
      "depends_on": [
        "DES-009"
      ],
      "action": "design_lifecycle_durability_and_failure_recovery",
      "topics": [
        "create_start_stop_rebuild",
        "startup_service",
        "MCP_endpoint_reachability",
        "watchdog_health_checks",
        "disconnections",
        "restart_idempotency",
        "task_checkpoint",
        "durable_vs_ephemeral_data",
        "replay_and_queue_recovery"
      ],
      "outputs": [
        "ARCHITECTURE.md",
        "INTERFACES.md"
      ],
      "exit": [
        "state_restoration_conditions_defined",
        "unavailable_service_behavior_defined"
      ]
    },
    {
      "id": "DES-011",
      "order": 11,
      "depends_on": [
        "DES-010"
      ],
      "action": "design_security_and_instruction_delivery_governance",
      "topics": [
        "principals",
        "least_privilege",
        "token_and_secret_storage",
        "public_port_exposure",
        "sandbox_and_workspace_isolation",
        "path_traversal",
        "agent_rule_preflight",
        "resource_provenance_hashing",
        "fail_closed_approval",
        "audit_receipts"
      ],
      "outputs": [
        "ARCHITECTURE.md",
        "INTERFACES.md",
        "SRS.md"
      ],
      "exit": [
        "trust_boundaries_and_enforcement_points_documented",
        "procedure_exposure_not_conflated_with_compliance"
      ]
    },
    {
      "id": "DES-012",
      "order": 12,
      "depends_on": [
        "DES-011"
      ],
      "action": "analyze_alternatives_tradeoffs_risks_and_open_decisions",
      "topics": [
        "Codespaces_vs_dedicated_host",
        "watchdog_reliability",
        "rate_limits_and_cost",
        "host_permissions",
        "workflow_migration",
        "existing_contract_conflicts",
        "operational_security",
        "service_terms"
      ],
      "outputs": [
        "DECISIONS-AND-RISKS.md"
      ],
      "exit": [
        "decisions_have_evidence_and_status",
        "unresolved_questions_not_silently_settled"
      ]
    },
    {
      "id": "DES-013",
      "order": 13,
      "depends_on": [
        "DES-012"
      ],
      "action": "define_unit_component_integration_security_and_end_to_end_acceptance_tests",
      "topics": [
        "MCP_resource_visibility",
        "rule_preflight_enforcement",
        "tool_authorization",
        "terminal_IO",
        "filesystem_persistence",
        "stopped_codespace",
        "restart_recovery",
        "watchdog_missed_runs",
        "GitHub_permissions",
        "receipt_consistency",
        "full_task_postconditions"
      ],
      "outputs": [
        "VERIFICATION-PLAN.md"
      ],
      "exit": [
        "requirements_trace_to_tests",
        "success_requires_independent_state_readback",
        "not_run_distinct_from_pass"
      ]
    },
    {
      "id": "DES-014",
      "order": 14,
      "depends_on": [
        "DES-013"
      ],
      "action": "cross_check_all_design_documents_and_refresh_semantic_projection",
      "outputs": [
        "SRS.md",
        "SRS.agent.json",
        "ARCHITECTURE.md",
        "INTERFACES.md",
        "DECISIONS-AND-RISKS.md",
        "VERIFICATION-PLAN.md"
      ],
      "exit": [
        "all_requirements_and_interfaces_consistent",
        "source_and_projection_versions_match",
        "unresolved_and_unverified_items_visible"
      ]
    },
    {
      "id": "DES-015",
      "order": 15,
      "depends_on": [
        "DES-014"
      ],
      "action": "produce_design_phase_completion_record_and_implementation_handoff_gate",
      "outputs": [
        "design_acceptance_record"
      ],
      "exit": [
        "artifact_exists_and_versions_verified",
        "design_only_status_preserved",
        "implementation_requires_separate_authorization"
      ]
    }
  ],
  "deliverables": {
    "required": [
      "SRS.md",
      "SRS.agent.json",
      "ARCHITECTURE.md",
      "INTERFACES.md",
      "DECISIONS-AND-RISKS.md",
      "VERIFICATION-PLAN.md"
    ],
    "status": "not_yet_created",
    "directory": "workspaces/codespace-mcp-srs-design/",
    "acceptance": "complete_consistent_versioned_verified_and_explicitly_separated_from_implementation"
  }
}
