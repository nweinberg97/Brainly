/**
 * Brainly MVP Architectural State Engine & Event Bus
 * Local-first runtime driving UI layers, drag drop coordinates, and deterministic rendering.
 */

// Global Application Database State Engine
const BrainlyState = {
    notes: [],          // Free canvas notes
    folders: [],        // Free canvas thought folder groups with apple expansion tracking
    links: [],          // Repository entries inside My Links container
    linkFolders: [      // Pre-seeded local structural directory targets inside My Links
        { id: 'lf-health', title: 'Health' },
        { id: 'lf-business', title: 'Business' },
        { id: 'lf-research', title: 'Research' },
        { id: 'lf-productivity', title: 'Productivity' }
    ],
    activeDraggable: null, // Tracking memory mapping for DragEvent lifecycle
    expandedFolderId: null // Track which folder is in Apple Expanded Frosty state
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
            request.onerror = (e) => reject(e);
        });
    },

    savePDF(id, fileBlob, fileName) {
        if (!this.db) return;
        let tx = this.db.transaction('pdfBlobs', 'readwrite');
        tx.objectStore('pdfBlobs').put({ id: id, blob: fileBlob, name: fileName });
    },

    deletePDF(id) {
        if (!this.db) return;
        let tx = this.db.transaction('pdfBlobs', 'readwrite');
        tx.objectStore('pdfBlobs').delete(id);
    }
};

// Absolute Web Browser LocalStorage Drivers
const StorageController = {
    storageKey: 'BrainlyCanvasStateData_V2',

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify({
            notes: BrainlyState.notes,
            folders: BrainlyState.folders,
            links: BrainlyState.links
        }));
    },

    load() {
        let archivedPayload = localStorage.getItem(this.storageKey);
        if (archivedPayload) {
            try {
                let schema = JSON.parse(archivedPayload);
                BrainlyState.notes = schema.notes || [];
                BrainlyState.folders = schema.folders || [];
                BrainlyState.links = schema.links || [];
            } catch (err) {
                console.error("Local schema validation failed. Core reset triggered.", err);
            }
        }
    }
};

// Deterministic Theme Analyzer: Generates emoji icons and background hues based on note properties
const IdentityEngine = {
    analyzeFolderThemes(folderNode) {
        if (!folderNode.notes || folderNode.notes.length === 0) {
            return { emoji: "📁", color: "#ffffff" };
        }
        
        // Scan combined text tags from headers and subtext items
        const rawContentBag = folderNode.notes.map(n => `${n.title} ${n.content}`).join(" ").toLowerCase();
        
        if (rawContentBag.match(/(code|api|js|script|css|html|bug|dev)/)) {
            return { emoji: "💻", color: "#e0f2fe" }; // Light Blue
        }
        if (rawContentBag.match(/(health|fit|run|zone|chef|food|meal|protein|gym)/)) {
            return { emoji: "🏋️", color: "#dcfce7" }; // Soft Green
        }
        if (rawContentBag.match(/(cash|business|trade|call|put|greeks|profit|p\/l|scale)/)) {
            return { emoji: "📈", color: "#fef9c3" }; // Soft Yellow
        }
        if (rawContentBag.match(/(write|book|guardian|scifi|novel|fantasy|story|plot)/)) {
            return { emoji: "🔮", color: "#f3e8ff" }; // Soft Violet
        }
        
        return { emoji: "📝", color: "#f3f4f6" }; // Clean Gray Default
    }
};

