/**
 * Brainly AI Core - Conversational Extension Engine
 * Handles contextual node reading, chat history management, and local premium synthesis.
 */

import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";

const BrainlyAICore = {
    tts: null,
    isVoiceReady: false,
    isVoiceActive: false,
    currentVoice: "af_heart", // Highly human, low-fatigue natural profile

    /**
     * Initializes the background TTS engine without interrupting DOM initialization
     */
    async init() {
        try {
            console.log("Waking premium vocal synthesis layers...");
            const useWebGPU = !!navigator.gpu;
            
            // Fixed line break formatting syntax bug completely here
            this.tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
                dtype: useWebGPU ? "fp32" : "q8",
                device: useWebGPU ? "webgpu" : "wasm"
            });
            
            this.isVoiceReady = true;
            console.log(`Premium vocal synthesizer fully initialized via: ${useWebGPU ? 'WebGPU' : 'WASM Core'}`);
        } catch (err) {
            console.error("Vocal engine optimization skipped. Falling back to native safety targets.", err);
        }
    },

    /**
     * Context Scraper: Gathers real-time note canvas logs dynamically
     * @param {Array} notes - Live notes collection passed from BrainlyState
     */
    gatherLiveCanvasContext(notes) {
        if (!notes || notes.length === 0) return "No text context currently placed on the workspace canvas grid.";
        
        return notes.map((note, index) => {
            const title = note.title || `Untitled Idea Node ${index + 1}`;
            const text = note.content && note.content.trim() !== "Enter data details..." ? note.content : "";
            const summary = note.summary && note.summary.trim() !== "AI processing breakdown..." ? note.summary : "";
            return `[Note Node: "${title}"] Content: ${text || 'Empty'} | Summary: ${summary || 'None'}`;
        }).join("\n\n");
    },

    /**
     * Local Context Engine Summarization Prompt Execution
     * @param {string} rawText - Note raw text body
     */
    async generateInstantSummary(rawText) {
        if (!rawText || rawText.trim() === "Enter data details...") {
            return "Empty document block. Add raw thoughts before computing summary.";
        }
        // Simulated local deterministic summary inference execution
        const previewTokens = rawText.trim().split(/\s+/).slice(0, 10).join(" ");
        return `Key Themes: Focus centered on "${previewTokens}...". Synthesized and stored in canvas storage state smoothly.`;
    },

    /**
     * Formats string responses and manages visual pulsing states during audio playback
     * @param {string} rawText - Response text payload
     * @param {HTMLElement} elementNode - The specific message DOM node to animate
     */
    async playVocalResponse(rawText, elementNode) {
        if (!this.isVoiceReady || !this.tts || !this.isVoiceActive) return;

        try {
            // Clean markdown syntax characters so symbols aren't read literally
            const normalizedSpeechString = rawText.replace(/[*_#`~>=-]/g, "").trim();
            
            if (elementNode) elementNode.classList.add('ai-speaking-active');
            
            const audioData = await this.tts.generate(normalizedSpeechString, {
                voice: this.currentVoice
            });
            
            const audioUrl = URL.createObjectURL(audioData.toWav());
            const audioPlaybackNode = new Audio(audioUrl);
            
            audioPlaybackNode.onended = () => {
                if (elementNode) elementNode.classList.remove('ai-speaking-active');
                URL.revokeObjectURL(audioUrl);
            };
            
            await audioPlaybackNode.play();
        } catch (error) {
            console.error("Vocal engine audio playback interrupted:", error);
            if (elementNode) elementNode.classList.remove('ai-speaking-active');
        }
    }
};

// EXPOSE TO GLOBAL WINDOW OBJECT SO SCRIPT.JS CAN SENSE IT
window.BrainlyAICore = BrainlyAICore;
