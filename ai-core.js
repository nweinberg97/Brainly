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
            
            this.tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {\n                dtype: useWebGPU ? "fp32" : "q8",
                device: useWebGPU ? "webgpu" : "wasm"
            });
            
            this.isVoiceReady = true;
            console.log(`Premium vocal synthesizer fully initialized via: ${useWebGPU ? 'WebGPU' : 'WASM Core'}`);
        } catch (err) {
            console.error("Vocal engine optimization skipped. Falling back to native safety targets.", err);
        }
    },

    /**
     * Context Scraper: Skips empty boilerplate strings to extract real content for the prompt context
     * @param {Object} note - The target note object directly from BrainlyState.notes
     */
    extractMeaningfulContext(note) {
        if (!note) return '';
        const p = 'Enter data details...';
        const standardSummaryVolatile = (!note.content || note.content.trim() === p);
        
        return standardSummaryVolatile ? note.content : note.summary;
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