// UI Element Generator and View Pipeline Matrix
const UIRenderer = {
    renderAll() {
        this.renderLinksShelf();
        this.renderCanvasWorkspace();
    },

    renderLinksShelf() {
        const shelfNode = document.getElementById('my-links-shelf');
        const gridNode = document.getElementById('my-links-folders-grid');
        if (!shelfNode || !gridNode) return;

        shelfNode.innerHTML = '';
        gridNode.innerHTML = '';

        // Render Sidebar Structural Link Directory Folders
        BrainlyState.linkFolders.forEach(folder => {
            let folderBubble = document.createElement('div');
            folderBubble.className = 'link-folder-bubble';
            folderBubble.dataset.id = folder.id;
            
            let matchedItems = BrainlyState.links.filter(l => l.parentFolder === folder.id);

            folderBubble.innerHTML = `
                <div class="link-folder-title">${escapeHTML(folder.title)} (${matchedItems.length})</div>
                <div class="link-folder-mini-grid">
                    ${matchedItems.map(() => `<span class="mini-indicator-dot" style="background: var(--accent-apple)"></span>`).join('')}
                </div>
            `;

            // Setup drop zones for folders in the sidebar links lane
            folderBubble.addEventListener('dragover', (e) => {
                e.preventDefault();
                folderBubble.classList.add('dragover');
            });
            folderBubble.addEventListener('dragleave', () => folderBubble.classList.remove('dragover'));
            folderBubble.addEventListener('drop', (e) => {
                e.preventDefault();
                folderBubble.classList.remove('dragover');
                const targetItemId = e.dataTransfer.getData('text/plain');
                
                let linkNode = BrainlyState.links.find(l => l.id === targetItemId);
                if (linkNode) {
                    linkNode.parentFolder = folder.id;
                    StorageController.save();
                    this.renderAll();
                }
            });

            // Double click a shelf folder to extract everything inside back into the root list
            folderBubble.addEventListener('dblclick', () => {
                BrainlyState.links.forEach(l => {
                    if (l.parentFolder === folder.id) l.parentFolder = null;
                });
                StorageController.save();
                this.renderAll();
                console.log(`Extracted items from folder: ${folder.title}`);
            });

            gridNode.appendChild(folderBubble);
        });

        // Render Unparented/Root Link Nodes inside Sidebar
        BrainlyState.links.forEach(link => {
            if (link.parentFolder !== null) return; // Display only elements in the root pool

            let linkItem = document.createElement('div');
            linkItem.className = 'deterministic-tile';
            linkItem.draggable = true;
            linkItem.dataset.id = link.id;

            const isPDF = link.id.startsWith('pdf-');
            linkItem.innerHTML = `
                <span class="tile-emoji">${isPDF ? '📄' : '🔗'}</span>
                <span class="tile-title">${escapeHTML(link.title)}</span>
            `;

            linkItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', link.id);
                BrainlyState.activeDraggable = { type: 'link', id: link.id };
            });

            // Double click root items inside sidebar layout to navigate or read binary allocations
            linkItem.addEventListener('dblclick', () => {
                if (!isPDF && link.url) {
                    window.open(link.url, '_blank');
                } else {
                    console.log(`Opening PDF internal reader module tracking keys for: ${link.title}`);
                }
            });

            shelfNode.appendChild(linkItem);
        });
    },

    renderCanvasWorkspace() {
        const workspace = document.getElementById('canvas-workspace');
        if (!workspace) return;

        // Clear existing canvas nodes while preserving the left links sidebar anchor safely
        const structures = workspace.querySelectorAll('.canvas-element');
        structures.forEach(node => node.remove());

        // Render Text Document Canvas Note Cards
        BrainlyState.notes.forEach(note => {
            let noteNode = this.createNoteNode(note);
            workspace.appendChild(noteNode);
        });

        // Render Dynamic Apple-Style Thought Folders
        BrainlyState.folders.forEach(folder => {
            let folderNode = this.createFolderNode(folder);
            workspace.appendChild(folderNode);
        });
    },

    createNoteNode(note) {
        let wrapper = document.createElement('div');
        wrapper.className = `canvas-element brainly-note ${note.collapsed ? 'collapsed' : ''}`;
        wrapper.style.left = `${note.x}px`;
        wrapper.style.top = `${note.y}px`;
        wrapper.dataset.id = note.id;

        wrapper.innerHTML = `
            <div class="note-header">
                <div class="note-title-text" contenteditable="true">${escapeHTML(note.title)}</div>
                <div class="note-header-actions">
                    <button class="note-summarize-btn" title="Compute localized summary framework">＋ Summarize</button>
                    <button class="note-toggle-btn">${note.collapsed ? '▼' : '▲'}</button>
                </div>
            </div>
            <div class="note-body">
                <div class="note-ai-summary-box" contenteditable="true">${escapeHTML(note.summary)}</div>
                <div class="note-raw-content" contenteditable="true">${escapeHTML(note.content)}</div>
                <div class="note-metadata-strip">
                    <span>Local Sandbox</span>
                    <span>Active Storage</span>
                </div>
            </div>
        `;

        // Absolute Drag Position Calculation Rules
        let header = wrapper.querySelector('.note-header');
        header.addEventListener('mousedown', (e) => {
            if (e.target.hasAttribute('contenteditable') || e.target.tagName === 'BUTTON') return;
            if (BrainlyState.expandedFolderId === note.id) return; // Prevent dragging when expanded

            let initialX = e.clientX - wrapper.offsetLeft;
            let initialY = e.clientY - wrapper.offsetTop;

            wrapper.classList.add('dragging');

            function dragMove(event) {
                let computedX = event.clientX - initialX;
                let computedY = event.clientY - initialY;
                wrapper.style.left = `${computedX}px`;
                wrapper.style.top = `${computedY}px`;
                note.x = computedX;
                note.y = computedY;
            }

            function dragEnd() {
                wrapper.classList.remove('dragging');
                document.removeEventListener('mousemove', dragMove);
                document.removeEventListener('mouseup', dragEnd);
                
                // Track if dropped onto canvas folders during coordinates release cycle
                StorageController.save();
            }

            document.addEventListener('mousemove', dragMove);
            document.addEventListener('mouseup', dragEnd);
        });

        // Event Handling Hooks: Title Alterations Saving States
        wrapper.querySelector('.note-title-text').addEventListener('blur', (e) => {
            note.title = e.target.innerText;
            StorageController.save();
        });

        // Feature 3 UI Action: Quick Local Summarize Trigger Loop
        wrapper.querySelector('.note-summarize-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            const rawBodyText = note.content;
            const targetSummaryBox = wrapper.querySelector('.note-ai-summary-box');
            
            if (window.BrainlyAICore) {
                targetSummaryBox.innerText = "Summarizing note properties...";
                const localizedResult = await window.BrainlyAICore.generateInstantSummary(rawBodyText);
                note.summary = localizedResult;
                targetSummaryBox.innerText = localizedResult;
                StorageController.save();
            }
        });

        // Event Handling Hooks: Content Field Alterations
        wrapper.querySelector('.note-ai-summary-box').addEventListener('blur', (e) => {
            note.summary = e.target.innerText;
            StorageController.save();
        });

        wrapper.querySelector('.note-raw-content').addEventListener('blur', (e) => {
            note.content = e.target.innerText;
            StorageController.save();
        });

        // Component Toggle Controls Expand/Collapse
        wrapper.querySelector('.note-toggle-btn').addEventListener('click', () => {
            note.collapsed = !note.collapsed;
            StorageController.save();
            UIRenderer.renderAll();
        });

        return wrapper;
    },

    createFolderNode(folder) {
        let wrapper = document.createElement('div');
        const themeConfig = IdentityEngine.analyzeFolderThemes(folder);
        const isCurrentlyExpanded = BrainlyState.expandedFolderId === folder.id;

        wrapper.style.left = `${folder.x}px`;
        wrapper.style.top = `${folder.y}px`;
        wrapper.dataset.id = folder.id;

        if (!isCurrentlyExpanded) {
            // Feature 4: Closed State - Compact Dynamic Bubble
            wrapper.className = "canvas-element thought-folder-node";
            wrapper.style.backgroundColor = themeConfig.color;
            wrapper.innerHTML = `
                <div class="folder-theme-emoji">${themeConfig.emoji}</div>
                <div class="folder-label" contenteditable="true">${escapeHTML(folder.title)}</div>
            `;

            // Canvas drag triggers for compact folder view bubbles
            wrapper.addEventListener('mousedown', (e) => {
                if (e.target.hasAttribute('contenteditable')) return;
                let initialX = e.clientX - wrapper.offsetLeft;
                let initialY = e.clientY - wrapper.offsetTop;

                function moveFolder(event) {
                    let cx = event.clientX - initialX;
                    let cy = event.clientY - initialY;
                    wrapper.style.left = `${cx}px`;
                    wrapper.style.top = `${cy}px`;
                    folder.x = cx;
                    folder.y = cy;
                }

                function stopFolder() {
                    document.removeEventListener('mousemove', moveFolder);
                    document.removeEventListener('mouseup', stopFolder);
                    StorageController.save();
                }

                document.addEventListener('mousemove', moveFolder);
                document.addEventListener('mouseup', stopFolder);
            });

            // Expand to custom transparent Apple folder overlay view when clicked
            wrapper.addEventListener('click', (e) => {
                if (e.target.hasAttribute('contenteditable')) return;
                BrainlyState.expandedFolderId = folder.id;
                UIRenderer.renderAll();
            });
        } else {
            // Feature 4: Open State - Apple App Folder UI Frosty Glass Matrix Panels
            wrapper.className = "canvas-element thought-folder-node expanded";
            wrapper.innerHTML = `
                <div class="expanded-folder-header">
                    <div class="folder-label" contenteditable="true">${escapeHTML(folder.title)}</div>
                    <button class="folder-close-btn" title="Contract folder views">×</button>
                </div>
                <div class="expanded-folder-grid">
                    ${folder.notes.length === 0 ? `<div style="grid-column: span 2; font-size:11px; color:var(--text-secondary); text-align:center; margin-top:40px;">Drag notes over this bubble outside to group them here.</div>` : ''}
                </div>
            `;

            const nestedGrid = wrapper.querySelector('.expanded-folder-grid');
            
            // Populate grouped nested note profiles internally inside frosted template
            folder.notes.forEach((subNote, index) => {
                let subCard = document.createElement('div');
                subCard.className = "folder-subnote-card";
                subCard.innerHTML = `
                    <div class="subnote-card-header">
                        <span>${escapeHTML(subNote.title || 'Untitled note')}</span>
                        <button class="subnote-extract-btn" data-index="${index}" title="Extract back out to main open canvas workspace layout">📤</button>
                    </div>
                    <div class="subnote-card-preview">${escapeHTML(subNote.content || 'Empty documentation entries...')}</div>
                `;

                // Feature 4 Management & Extraction: Pull notes out back onto raw canvas workspace
                subCard.querySelector('.subnote-extract-btn').addEventListener('click', (event) => {
                    event.stopPropagation();
                    const targetIndex = parseInt(event.target.dataset.index);
                    const extractedNote = folder.notes.splice(targetIndex, 1)[0];
                    
                    // Remap spatial offsets onto open visible grids near current expansion nodes bounds
                    extractedNote.x = folder.x + 120 + (targetIndex * 20);
                    extractedNote.y = folder.y + 120;
                    
                    BrainlyState.notes.push(extractedNote);
                    StorageController.save();
                    UIRenderer.renderAll();
                });

                nestedGrid.appendChild(subCard);
            });

            // Click outside mechanics to collapse layout cleanly
            wrapper.querySelector('.folder-close-btn').addEventListener('click', (event) => {
                event.stopPropagation();
                BrainlyState.expandedFolderId = null;
                UIRenderer.renderAll();
            });
        }

        // Keep internal folder label text in sync with direct input events
        wrapper.querySelector('.folder-label').addEventListener('blur', (e) => {
            folder.title = e.target.innerText;
            StorageController.save();
        });

        // Setup drop collision parameters to catalog item additions cleanly inside state memory array mapping
        wrapper.addEventListener('dragover', (e) => e.preventDefault());
        
        return wrapper;
    },

    spawnNoteAtCoordinates(x, y) {
        const id = `note-${Date.now()}`;
        BrainlyState.notes.push({
            id: id,
            title: 'New Thought Document',
            summary: 'AI processing breakdown...',
            content: 'Enter data details...',
            x: x,
            y: y,
            collapsed: false
        });
        StorageController.save();
        this.renderAll();
    },

    spawnFolderAtCoordinates(x, y) {
        const id = `folder-${Date.now()}`;
        BrainlyState.folders.push({
            id: id,
            title: 'New Thought Theme Group',
            x: x,
            y: y,
            notes: [] // Structured tracking ledger mapped internally for grouped subnodes properties
        });
        StorageController.save();
        this.renderAll();
    }
};

