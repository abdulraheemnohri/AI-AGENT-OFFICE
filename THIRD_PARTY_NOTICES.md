# Third-party notices

AI Agent Office uses open-source packages. This file records direct dependencies that are specifically integrated into feature modules. A complete transitive dependency inventory and bundled licence-text audit remains part of release readiness.

## Recharts

- Package: `recharts` (`^3.10.1`)
- Purpose: local responsive bar, line and pie chart rendering in the Sheets module.
- Licence: MIT.
- Upstream repository: https://github.com/recharts/recharts
- Licence file: https://github.com/recharts/recharts/blob/main/LICENSE
- Integration: consumed as an npm dependency; upstream source is not copied or modified in this repository.

## Existing presentation export dependency

- Package: `pptxgenjs` (`^3.12.0`)
- Purpose: generate editable PowerPoint presentations from slide outline content.
- Licence: MIT.
- Upstream repository: https://github.com/gitbrent/PptxGenJS
- Licence file: https://github.com/gitbrent/PptxGenJS/blob/master/LICENSE

## Licence policy

- Prefer permissive OSI-approved licences (MIT, Apache-2.0, BSD, ISC) for application dependencies.
- Do not integrate paid-only, source-available, or dual-licensed packages without an explicit licence and distribution review.
- Preserve upstream notices and licence texts when redistributing dependencies as part of an installer.
- Re-check package and transitive dependency licences when versions change. This document is not a substitute for the full release-time legal audit.
