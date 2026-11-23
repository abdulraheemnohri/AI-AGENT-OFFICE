# Roadmap

0 Foundation: desktop shell, dashboard, settings, native text open/save and CI.
1 File engine: recent-file database, LibreOffice interoperability, DOCX/ODT round-trip and PDF viewing.
2 Editors: Writer model, Sheets grid/formulas, Slides canvas/PPTX and PDF page tools.
3 Local AI: runtime contract, llama.cpp GGUF, model import/checksums/load/unload, ONNX and embeddings.
4 AI office: chat, streaming, RAG, citations, OCR and editor assistants.
5 Agents: scoped tools, plan/approve/execute/verify, workflow builder and audit.
6 Production: compatibility/security/performance tests, Windows validation, NSIS/MSI and signed releases.

A milestone is complete only when code, tests and documentation exist.

## Current milestone additions
- Implemented PC document import/export, CSV and slide outline exports, and versioned workspace JSON backup/restore.
- Implemented a local Google LiteRT-LM Python API bridge with CPU/GPU selection; runtime/model assets remain a separate offline payload.
- Added Windows offline payload preparation, local-wheel installation and installer packaging scripts.
- Still required for a truly self-contained offline installer: bundle a tested Python runtime, LiteRT-LM native dependencies, and licensed model weights; verify on a clean Windows machine without internet.

## Office format implementation update
- Added DOCX text import and basic DOCX/RTF export, XLSX first-sheet import/export, PPTX text import and title/body export, plus PDF merge/extract/rotate/delete/reorder/duplicate/blank-page/text-stamp workflows.
- Added full-workspace autosave recovery, restore confirmation and explicit local-data reset.
- Added automated format tests for DOCX, XLSX, PPTX and PDF operations.
- Remaining format fidelity work: DOCX style/layout round-trip, XLSX multiple sheets/styles/charts/pivots, PPTX visual canvas and layout fidelity, ODT/ODS/ODP/RTF import, multi-sheet XLSX, and PDF OCR/forms/signatures/annotation.