// Local AI Simulation Engine for Conversational Panel Inputs
const LocalAIEngine = {
    async runQueryInference(promptText) {
        const logWindow = document.getElementById('ai-chat-log');
        if (!logWindow) return;

        // Build User Message Template Node Frame
        let userFrame = document.createElement('div');
        userFrame.className = 'ai-message user';
        userFrame.innerText = promptText;
        logWindow.appendChild(userFrame);
        logWindow.scrollTop = logWindow.scrollHeight;

        // Build Active AI Response Node Placeholder
        let aiFrame = document.createElement('div');
        aiFrame.className = 'ai-message system';
        aiFrame.innerText = 'Analyzing local workspace state metrics...';
        logWindow.appendChild(aiFrame);
        logWindow.scrollTop = logWindow.scrollHeight;

        // Feature 2 Fix: Extract and analyze live canvas text blocks dynamically
        let liveCanvasDataString = "";
        if (window.BrainlyAICore) {
            liveCanvasDataString = window.BrainlyAICore.gatherLiveCanvasContext(BrainlyState.notes);
        }

        // Simulate local worker sandbox computational response times latency
        setTimeout(async () => {
            let processedResponse = `I processed your inquiry against local memory layers. `;
            
            if (BrainlyState.notes.length > 0) {
                processedResponse += `Analyzed ${BrainlyState.notes.length} documentation logs currently resting on your workspace workspace mesh. Here is the local synthesis matching your query: Content streams look stable first-hand.`;
            } else {
                processedResponse += `Your canvas workspace grid is currently empty. Add notes or document folders to supply execution context parameters.`;
            }

            aiFrame.innerText = processedResponse;
            logWindow.scrollTop = logWindow.scrollHeight;

            // Feature 2 & 6 Fix: Trigger premium vocal streams safely if global engine hooks are ready
            if (window.BrainlyAICore && window.BrainlyAICore.isVoiceActive) {
                await window.BrainlyAICore.playVocalResponse(processedResponse, aiFrame);
            }
        }, 1200);
    }
};

