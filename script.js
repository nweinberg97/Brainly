/**
 * Brainly MVP Architectural State Engine & Event Bus
 * Local-first runtime driving UI layers, drag drop coordinates, and deterministic rendering.
 */

// Global Application Database State Engine
const BrainlyState = {
    notes: [],          // Free canvas notes
    folders: [],        // Free canvas thought folder groups
    links: [],          // Repository entries inside My Links container
    linkFolders: [      // Pre-seeded local structural directory targets inside My Links
        { id: 'lf-health', title: 'Health' },
        { id: 'lf-business', title: 'Business' },
        { id: 'lf-research', title: 'Research' },
        { id: 'lf-productivity', title: 'Productivity' }
    ],
    activeDraggable: null // Tracking memory mapping for DragEvent lifecycle
};

// IndexedDB Access layer optimized for Local file data storage (PDF blobs)
const BrainlyDB = {
    dbName: 'BrainlyLocalDB',
    version: 1,
    db: null,

    init() {
        return new Promise((resolve, reject) => {
            let request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (e) => {
                let db = e.target.result;
                if (!db.objectStoreNames.contains('pdfBlobs')) {
                    db.createObjectStore('pdfBlobs', { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    },

    savePDF(id, blob, name) {
        if (!this.db) return;
        let tx = this.db.transaction('pdfBlobs', 'readwrite');
        tx.objectStore('pdfBlobs').put({ id, data: blob, filename: name });
    },

    getPDF(id) {
        return new Promise((resolve) => {
            if (!this.db) return resolve(null);
            let tx = this.db.transaction('pdfBlobs', 'readonly');
            let req = tx.objectStore('pdfBlobs').get(id);
            req.onsuccess = () => resolve(req.result ? req.result.data : null);
            req.onerror = () => resolve(null);
        });
    },

    deletePDF(id) {
        if (!this.db) return;
        let tx = this.db.transaction('pdfBlobs', 'readwrite');
        tx.objectStore('pdfBlobs').delete(id);
    }
};

// Deterministic Identity Engine Core Math logic
const IdentityEngine = {
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    },

    generateHSL(str) {
        const hash = this.hashString(str);
        const hue = Math.abs(hash) % 360;
        // Output soft, high-fidelity muted pastel variants
        return `hsl(${hue}, 65%, 88%)`;
    },

    matchEmoji(title, url = '') {
        const normalized = `${title} ${url}`.toLowerCase();
        const lexicon = [
            { keywords: ['finance', 'money', 'investing', 'wallet', 'crypto'], emoji: '💰' },
            { keywords: ['health', 'fitness', 'gym', 'workout', 'medical', 'diet'], emoji: '🧠' },
            { keywords: ['research', 'paper', 'study', 'science', 'arxiv'], emoji: '📄' },
            { keywords: ['productivity', 'workflow', 'gtd', 'optimize'], emoji: '⚡' },
            { keywords: ['coding', 'github', 'developer', 'software', 'programming'], emoji: '💻' },
            { keywords: ['book', 'reading', 'novel', 'literature'], emoji: '📚' },
            { keywords: ['startup', 'business', 'idea', 'venture', 'corp'], emoji: '🚀' },
            { keywords: ['design', 'figma', 'ui', 'ux', 'art'], emoji: '🎨' }
        ];

        for (const item of lexicon) {
            if (item.keywords.some(keyword => normalized.includes(keyword))) {
                return item.emoji;
            }
        }
        return '📌'; // Default deterministic anchor
    }
};

// Synchronization Controller to synchronize states to local engine
const StorageController = {
    load() {
        const localData = localStorage.getItem('brainly_state_package');
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                BrainlyState.notes = parsed.notes || [];
                BrainlyState.folders = parsed.folders || [];
                BrainlyState.links = parsed.links || [];
                if (parsed.linkFolders) BrainlyState.linkFolders = parsed.linkFolders;
            } catch (e) {
                console.error("Local integrity fault. Standard state restored.", e);
            }
        } else {
            this.seedMockData();
        }
    },

    save() {
        localStorage.setItem('brainly_state_package', JSON.stringify({
            notes: BrainlyState.notes,
            folders: BrainlyState.folders,
            links: BrainlyState.links,
            linkFolders: BrainlyState.linkFolders
        }));
    },

    seedMockData() {
        BrainlyState.notes = [
            { id: 'note-1', title: 'Product Vision', summary: 'Clean aesthetics combined with offline safety frameworks.', content: 'Build a layout without deep navigation. Fast, local, private.', x: 420, y: 120, collapsed: false, views: 4, timestamp: Date.now() }
        ];
        BrainlyState.links = [
            { id: 'link-1', title: 'GitHub Repo Integration', url: 'https://github.com', parentFolder: null },
            { id: 'link-2', title: 'Arxiv Medical Neuro-nets', url: 'https://arxiv.org', parentFolder: 'lf-research' }
        ];
        this.save();
    }
};

// UI Rendering Pipeline Engine
const UIRenderer = {
    canvas: null,
    linksShelf: null,
    linksFolderGrid: null,

    init() {
        this.canvas = document.getElementById('canvas-workspace');
        this.linksShelf = document.getElementById('my-links-shelf');
        // Structural target connection matched directly to your new grid class
        this.linksFolderGrid = document.querySelector('.my-links-folders');
        this.registerCanvasDragOver();
    },

    renderAll() {
        // Clear previous volatile UI configurations
        document.querySelectorAll('#canvas-workspace > .canvas-element').forEach(el => el.remove());
        if (this.linksShelf) this.linksShelf.innerHTML = '';
        if (this.linksFolderGrid) this.linksFolderGrid.innerHTML = '';

        // Render My Links Directory infrastructure
        BrainlyState.linkFolders.forEach(folder => {
            const el = this.createLinkFolderBubble(folder);
            if (this.linksFolderGrid) this.linksFolderGrid.appendChild(el);
        });

        // Sort items inside My Links container shelf
        BrainlyState.links.forEach(link => {
            if (!link.parentFolder) {
                const tile = this.createDeterministicTile(link);
                if (this.linksShelf) this.linksShelf.appendChild(tile);
            }
        });

        // Distribute items onto Canvas Spatial layout grid
        BrainlyState.notes.forEach(note => {
            const noteEl = this.createNoteNode(note);
            this.canvas.appendChild(noteEl);
        });

        BrainlyState.folders.forEach(folder => {
            const folderEl = this.createThoughtFolderNode(folder);
            this.canvas.appendChild(folderEl);
        });
    },

    createDeterministicTile(item) {
        const tile = document.createElement('div');
        tile.className = 'deterministic-tile';
        tile.draggable = true;
        tile.dataset.id = item.id;
        tile.dataset.type = 'link-card';

        const titleText = item.url ? item.title : `PDF: ${item.title}`;
        const seedValue = item.url || item.title;
        
        tile.style.backgroundColor = IdentityEngine.generateHSL(seedValue);
        
        const emoji = IdentityEngine.matchEmoji(item.title, item.url || '');
        
        tile.innerHTML = `
            <div class="tile-emoji">${emoji}</div>
            <div class="tile-title">${escapeHTML(titleText)}</div>
        `;

        tile.addEventListener('dragstart', (e) => {
            BrainlyState.activeDraggable = { id: item.id, type: 'link-card', source: 'shelf' };
            e.dataTransfer.setData('text/plain', item.id);
        });

        // Double click to open links or local binary PDF data objects
        tile.addEventListener('dblclick', () => {
            if (item.url) {
                window.open(item.url, '_blank', 'noopener,noreferrer');
            } else {
                BrainlyDB.getPDF(item.id).then(blob => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                    }
                });
            }
        });

        return tile;
    },

    createLinkFolderBubble(folder) {
        const div = document.createElement('div');
        div.className = 'link-folder-bubble';
        div.dataset.id = folder.id;

        // Collect child subcomponents
        const children = BrainlyState.links.filter(l => l.parentFolder === folder.id);
        
        let subDotsHTML = '';
        children.slice(0, 6).forEach(child => {
            const color = IdentityEngine.generateHSL(child.url || child.title);
            subDotsHTML += `<div class="mini-indicator-dot" style="background-color: ${color}"></div>`;
        });

        div.innerHTML = `
            <div class="link-folder-title">${escapeHTML(folder.title)}</div>
            <div class="link-folder-mini-grid">${subDotsHTML}</div>
        `;

        // Handle dropping links into shelf folders
        div.addEventListener('dragover', (e) => e.preventDefault());
        div.addEventListener('dragenter', () => div.classList.add('dragover'));
        div.addEventListener('dragleave', () => div.classList.remove('dragover'));
        div.addEventListener('drop', (e) => {
            e.preventDefault();
            div.classList.remove('dragover');
            const targetData = BrainlyState.activeDraggable;
            if (targetData && targetData.type === 'link-card') {
                const targetLink = BrainlyState.links.find(l => l.id === targetData.id);
                if (targetLink) {
                    targetLink.parentFolder = folder.id;
                    StorageController.save();
                    this.renderAll();
                    // Live check if immersive workspace directory is open, re-sync view
                    iOSFolderOverlaySystem.syncActiveFolderView(folder.id);
                }
            }
        });

        div.addEventListener('dblclick', () => {
            iOSFolderOverlaySystem.show(folder);
        });

        return div;
    },

    createNoteNode(note) {
        const container = document.createElement('div');
        container.className = `canvas-element brainly-note ${note.collapsed ? 'collapsed' : ''}`;
        container.style.left = `${note.x}px`;
        container.style.top = `${note.y}px`;
        container.dataset.id = note.id;
        container.dataset.type = 'note';
        container.draggable = true;

        container.innerHTML = `
            <div class="note-header">
                <span class="note-title-text" contenteditable="true" spellcheck="false">${escapeHTML(note.title)}</span>
                <button class="note-toggle-btn">${note.collapsed ? 'Expand' : 'Collapse'}</button>
            </div>
            <div class="note-body">
                <div class="note-ai-summary-box" contenteditable="true" spellcheck="false" title="Double click to edit AI context">${escapeHTML(note.summary || 'AI Processing pending...')}</div>
                <div class="note-raw-content" contenteditable="true" spellcheck="false">${escapeHTML(note.content)}</div>
                <div class="note-metadata-strip">
                    <span>👁️ ${note.views} views</span>
                    <span>${new Date(note.timestamp).toLocaleDateString()}</span>
                </div>
            </div>
        `;

        // Interactive Inline Input Synchronization Hooks
        const titleEl = container.querySelector('.note-title-text');
        const summaryEl = container.querySelector('.note-ai-summary-box');
        const contentEl = container.querySelector('.note-raw-content');

        const updateState = () => {
            note.title = titleEl.innerText;
            note.summary = summaryEl.innerText;
            note.content = contentEl.innerText;
            StorageController.save();
        };

        titleEl.addEventListener('blur', updateState);
        summaryEl.addEventListener('blur', updateState);
        contentEl.addEventListener('blur', updateState);

        contentEl.addEventListener('focus', () => {
            note.views++;
            container.querySelector('.note-metadata-strip span').innerText = `👁️ ${note.views} views`;
            StorageController.save();
        });

        container.querySelector('.note-toggle-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            note.collapsed = !note.collapsed;
            StorageController.save();
            this.renderAll();
        });

        this.attachSpatialDragDrivers(container, note);
        return container;
    },

    createThoughtFolderNode(folder) {
        const container = document.createElement('div');
        container.className = 'canvas-element thought-folder-node';
        container.style.left = `${folder.x}px`;
        container.style.top = `${folder.y}px`;
        container.dataset.id = folder.id;
        container.dataset.type = 'thought-folder';
        container.draggable = true;

        container.innerHTML = `
            <div class="folder-bubble-matrix">
                <div class="folder-mini-dot"></div>
                <div class="folder-mini-dot"></div>
                <div class="folder-mini-dot"></div>
                <div class="folder-mini-dot"></div>
            </div>
            <div class="folder-label" contenteditable="true" spellcheck="false">${escapeHTML(folder.title)}</div>
        `;

        const label = container.querySelector('.folder-label');
        label.addEventListener('blur', () => {
            folder.title = label.innerText;
            StorageController.save();
        });

        // Enable internal ingestion drop targets for cluster thought maps
        container.addEventListener('dragover', (e) => e.preventDefault());
        container.addEventListener('dragenter', () => container.classList.add('dragover'));
        container.addEventListener('dragleave', () => container.classList.remove('dragover'));
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('dragover');
            const targetData = BrainlyState.activeDraggable;
            if (targetData && targetData.type === 'note') {
                // If dropping notes into spatial thought clusters
                BrainlyState.notes = BrainlyState.notes.filter(n => n.id !== targetData.id);
                StorageController.save();
                UIRenderer.renderAll();
            }
        });

        this.attachSpatialDragDrivers(container, folder);
        return container;
    },

    attachSpatialDragDrivers(element, stateRef) {
        element.addEventListener('dragstart', (e) => {
            BrainlyState.activeDraggable = { id: stateRef.id, type: element.dataset.type };
            element.classList.add('dragging');
            e.dataTransfer.setData('text/plain', JSON.stringify({
                offsetX: e.offsetX,
                offsetY: e.offsetY
            }));
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
        });
    },

    registerCanvasDragOver() {
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const active = BrainlyState.activeDraggable;
            if (!active) return;

            // Prevent absolute shifting when dropping structures inside folder overlays
            if (e.target.closest('.ios-folder-grid-canvas')) return;

            if (e.target.id === 'canvas-workspace' && (active.type === 'note' || active.type === 'thought-folder')) {
                let offset = { offsetX: 40, offsetY: 40 };
                try {
                    const rawData = e.dataTransfer.getData('text/plain');
                    if(rawData && rawData.includes("offsetX")) offset = JSON.parse(rawData);
                } catch(err){}

                const x = e.clientX - this.canvas.offsetLeft - offset.offsetX;
                const y = e.clientY - this.canvas.offsetTop - offset.offsetY;

                if (active.type === 'note') {
                    const target = BrainlyState.notes.find(n => n.id === active.id);
                    if (target) { target.x = x; target.y = y; }
                } else {
                    const target = BrainlyState.folders.find(f => f.id === active.id);
                    if (target) { target.x = x; target.y = y; }
                }
                StorageController.save();
                this.renderAll();
            }
        });
    }
};

