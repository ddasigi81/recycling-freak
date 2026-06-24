# Copilot instructions for recycling-freak

Purpose: quick, actionable guidance to help future Copilot sessions work effectively in this repository.

---

## Quick start (dev / run)

- Dev server: npm run dev or npm start (both use live-server on port 3000)
  - Example: npm install && npm run dev
  - Server serves index.html; default port: 3000, entry file: index.html

- Tests: No test runner or test files configured in this repository.
  - There is no way to run a single test because no test framework is present.

- Lint: No linter or lint scripts configured.

---

## High-level architecture

- Repository is a small, framework-less static web app.
- Entry point: index.html. The page loads a small stack of non-module scripts in this order:
  1. lucide icon script (external)
  2. js/config.js — global CONFIG and CATEGORIES
  3. js/data.js — built-in sample data + dummy generators
  4. js/api.js — API/fallback layer (exposes Api)
  5. js/map.js — MapController (kakao or fallback)
  6. js/app.js — main UI state, DOM binding and rendering
- Supporting clients (in js/ and openapi/):
  - js/vworld.js (VWorld search client)
  - js/clothing_collect_bins.js (public data API client)
  - openapi/*.yaml contains the API specs used to generate/derive those clients
- Data flow (common path): UI (app.js) -> Api.* (api.js) -> either real OpenAPI endpoints or data.js dummy generator -> MapController renders map
- Global singletons: Api, MapController, CONFIG, CATEGORIES, vworldClient, clothingBinsClient are attached to window and expected by other scripts.

Notes:
- js/main.js exists but is not referenced by index.html (looks like an alternate/legacy UI glue).

---

## Key conventions and repo-specific patterns

- Script load order matters. config.js must load before api.js/map.js/app.js because it defines CONFIG and CATEGORIES.
- API key configuration:
  - Browser UI: the top-right "API 키 설정" dialog stores keys in localStorage (KAKAO_JS_KEY and DATA_GO_KR_KEY). CONFIG reads localStorage at runtime.
  - Clients expose setters and also read global window variables / environment variables when available (e.g., vworldClient.setVworldApiKey, clothingBinsClient.setServiceKey). You can set window.VWORLD_API_KEY or window.CLOTHING_BINS_SERVICE_KEY prior to script load to preconfigure keys.
- Dummy data mode:
  - When CONFIG.USE_DUMMY is true (i.e., no DATA_GO_KR_KEY), Api.* falls back to data.js generators and sample arrays (REGION_DB, generateDummyBins, BULKY_FEE_SAMPLE, etc.). Tests or UI inspection should run in dummy mode by default unless real keys are supplied.
- Category configuration:
  - CATEGORIES is the single place to add/modify categories. Each entry includes id, label, icon, type ("bin" | "info"), endpoint, and fields mapping. api.js uses category.fields to map dataset responses.
- Map behavior:
  - MapController attempts to load Kakao SDK when CONFIG.KAKAO_JS_KEY is present. If that fails or key is missing, it uses a DOM-based fallback scatter-plot.
- Fetch resilience and fallbacks:
  - api.js and client wrappers catch network/format errors and fall back to in-repo dummy data where reasonable. Expect code paths that return sample data when remote calls fail.
- DOM conventions:
  - app.js renders UI by string templates and attaches event handlers after DOMContentLoaded. Follow existing patterns (escapeHtml, render* functions) when adding UI pieces.

---

## Files of interest for automation or codegen

- openapi/vworld.yaml and openapi/clothing_collect_bins.yaml — API specifications used to derive client code (see js/vworld.js and js/clothing_collect_bins.js).
- js/config.js — single source of truth for categories and runtime defaults.
- js/data.js — useful for writing deterministic tests (seededRandom) and for smoke runs without API keys.

---

## Notes for Copilot sessions

- Prefer small, surgical edits. This is a lightweight static site; avoid introducing heavy build systems unless requested.
- When adding runtime secrets or keys for testing, prefer using localStorage or window globals for local development rather than committing keys.
- If adding automated tests or E2E, wire them to use data.js deterministic generators or provide a way to inject mocked clients (the clients expose setters and are attached to window).
- For UI changes, follow the template + render* pattern in app.js to keep consistency.

---

## Existing AI/assistant guidance

- GEMINI.md contains AI development guidance present at repository root. It can be referenced by session agents for policy and preferred behavior in this project (it documents expected approach to web projects and Firebase MCP configuration snippet).

---

If any of this file should be expanded (test guidance, CI steps, or adding Playwright/preview servers), say so and specify which area to cover.
