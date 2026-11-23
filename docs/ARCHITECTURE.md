# Architecture

Tauri 2 desktop shell; React/TypeScript UI; Rust application services; independent office format adapters; AI core with model catalog/router/runtime adapters; agent planner with permission checks/tool registry/approvals/audit; SQLite metadata and task history.

Every runtime adapter should expose probe, capabilities, load, infer, cancel, unload and health. Unsupported operations must be explicit. No runtime is operational until a real model inference self-test succeeds.

Security: native file dialogs, scoped permissions, input/size validation, explicit destructive-action approvals, no model-provided shell execution and no network access for local inference.