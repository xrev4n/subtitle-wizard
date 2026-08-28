# Subtitle Wizard 🪄

> **100% In-Memory, Client-Side Subtitle Processing, Interactive Editor, Spotify Lyrics Studio & AI Translation Platform**
> 
> *Optimized for AI Agents, Pair-Programming Assistants & Human Developers.*

---

## 🌟 Project Overview

**Subtitle Wizard** is a modern, privacy-first web application designed to parse, validate, edit, timing-shift, synchronize, translate, and export `.srt`, `.vtt`, and `.ass` subtitle files entirely in client memory. All processing occurs locally within the browser, requiring **zero backend servers**, **zero cloud dependencies**, and guaranteeing complete data privacy.

### Key Mission & Objectives
- **Zero-Cloud & 100% Local**: No subtitle content, video, or audio ever leaves the user's browser.
- **Unified Workspace & Always-On Studio**: An elegant, continuous interface where the Media Stage (Video or Dark Canvas Preview) and the Spotify Lyrics/Live Editor coexist side-by-side.
- **Local LLM Inference**: Direct browser-to-server HTTP communication with local OpenAI-compatible APIs (LM Studio, Ollama, LocalAI, vLLM).
- **AI Batch Translation Engine with 1:1 ID Guarantee**: Slices subtitle cues into configurable batches, enforces strict JSON structured output, preserves multi-speaker dialogues (`- Speaker 1\n- Speaker 2`), validates 1:1 cue ID integrity, and automatically degrades to 1x1 micro-batching to prevent off-by-one errors.
- **Interactive In-Memory Subtitle Editor**: In-place text and timestamp editing, cue insertion, cue splitting, adjacent merging, and non-destructive Undo support.
- **Precision Timing Shift Tools**: Millisecond-accurate global, progressive, or selective time shifts with automatic zero clamping.
- **Temporal Integrity Diagnostics**: Instant detection and visual flagging of cue overlaps, invalid durations (<100ms), and empty subtitle blocks.
- **Spotify Lyrics-Style Interactive Panel**: Real-time flowing subtitles on the right of the video featuring smooth auto-scroll to the active line, dimmed inactive cues, and in-place editing that automatically pauses media playback.
- **Multi-Format Export Suite**: Export to canonical SubRip (`.srt`), WebVTT (`.vtt`), Advanced SubStation Alpha (`.ass`), and Plain Text (`.txt`) with Single (Translated/Source) or Bilingual Dual modes.
- **Modular i18n**: Fully decoupled JSON internationalization system (Spanish / English) without external packages.
- **Session Auto-Persistence**: Automatic local restoration of workspace state between browser reloads.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **UI Framework** | React 19 (`^19.2.8`) | Modern component architecture, functional hooks |
| **Build Tool & Bundler** | Vite 8 (`^8.2.2`) | Ultra-fast HMR and production bundle optimization |
| **Styling Engine** | Tailwind CSS v4 (`^4.3.3`) + `@tailwindcss/vite` | Modern `@import "tailwindcss";` without legacy configs |
| **Iconography** | Lucide React (`^1.35.0`) | Clean, accessible SVG icons |
| **Class Utilities** | `clsx` + `tailwind-merge` | Conditional and merged utility styling |
| **Parser & Serializer** | Pure ES Modules (`src/utils/srtParser.js`) | Zero-dependency millisecond-accurate SRT parser |
| **Timing & Integrity Engine** | Pure ES Modules (`src/utils/timingUtils.js`) | Time shifting, overlap validator, split, merge & insert |
| **Multi-Format Exporters** | Pure ES Modules (`src/utils/exporters.js`) | SRT, WebVTT, ASS/SSA, Plain text & Bilingual dual |
| **Local LLM Client** | Native `fetch` + `AbortController` (`src/services/llmService.js`) | Local OpenAI-compatible client for LM Studio / Ollama |
| **Batch Translation Engine** | Custom Orchestrator (`src/hooks/useTranslationQueue.js` & `translationService.js`) | 1:1 ID validator, multi-speaker dialogue prompt, and 1x1 micro-batch fallback |
| **Local Media Player** | HTML5 Media API (`src/components/MediaSyncPlayer.jsx`) | Memory-safe `URL.createObjectURL` video/audio live sync & canvas stage |
| **Spotify Lyrics Panel** | Custom Sync Engine (`src/components/LyricsSyncPanel.jsx`) | Smooth auto-scroll, auto-pause on focus, and channel viewing |
| **Session Persistence** | Web Storage (`src/services/storageService.js`) | Automatic client-side project snapshot caching |

