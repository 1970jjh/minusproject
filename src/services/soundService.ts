// Sound service for game audio effects

// Use Speech Synthesis API for voice effects
export const playVoiceEffect = (text: 'PASS' | 'TAKE'): void => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Speech synthesis not available');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Configure voice settings
  utterance.rate = 1.0;  // Speed
  utterance.pitch = 1.0; // Pitch
  utterance.volume = 0.8; // Volume

  // Try to use an English voice for better pronunciation
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(voice =>
    voice.lang.startsWith('en') && voice.name.toLowerCase().includes('english')
  ) || voices.find(voice => voice.lang.startsWith('en'));

  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  window.speechSynthesis.speak(utterance);
};

// Initialize voices (needed on some browsers)
export const initializeSpeech = (): void => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    // Load voices (some browsers need this)
    window.speechSynthesis.getVoices();

    // Some browsers load voices asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
};
