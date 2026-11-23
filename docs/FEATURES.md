# Implemented capabilities and honest status

This document distinguishes working foundation features from planned integrations.

## Working in this branch
- Windows desktop shell built with Tauri 2, React and TypeScript.
- Module navigation and dashboard.
- UTF-8 text/Markdown Writer with edit/preview, word and character counts, find/replace-all, native open/save dialogs, and optional local recovery snapshot.
- CSV grid editor with quoted-field parsing and escaping, import, cell editing, row extension, and CSV export.
- Presentation outline editor with slide add/delete/edit and Markdown outline export.
- Local task checklist and deterministic safe-plan template. It does not invoke an LLM, run commands, or modify external files.\n- Local persistence for spreadsheet contents, slide outlines and task lists in the desktop WebView profile.
- Local preferences for theme, editor font size, autosave recovery, offline preference, telemetry preference and default format.
- Runtime compatibility catalog with clear "planned" status.

## Not implemented yet
- Native DOCX/ODT/RTF rich document editing; XLSX/XLS/ODS, formulas, charts and pivot tables; PPTX/PPT/ODP slide rendering; PDF rendering/annotation/OCR.
- Local model inference, model downloads, runtime adapters, embeddings, RAG, speech, vision or AI chat.
- Agent tool execution, workflow triggers, scheduler, background services, plugin/connector system.
- Enforced network isolation, native overwrite confirmation, cloud sync or multi-device collaboration.

## Format policy
The current Writer edits UTF-8 text formats only. CSV is the only spreadsheet import/export format. Slides export to Markdown outline only. Do not rename these exports to DOCX, XLSX or PPTX; those formats require real format engines.
\n\n## Windows device integration\n- Printer: invokes the WebView/Windows print dialog; printer selection, copies and driver features are handled by Windows. Print stylesheet supports configured A4/Letter, portrait/landscape and margins.\n- USB: enumerates Windows removable logical drives and allows exporting the current Markdown/text document or CSV workbook to the drive root. Exports are size-limited to 20 MB, filenames are sanitized, and existing files are never overwritten.\n- USB limitations: only drives reported by Windows as `DRIVE_REMOVABLE` are shown. Some USB external HDD/SSD devices report `DRIVE_FIXED` and are intentionally not listed by this implementation. No arbitrary USB HID, serial, camera or phone/MTP device access is implemented.\n