// =====================================================================
// NEW IMMERSIVE iOS FOLDER OVERLAY CONTROLLER ROUTING ENGINE
// =====================================================================
const iOSFolderOverlaySystem = {
    overlay: null,
    titleField: null,
    gridCanvas: null,
    closeBtn: null,
    currentFolderRef: null,

    init() {
        this.overlay = document.getElementById('ios-folder-overlay');
        this.titleField = document.getElementById('ios-folder-title');
        this.gridCanvas = document.getElementById('ios-folder-grid-canvas');
        this.closeBtn = document.getElementById('ios-folder-close');

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }

        if (this.titleField) {
            this.titleField.addEventListener('blur', () => {
                if (this.currentFolderRef) {
                    this.currentFolderRef.title = this.titleField.innerText;
                    StorageController.save();
                    UIRenderer.renderAll();
                }
            });
        }

        // Drop handling to receive content elements inside the immersive workspace grid container
        if (this.gridCanvas) {
            this.gridCanvas.addEventListener('dragover', (e) => e.preventDefault());
            this.gridCanvas.addEventListener('drop', (e) => {
                e.preventDefault();
                const active = BrainlyState.activeDraggable;
                if (active && active.type === 'link-card' && this.currentFolderRef) {
                    const targetLink = BrainlyState.links.find(l => l.id === active.id);
                    if (targetLink) {
                        targetLink.parentFolder = this.currentFolderRef.id;
                        StorageController.save();
                        UIRenderer.renderAll();
                        this.syncActiveFolderView(this.currentFolderRef.id);
                    }
                }
            });
        }
    },

    show(folder) {
        this.currentFolderRef = folder;
        if (!this.overlay) return;

        this.titleField.innerText = folder.title;
        this.overlay.classList.remove('hidden');
        this.syncActiveFolderView(folder.id);
    },

    syncActiveFolderView(folderId) {
        if (!this.gridCanvas || !this.currentFolderRef || this.currentFolderRef.id !== folderId) return;
        this.gridCanvas.innerHTML = '';

        const children = BrainlyState.links.filter(l => l.parentFolder === folderId);

        if (children.length === 0) {
            this.gridCanvas.innerHTML = `<p style="font-size: 13px; color: rgba(255,255,255,0.6); grid-column: 1/-1; text-align: center; margin-top: 40px;">Folder Empty. Drag shelf tiles directly inside this view container.</p>`;
            return;
        }

        children.forEach(child => {
            const tile = UIRenderer.createDeterministicTile(child);
            
            // Inject customized context configurations to extract records out of directories
            const removeHandle = document.createElement('span');
            removeHandle.innerHTML = '&times;';
            removeHandle.style.cssText = 'position: absolute; top: 4px; right: 8px; color: #ff3b30; font-size: 16px; font-weight: bold; cursor: pointer; z-index: 10;';
            
            removeHandle.addEventListener('click', (e) => {
                e.stopPropagation();
                child.parentFolder = null;
                StorageController.save();
                UIRenderer.renderAll();
                this.syncActiveFolderView(folderId);
            });

            tile.style.position = 'relative';
            tile.appendChild(removeHandle);
            this.gridCanvas.appendChild(tile);
        });
    },

    hide() {
        if (this.overlay) this.overlay.classList.add('hidden');
        this.currentFolderRef = null;
    }
};

