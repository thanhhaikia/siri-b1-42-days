// Browser text-to-speech for word and sentence audio.
const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
let voice = null;

function pick() {
  const vs = synth?.getVoices() || [];
  voice = vs.find((v) => /en[-_]GB/i.test(v.lang) && /google|natural|female/i.test(v.name))
    || vs.find((v) => /en[-_](GB|US)/i.test(v.lang))
    || vs.find((v) => /^en/i.test(v.lang)) || null;
}
if (synth) {
  pick();
  synth.addEventListener?.('voiceschanged', pick);
}

export const canSpeak = () => !!synth && (synth.getVoices() || []).some((v) => /^en/i.test(v.lang));

export function speak(text, rate = 0.9) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang || 'en-GB';
  if (voice) u.voice = voice;
  u.rate = rate;
  synth.speak(u);
}