---

## 📁 Architecture & Directory Tree

```
subtitle-wizard/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   │   └── ...
│   ├── components/
│   │   ├── ExportModal.jsx               # Multi-format export dialog (.srt, .vtt, .ass, .txt, dual)
│   │   ├── FileUploader.jsx              # Minimalist landing dropzone with sample loader
│   │   ├── Header.jsx                    # Refined top bar with LM Studio latency badge & quick actions
│   │   ├── LyricsSyncPanel.jsx           # Spotify-style lyrics vertical flow, auto-scroll & auto-pause
│   │   ├── MediaSyncPlayer.jsx           # Always-on 2-column Media Studio (Video/Canvas + Lyrics)
│   │   ├── SettingsModal.jsx             # Local LLM connection, model selector & param tuning
│   │   ├── StatsBar.jsx                  # Aggregate metrics summary cards (blocks, duration, words)
│   │   ├── SubtitlePreview.jsx           # Detailed table editor, search filter, export & row actions
│   │   ├── TimingShiftModal.jsx          # Millisecond offset shifts, scope selection & presets
│   │   ├── TranslationControlBar.jsx     # Streamlined language selectors, start, pause, resume & cancel
│   │   └── TranslationProgressBar.jsx    # Live progress bar, batch telemetry, speed & ETA
│   ├── context/
│   │   ├── I18nContext.jsx               # Modular i18n Provider and useTranslation() hook
│   │   └── SettingsContext.jsx           # Local LLM connection state, latency & parameters
│   ├── hooks/
│   │   └── useTranslationQueue.js        # Queue orchestrator, lifecycle state machine & telemetry
│   ├── locales/
│   │   ├── en/
│   │   │   ├── common.json               # English actions, alerts, badges, status
│   │   │   ├── editor.json               # English editor, shift modal, validation & actions
│   │   │   ├── export.json               # English multi-format export copy & format labels
│   │   │   ├── header.json               # English header and navigation labels
│   │   │   ├── parser.json               # English dropzone, stats, preview labels
│   │   │   ├── player.json               # English local media player & lyrics sync copy
│   │   │   ├── settings.json             # English LLM settings, parameters & diagnostic copy
│   │   │   └── translation.json          # English batch translation controls, progress & statuses
│   │   └── es/
│   │       ├── common.json               # Spanish actions, alerts, badges, status
│   │       ├── editor.json               # Spanish editor, shift modal, validation & actions
│   │       ├── export.json               # Spanish multi-format export copy & format labels
│   │       ├── header.json               # Spanish header and navigation labels
│   │       ├── parser.json               # Spanish dropzone, stats, preview labels
│   │       ├── player.json               # Spanish local media player & lyrics sync copy
│   │       ├── settings.json             # Spanish LLM settings, parameters & diagnostic copy
│   │       └── translation.json          # Spanish batch translation controls, progress & statuses
│   ├── services/
│   │   ├── llmService.js                 # Native fetch client for /models and /chat/completions
│   │   ├── storageService.js             # Client project session persistence (localStorage)
│   │   └── translationService.js         # 1:1 ID validator, dialogue sanitization & batch translator
│   ├── utils/
│   │   ├── exporters.js                  # Multi-format converters (SRT, VTT, ASS, TXT, Dual)
│   │   ├── srtParser.js                  # Core SRT parse, serialize, format & sample generator
│   │   └── timingUtils.js                # Timing shift, integrity diagnostics, split, merge & insert
│   ├── App.jsx                           # Root application orchestrating the unified workspace
│   ├── index.css                         # Tailwind CSS v4 core and glassmorphism styling
│   └── main.jsx                          # React 19 DOM entry point
├── eslint.config.js                      # ESLint configuration
├── index.html                            # HTML5 entry with metadata
├── package.json                          # Project manifest and scripts
├── README.md                             # AI & developer documentation context
└── vite.config.js                        # Vite + Tailwind v4 plugin configuration
```