// Central Search Interface Engine Execution Pipeline
const EngineSearch = {
    init() {
        const input = document.getElementById('global-search');
        if (input) {
            input.addEventListener('input', (e) => this.execute(e.target.value));
        }
    },

    execute(term) {
        const cleanTerm = term.toLowerCase().trim();
        if (!cleanTerm) {
            UIRenderer.renderAll();
            return;
        }

        // Apply strict selective filtering criteria across active user UI structures
        document.querySelectorAll('.brainly-note').forEach(el => {
            const note = BrainlyState.notes.find(n => n.id === el.dataset.id);
            if (note) {
                const match = note.title.toLowerCase().includes(cleanTerm) || 
                              note.content.toLowerCase().includes(cleanTerm) || 
                              note.summary.toLowerCase().includes(cleanTerm);
                el.classList.toggle('hidden', !match);
            }
        });

        document.querySelectorAll('.deterministic-tile').forEach(el => {
            const link = BrainlyState.links.find(l => l.id === el.dataset.id);
            if (link) {
                const match = link.title.toLowerCase().includes(cleanTerm) || 
                              (link.url && link.url.toLowerCase().includes(cleanTerm));
                el.classList.toggle('hidden', !match);
            }
        });
    }
};

// Standard Text Input Fallback Modal Infrastructure System 
const ModalSystem = {
    overlay: null,
    title: null,
    body: null,
    confirmBtn: null,
    cancelBtn: null,
    onConfirmCallback: null,

    init() {
        this.overlay = document.getElementById('generic-modal');
        this.title = document.getElementById('modal-title');
        this.body = document.getElementById('modal-body-content');
        this.confirmBtn = document.getElementById('modal-confirm-btn');
        this.cancelBtn = document.getElementById('modal-cancel-btn');

        if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => this.hide());
        if (this.confirmBtn) {
            this.confirmBtn.addEventListener('click', () => {
                if (this.onConfirmCallback) this.onConfirmCallback();
                this.hide();
            });
        }
    },

    showPrompt(titleText, inputPlaceholder, confirmCallback) {
        if (!this.overlay) return;
        this.title.innerText = titleText;
        this.body.innerHTML = `<input type="text" id="modal-text-input" placeholder="${inputPlaceholder}" autocomplete="off">`;
        this.overlay.classList.remove('hidden');
        const input = document.getElementById('modal-text-input');
        if (input) {
            input.focus();
        }
        this.onConfirmCallback = () => {
            if (input) confirmCallback(input.value);
        };
    },

    hide() {
        if (this.overlay) this.overlay.classList.add('hidden');
    }
};

