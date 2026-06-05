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
---

## 💾 Data Infrastructure Schemas

Because Brainly is completely local-first, it converts your visual workspace into a clean, unified text state. When `StorageController.save()` triggers, this state is serialized and committed directly to the browser's persistent storage hardware under the key `brainly_state_package`.

### `localStorage` State Envelope Snapshot

```json
{
  "notes": [
    {
      "id": "note-1715498210344",
      "title": "Core System Idea",
      "summary": "AI summary of the note.",
      "content": "Raw editable data string contents...",
      "x": 420,
      "y": 120,
      "collapsed": false,
      "views": 4,
      "timestamp": 1715498210344
    }
  ],
  "folders": [],
  "links": [
    {
      "id": "link-1715498299102",
      "title": "GitHub Integration Hub",
      "url": "[https://github.com](https://github.com)",
      "parentFolder": "lf-productivity"
    }
  ]
}