---

## 🤖 1:1 Translation Integrity & Multi-Speaker Shield

### 1. Multi-Speaker Dialogue Preservation
Subtitle cues frequently contain multi-speaker interactions formatted with leading hyphens:
```
- Thank you, Gordon.
- It ranks poor with me too.
```
`translationService.js` enforces prompt rules and few-shot examples ensuring the LLM keeps all speakers and line breaks within the **same** cue's `text` property, never creating extra IDs or splitting items.

### 2. Multi-Pass JSON Sanitization (`extractAndParseJSON`)
Subtitle translations often contain literal newlines inside JSON strings. `extractAndParseJSON` sanitizes raw model output through a multi-pass parser and a regex fallback to guarantee valid extraction without syntax crashes.

### 3. Automatic 1x1 Micro-Batching Fallback
`validateBatchIntegrity` verifies that every requested cue ID exists in the model's output. If a batch contains mismatched IDs or fails 1:1 validation, the engine automatically degrades to **1x1 micro-batching** for those cues, preventing off-by-one errors and guaranteeing exact alignment without aborting the queue.

---

## 🚀 Status Tracker & Roadmap (100% MVP Completed)

| Phase | Description | Status | Key Deliverables |
| :---: | :--- | :---: | :--- |
| **Phase 1** | **Core Architecture, In-Memory SRT Parser & Modular i18n** | ✅ **Completed** | React 19 + Tailwind CSS v4, i18n ES/EN context, `parseSRT`/`serializeSRT` engine, UI components (`Header`, `FileUploader`, `StatsBar`, `SubtitlePreview`), `README.md`. |
| **Phase 2** | **Local LLM Server Integration & Diagnostic Module** | ✅ **Completed** | Native fetch `llmService.js` (/models, /chat/completions), `SettingsContext`, `SettingsModal`, live latency tracking, dynamic model discovery, test inference engine. |
| **Phase 3** | **Batch Translation Engine & Queue Management** | ✅ **Completed** | `translationService.js` with strict JSON prompt schema & resilient parser, `useTranslationQueue.js` hook with pause/resume/cancel/retry, `TranslationControlBar`, `TranslationProgressBar`, dual comparative preview. |
| **Phase 4** | **Interactive Subtitle Editor & Timing Shift Tools** | ✅ **Completed** | `timingUtils.js` (shift, split, merge, insert, delete, validate), `TimingShiftModal`, in-place editable cues, visual overlap diagnostics, undo history stack. |
| **Phase 5** | **Multi-Format Export & Synchronized Media Player** | ✅ **Completed** | `exporters.js` (SRT, VTT, ASS, TXT, Dual), `ExportModal`, `MediaSyncPlayer` with live caption overlay and bidirectional click-to-seek, `LyricsSyncPanel` (Spotify Lyrics mode with auto-scroll & auto-pause), `storageService.js` session auto-saving. |
| **UX Refinement** | **Unified Minimalist Workspace & 1:1 Translation Shield** | ✅ **Completed** | 2-column Media Studio (Video/Canvas stage + Spotify Lyrics), 1:1 translation validation, multi-speaker dialogue preservation, 1x1 micro-batch fallback. |

---

## 💻 Development & Execution

```bash
# Install dependencies
npm install

# Start Vite development server (with HMR)
npm run dev

# Run ESLint validation
npm run lint

# Build production bundle
npm run build

# Preview production build
npm run preview
```

---

## 🔒 Privacy & Security Guarantee
This application executes 100% locally in the user's browser. All communication with LLMs is directed solely to user-authorized local host endpoints (such as `http://localhost:1234/v1`). No video, audio, or subtitle files are transmitted over external networks. Zero telemetry, zero analytics, and zero cloud lock-in.