// Drag and Drop Trash Target Infrastructure Engine
const TrashSystem = {
    init() {
        const zone = document.getElementById('trash-bin-dropzone');
        if (!zone) return;

        zone.addEventListener('dragover', (e) => e.preventDefault());
        zone.addEventListener('dragenter', () => zone.classList.add('hovered'));
        zone.addEventListener('dragleave', () => zone.classList.remove('hovered'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('hovered');
            const active = BrainlyState.activeDraggable;
            if (!active) return;

            if (confirm("Are you sure you want to permanently delete this item? Data erasure is local and absolute.")) {
                if (active.type === 'note') {
                    BrainlyState.notes = BrainlyState.notes.filter(n => n.id !== active.id);
                } else if (active.type === 'thought-folder') {
                    BrainlyState.folders = BrainlyState.folders.filter(f => f.id !== active.id);
                } else if (active.type === 'link-card') {
                    BrainlyState.links = BrainlyState.links.filter(l => l.id !== active.id);
                    BrainlyDB.deletePDF(active.id);
                }
                StorageController.save();
                UIRenderer.renderAll();
                
                // Keep the structural view in sync if an layout element was tossed from a directory layout canvas
                if (iOSFolderOverlaySystem.currentFolderRef) {
                    iOSFolderOverlaySystem.syncActiveFolderView(iOSFolderOverlaySystem.currentFolderRef.id);
                }
            }
        });
    }
};

