// Browser text-to-speech for word and sentence audio.
const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
// The Android app speaks through the phone's text-to-speech engine: its WebView has no voices.
const native = globalThis.SiriNative;
const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;

// Best English voice that can play right now: remote voices need a connection.
function pick() {
  const vs = (synth?.getVoices() || []).filter((v) => /^en/i.test(v.lang) && (v.localService || online()));
  return vs.find((v) => /en[-_]GB/i.test(v.lang) && /google|natural|female/i.test(v.name))
    || vs.find((v) => /en[-_](GB|US)/i.test(v.lang))
    || vs[0] || null;
}

export const canSpeak = () => (native ? native.canSpeak() : !!pick());

export function speak(text, rate = 0.9) {
  if (native) return native.speak(text, rate);
  if (!synth) return;
  synth.cancel();
  const voice = pick();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang || 'en-GB';
  if (voice) u.voice = voice;
  u.rate = rate;
  synth.speak(u);
}
