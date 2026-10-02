/** A quiet welcome chirp, called only from the user's start action. */
export function playStartSound(): void {
  if (typeof window === "undefined") return;
  let context: AudioContext | undefined;
  try {
    const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    context = new Audio();
    const audio = context;
    const close = () => { void audio.close().catch(() => {}); };
    if (audio.state === "suspended") void audio.resume().catch(close);
    let remaining = 2;
    for (const [offset, frequency, duration] of [[0, 660, .075], [.09, 880, .11]]) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + .01 + offset;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.025, start + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.onended = () => { if (--remaining === 0) close(); };
      oscillator.start(start);
      oscillator.stop(start + duration + .005);
    }
  } catch {
    void context?.close().catch(() => {});
  }
}