// Browser-Native Hardware Transcription Driver Layer
const VoiceTranscriptionController = {
    recognition: null,
    isRecording: false,
    masterTranscript: '',

    init() {
        const SpeechEngine = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechEngine) {
            this.recognition = new SpeechEngine();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (e) => {
                let interimTranscript = '';
                for (let i = e.resultIndex; i < e.results.length; ++i) {
                    const transcriptChunk = e.results[i][0].transcript;
                    if (e.results[i].isFinal) {
                        this.masterTranscript += transcriptChunk + ' ';
                    } else {
                        interimTranscript += transcriptChunk;
                    }
                }

                const displayLabel = document.getElementById('voice-label');
                if (displayLabel) {
                    displayLabel.innerText = interimTranscript ? `...${interimTranscript.substring(0, 15)}` : 'Listening...';
                }
            };

            this.recognition.onerror = (event) => {
                console.error("Speech Recognition Engine Fault:", event.error);
                this.killRecordingUI();
            };

            this.recognition.onend = () => {
                if (this.isRecording) {
                    this.recognition.start();
                } else {
                    this.completeVoiceTransaction();
                }
            };
        }
    },

    toggle() {
        if (!this.recognition) {
            alert("SpeechRecognition API is not natively operational on your standard browser client architecture. Running text fallback instead.");
            const fallback = prompt("Speak into your virtual transcription deck:");
            if (fallback) this.spawnVoiceNoteNode(fallback);
            return;
        }

        const btn = document.getElementById('fab-voice-note');
        if (!this.isRecording) {
            this.isRecording = true;
            this.masterTranscript = '';
            if (btn) btn.classList.add('recording');
            const label = document.getElementById('voice-label');
            if (label) label.innerText = 'Listening...';
            this.recognition.start();
        } else {
            this.isRecording = false;
            this.recognition.stop();
        }
    },

    killRecordingUI() {
        this.isRecording = false;
        const btn = document.getElementById('fab-voice-note');
        if (btn) btn.classList.remove('recording');
        const label = document.getElementById('voice-label');
        if (label) label.innerText = 'Voice';
    },

    completeVoiceTransaction() {
        this.killRecordingUI();
        const cleanOutput = this.masterTranscript.trim();
        if (cleanOutput.length > 0) {
            this.spawnVoiceNoteNode(cleanOutput);
        }
        this.masterTranscript = '';
    },

    spawnVoiceNoteNode(transcribedText) {
        const newNote = {
            id: `note-voice-${Date.now()}`,
            title: '🎙️ Transcribed Thought',
            summary: 'Locally captured transcription data.',
            content: transcribedText,
            x: 450,
            y: 250,
            collapsed: false,
            views: 1,
            timestamp: Date.now()
        };
        BrainlyState.notes.push(newNote);
        StorageController.save();
        UIRenderer.renderAll();
    }
};

