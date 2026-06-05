# Brainly — Local-First Spatial Thinking Canvas Workspace

Brainly is a zero-dependency, local-first visual thinking workspace running directly in your web browser. Built entirely with vanilla web technologies, it provides a secure, minimal environment to capture, link, explore, and map knowledge patterns inside a spatial viewport.

---

## 🌟 Architecture & Core Feature Set

* **Spatial Interaction Sandbox:** Drag-and-drop notes and thought folder structures organically across a flexible virtual desk view.
* **Isolated Resource Container ("My Links"):** A dedicated, fixed iPhone-style folder structure acting as a perimeter boundary for external bookmarks and uploaded PDFs.
* **Deterministic Visual Generation Engine:** Zero network metadata requests or OpenGraph scraping. Tiles generate persistent pastel HSL background values and appropriate contextual emojis based entirely on local character hash calculations.
* **Native Speech-to-Text Pipelines:** High-performance local voice indexing running directly via browser-native hardware audio routing. Audio is deleted immediately upon final text conversion.
* **Fully Sandboxed Assistant Engine:** Chat directly with context pools synthesized dynamically on-device from your notes and directory logs.

---

## 🔒 Security Model & Sandbox Guardrails

┌────────────────────────────────────────────────────────┐
│               SANDBOXED BROWSER RUNTIME                │
│                                                        │
│  ┌───────────────────────┐    ┌─────────────────────┐  │
│  │     Client Canvas     │◄──►│ Deterministic Engine │  │
│  └───────────┬───────────┘    └─────────────────────┘  │
│              │ (Local Serialization)                   │
│              ▼                                         │
│  ┌───────────────────────┐    ┌─────────────────────┐  │
│  │   localStorage State  │    │ IndexedDB PDF Blobs │  │
│  └───────────────────────┘    └─────────────────────┘  │
└────────────────────────────────────────────────────────┘


1. **Zero External Surface Area:** The application initiates no hidden tracking telemetry, analytics suites, accounts, or cloud-database syncing loops.
2. **Strict Client-Side Containment:** All state data fields are parsed inside `localStorage`. Heavy file segments like PDF binary layers reside within a localized transactional `IndexedDB` system layer.
3. **Exploitation Countermeasures:** Structural data inputs pass through a string sanitization routine before rendering on the DOM to mitigate XSS attack profiles from malicious copy-pasted content.

---
