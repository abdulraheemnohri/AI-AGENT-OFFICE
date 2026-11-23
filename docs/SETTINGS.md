# Settings specification

General: theme, language, startup workspace, save folder, recent-file limit, density and notifications.
Privacy: offline-only policy, allowed/excluded folders, indexing consent, local encryption and audit retention.
AI: default model/runtime, task routing, context, token budget, temperature, CPU threads, GPU layers, memory budget, streaming, idle unload, RAG and citations.
Office: fonts, page size, margins, units, spell-check language, auto-format, templates, CSV delimiter and export compatibility.
Performance: cache quota, preview cache, indexing priority, concurrent jobs, model unload timeout and resource warnings.
Backup: autosave recovery snapshot, full JSON workspace export/import/restore (20 MB limit), and USB export. Encryption, scheduled backups and configurable backup path are still planned.

Implemented in this branch: dark/light/system theme, compact/comfortable density, editor font size, spell-check toggle and English/Urdu language selection (uses Windows language resources), default text format, print paper/orientation/margins, overwrite confirmation preference, configurable autosave delay, recovery snapshot, and LiteRT-LM model path/backend/chat-history persistence. LiteRT-LM chat history is stored locally and included in workspace backups. Offline-only is currently a preference; it does not firewall network access. LiteRT-LM package/model installation is handled by the offline bundle scripts.
Agent permissions: allowed roots, read/write scopes, overwrite/delete confirmation, batch limit, approval-required tools and execution history. These agent permission controls are specified but not yet wired to an execution engine.

Settings must be versioned and validated. A preference is not a working feature until implemented.