// Sandbox Local Thought Engine Processing Layer
const LocalAIEngine = {
    init() {
        const panel = document.getElementById('ai-chat-panel');
        const toggle = document.getElementById('fab-ai-chat');
        const close = document.getElementById('close-ai-btn');
        const submit = document.getElementById('ai-submit-btn');
        const queryInput = document.getElementById('ai-user-query');

        if (toggle && panel) toggle.addEventListener('click', () => panel.classList.toggle('hidden'));
        if (close && panel) close.addEventListener('click', () => panel.classList.add('hidden'));

        const fireQuery = () => {
            if (!queryInput) return;
            const query = queryInput.value.trim();
            if(!query) return;
            
            const userMsgNode = this.appendMessage('user', query);
            queryInput.value = '';

            setTimeout(async () => {
                const response = this.computeLocalInference(query);
                const systemMsgNode = this.appendMessage('system', response);
                
                if (window.BrainlyAICore) {
                    await window.BrainlyAICore.playVocalResponse(response, systemMsgNode);
                }
            }, 600);
        };

        if (submit) submit.addEventListener('click', fireQuery);
        if (queryInput) queryInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') fireQuery(); });
    },

    appendMessage(role, text) {
        const log = document.getElementById('ai-chat-log');
        if (!log) return null;
        const msg = document.createElement('div');
        msg.className = `ai-message ${role}`;
        msg.innerText = text;
        log.appendChild(msg);
        log.scrollTop = log.scrollHeight;
        return msg;
    },

    computeLocalInference(query) {
        const q = query.toLowerCase();
        
        if (q.includes('summarize') || q.includes('ideas') || q.includes('notes')) {
            if(BrainlyState.notes.length === 0) return "You currently have no active notes cached on this canvas ecosystem.";
            let responseStr = "Summary analysis across your canvas data metrics: \n";
            BrainlyState.notes.forEach((n, i) => {
                responseStr += `[${i+1}] ${n.title}: "${n.summary || n.content.substring(0,30)}..."\n`;
            });
            return responseStr;
        }

        if (q.includes('pdf') || q.includes('document') || q.includes('habit') || q.includes('productivity')) {
            const targetLinks = BrainlyState.links.filter(l => l.title.toLowerCase().includes('pdf') || l.title.toLowerCase().includes('habit') || l.title.toLowerCase().includes('product'));
            if(targetLinks.length > 0) {
                return `Discovered matching targets inside local indexes: ${targetLinks.map(l=>l.title).join(', ')}.`;
            }
            return "No matching document handles could be located within your offline browser database structure.";
        }

        return "Query evaluated. For deep local indexing execution, toggle WebLLM hardware acceleration packages inside the master configuration dashboard options.";
    }
};

