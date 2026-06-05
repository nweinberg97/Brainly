// =========================================================================
// VOICE TRANSCRIPTION & SYNTHESIS CONTROLLER
// =========================================================================

import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";

export class VoiceAudioEngine {
  constructor() {
    this.tts = null;
    this.isReady = false;
    this.currentVoice = "af_heart"; // 'af_heart' or 'af_sky' are beautiful, natural options
    this.audioContext = null;
  }

  /**
   * Initializes the Kokoro model directly in the browser layer.
   * Downloads and caches the ~85MB ONNX weights locally on first run.
   */
  async initialize() {
    try {
      console.log("Initializing local human-like voice layer (Kokoro-82M)...");
      
      // Auto-detect optimal processing acceleration
      const hasWebGPU = !!navigator.gpu;
      const device = hasWebGPU ? "webgpu" : "wasm";
      const dtype = hasWebGPU ? "fp32" : "q8"; // 8-bit quantization makes WASM blindingly fast

      this.tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
        dtype: dtype,
        device: device
      });

      this.isReady = true;
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log(`Voice engine successfully loaded via [${device.toUpperCase()}]`);
    } catch (error) {
      console.error("Failed to stand up local voice engine, falling back to silent logs:", error);
    }
  }

  /**
   * Synthesizes and immediately plays text input using natural human inflection
   * @param {string} text - The clean markdown-stripped string to speak
   */
  async speak(text) {
    if (!this.isReady || !this.tts) {
      console.warn("Voice engine called before initialization was complete.");
      return;
    }

    try {
      // Clear out raw markdown formatting tokens so the model doesn't read them out loud
      const cleanText = text.replace(/[*_#`~>]/g, "").trim();

      // Generate pristine Float32 PCM samples right on the client side
      const audio = await this.tts.generate(cleanText, {
        voice: this.currentVoice,
      });

      // Play the generated native WAV buffer directly through the user's sound card
      const audioUrl = URL.createObjectURL(audio.toWav());
      const playElement = new Audio(audioUrl);
      
      await playElement.play();
    } catch (error) {
      console.error("Error during real-time speech generation:", error);
    }
  }

  /**
   * Updates the selected acoustic persona profile
   * @param {string} voiceName - e.g., 'af_heart', 'af_bella', 'af_sky', 'am_adam'
   */
  setVoice(voiceName) {
    this.currentVoice = voiceName;
  }
}