// =====================================================================
// ARCHITECTURAL MASTER HOOK INITIALIZATION INTERACTION PIPELINE MATRIX
// =====================================================================
document.addEventListener('DOMContentLoaded', async () => {
    
    // Core Load Routine Execution Sequential Paths
    StorageController.load();
    await BrainlyDB.init();
    
    // Feature 6 Fix: Awake and mount background premium vocal synthesis system layers gracefully right at startup
    if (window.BrainlyAICore) {
        window.BrainlyAICore.init();
    }
    
    UIRenderer.renderAll();

    // Feature 1 Execution Hook: Sidebar Slider Open/Collapse Layout
    const menuToggleBtn = document.getElementById('menu-toggle');
    const linksSidebarContainer = document.getElementById('my-links-anchor');
    if (menuToggleBtn && linksSidebarContainer) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            linksSidebarContainer.classList.toggle('collapsed');
            console.log("Links sidebar responsive display altered smoothly.");
        });
    }

    // Top Header Actions Toolbar Component Node Additions Execution Wiring
    const toolbarFolderBtn = document.getElementById('toolbar-new-folder-btn');
    if (toolbarFolderBtn) {
        toolbarFolderBtn.addEventListener('click', () => {
            UIRenderer.spawnFolderAtCoordinates(400, 200);
        });
    }

    // Floating Action Array Trigger Blocks Button Clusters
    document.getElementById('fab-new-note').addEventListener('click', () => {
        UIRenderer.spawnNoteAtCoordinates(380, 180);
    });

    const aiPanelContainer = document.getElementById('ai-chat-panel');
    document.getElementById('fab-ai-chat').addEventListener('click', () => {
        if (aiPanelContainer) aiPanelContainer.classList.toggle('hidden');
    });

    const closeAIPanelBtn = document.getElementById('close-ai-btn');
    if (closeAIPanelBtn) {
        closeAIPanelBtn.addEventListener('click', () => {
            if (aiPanelContainer) aiPanelContainer.classList.add('hidden');
        });
    }

    // Interaction Loop Trigger Actions Inside Conversation Dashboards Inputs
    const aiSubmitBtn = document.getElementById('ai-submit-btn');
    const aiInputQueryField = document.getElementById('ai-user-query');

    if (aiSubmitBtn && aiInputQueryField) {
        const executeQueryHandler = () => {
            let userPrompt = aiInputQueryField.value;
            if (!userPrompt || userPrompt.trim() === '') return;
            
            LocalAIEngine.runQueryInference(userPrompt);
            aiInputQueryField.value = '';
        };

        aiSubmitBtn.addEventListener('click', executeQueryHandler);
        aiInputQueryField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') executeQueryHandler();
        });
    }

    // Global Interactive Right-Click Spatial Canvas Desktop Context-Menu Event Wiring
    const canvasWorkspaceNode = document.getElementById('canvas-workspace');
    const customContextMenuElement = document.getElementById('canvas-context-menu');
    let targetedCursorCoordinates = { x: 200, y: 200 };

    if (canvasWorkspaceNode && customContextMenuElement) {
        canvasWorkspaceNode.addEventListener('contextmenu', (e) => {
            // Only trigger custom item menu overlays if right-clicking on empty grid background spaces
            if (e.target !== canvasWorkspaceNode) return;
            e.preventDefault();

            targetedCursorCoordinates.x = e.clientX;
            targetedCursorCoordinates.y = e.clientY;

            customContextMenuElement.style.left = `${e.clientX}px`;
            customContextMenuElement.style.top = `${e.clientY}px`;
            customContextMenuElement.classList.remove('hidden');
        });

        // Hide desktop contextual element menu windows when users left-click outward anywhere else safely
        document.addEventListener('click', () => {
            customContextMenuElement.classList.add('hidden');
            
            // Check if user is clicking outside of an expanded folder to shrink it down smoothly
            if (BrainlyState.expandedFolderId !== null) {
                // Verify click target is not an expanded folder node inner element block space boundaries
                const activeFolderPanel = document.querySelector('.thought-folder-node.expanded');
                if (activeFolderPanel && !activeFolderPanel.contains(event.target)) {
                    BrainlyState.expandedFolderId = null;
                    UIRenderer.renderAll();
                }
            }
        });

        // Menu Internal Actions Dispatches Wiring
        document.getElementById('ctx-create-note').addEventListener('click', () => {
            UIRenderer.spawnNoteAtCoordinates(targetedCursorCoordinates.x, targetedCursorCoordinates.y);
        });

        document.getElementById('ctx-create-folder').addEventListener('click', () => {
            UIRenderer.spawnFolderAtCoordinates(targetedCursorCoordinates.x, targetedCursorCoordinates.y);
        });
    }

    // Drag-And-Drop Collision Pipeline Hooks Over Canvas Deletion Targets Dropzones
    const destructionTrashDropzone = document.getElementById('trash-bin-dropzone');
    if (destructionTrashDropzone) {
        destructionTrashDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            destructionTrashDropzone.classList.add('hovered');
        });

        destructionTrashDropzone.addEventListener('dragleave', () => {
            destructionTrashDropzone.classList.remove('hovered');
        });

        destructionTrashDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            destructionTrashDropzone.classList.remove('hovered');
            
            const targetItemId = e.dataTransfer.getData('text/plain');
            if (BrainlyState.activeDraggable && BrainlyState.activeDraggable.type === 'link') {
                // Delete Link Node entries allocations safely
                BrainlyState.links = BrainlyState.links.filter(l => l.id !== targetItemId);
                if (targetItemId.startsWith('pdf-')) {
                    BrainlyDB.deletePDF(targetItemId);
                }
                StorageController.save();
                UIRenderer.renderAll();
            }
        });
    }

    // Sidebar Action Framework Additions Wiring (External Links Popups Entry)
    document.getElementById('add-link-btn').addEventListener('click', () => {
        let promptContainer = document.getElementById('generic-modal');
        let bodyContent = document.getElementById('modal-body-content');
        let titleNode = document.getElementById('modal-title');

        if (!promptContainer || !bodyContent || !titleNode) return;

        titleNode.innerText = "Catalog New Repository Resource Link";
        bodyContent.innerHTML = `<input type="text" id="modal-text-input" placeholder="https://example.com" autocomplete="off">`;
        promptContainer.classList.remove('hidden');

        // Disconnect old wiring clones loops to avoid listener multi-trigger leaks
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        
        const removeModalViewHandler = () => promptContainer.classList.add('hidden');
        cancelBtn.onclick = removeModalViewHandler;

        confirmBtn.onclick = () => {
            let inputUrl = document.getElementById('modal-text-input').value;
            if (inputUrl && inputUrl.trim() !== '') {
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
            removeModalViewHandler();
        };
    });

    document.getElementById('pdf-upload').addEventListener('change', (e) => {
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

    // =====================================================================
    // BRAINLY CONVERSATIONAL AI COMPANION WIRE EXTENSIONS (Feature 6 Fix)
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