// Global DOM Interactive Orchestrator Activation Hooks
window.addEventListener('DOMContentLoaded', async () => {
    StorageController.load();
    await BrainlyDB.init();
    UIRenderer.init();
    iOSFolderOverlaySystem.init(); // Activate updated iOS layout overlay controller loops
    EngineSearch.init();
    ModalSystem.init();
    TrashSystem.init();
    VoiceTranscriptionController.init();
    LocalAIEngine.init();

    UIRenderer.renderAll();

    // Event Registration for FAB triggers
    const newNoteBtn = document.getElementById('fab-new-note');
    if (newNoteBtn) {
        newNoteBtn.addEventListener('click', () => {
            const id = `note-${Date.now()}`;
            BrainlyState.notes.push({
                id, title: 'Untitled Document', summary: 'Draft ideation process.', content: 'Enter data details...', x: 500, y: 180, collapsed: false, views: 0, timestamp: Date.now()
            });
            StorageController.save();
            UIRenderer.renderAll();
        });
    }

    const voiceNoteBtn = document.getElementById('fab-voice-note');
    if (voiceNoteBtn) {
        voiceNoteBtn.addEventListener('click', () => {
            VoiceTranscriptionController.toggle();
        });
    }

    const addLinkBtn = document.getElementById('add-link-btn');
    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', () => {
            ModalSystem.showPrompt("Add External Resource URL Link", "https://example.com/target", (inputUrl) => {
                if (inputUrl && inputUrl.trim().length > 0) {
                    let parsedTitle = inputUrl.replace('https://', '').replace('http://', '').split('/')[0];
                    BrainlyState.links.push({
                        id: `link-${Date.now()}`,
                        title: parsedTitle,
                        url: inputUrl,
                        parentFolder: null
                    });
                    StorageController.save();
                    UIRenderer.renderAll();
                }
            });
        });
    }

    const pdfUploadInput = document.getElementById('pdf-upload');
    if (pdfUploadInput) {
        pdfUploadInput.addEventListener('change', (e) => {
            const targetFile = e.target.files[0];
            if (targetFile && targetFile.type === "application/pdf") {
                const generatedId = `pdf-${Date.now()}`;
                
                BrainlyDB.savePDF(generatedId, targetFile, targetFile.name);
                
                BrainlyState.links.push({
                    id: generatedId,
                    title: targetFile.name,
                    url: null,
                    parentFolder: null
                });
                
                StorageController.save();
                UIRenderer.renderAll();
            }
        });
    }

    // =====================================================================
    // BRAINLY CONVERSATIONAL AI COMPANION WIRE EXTENSIONS
    // =====================================================================
    const aiVoiceBtn = document.getElementById('ai-voice-toggle-btn');
    const aiClearBtn = document.getElementById('ai-clear-history-btn');
    const aiChatWindowLog = document.getElementById('ai-chat-log');

    if (aiVoiceBtn) {
        aiVoiceBtn.addEventListener('click', () => {
            const structuralActiveState = aiVoiceBtn.getAttribute('data-enabled') === 'true';
            const targetNextState = !structuralActiveState;
            
            if (window.BrainlyAICore) {
                window.BrainlyAICore.isVoiceActive = targetNextState;
            }
            
            aiVoiceBtn.setAttribute('data-enabled', targetNextState);
            
            const labelNode = document.getElementById('ai-voice-btn-label');
            if (labelNode) {
                labelNode.innerText = targetNextState ? "Voice: ON" : "Voice: OFF";
            }
        });
    }

    if (aiClearBtn) {
        aiClearBtn.addEventListener('click', () => {
            if (aiChatWindowLog) {
                aiChatWindowLog.innerHTML = `
                    <div class="ai-message system">
                        Current session log wiped cleanly. Local context engine stabilized.
                    </div>`;
                console.log("Session memory view canvas wiped clean.");
            }
        });
    }
});

// Sanitization utility layer preventing structural exploitation inside nodes
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
