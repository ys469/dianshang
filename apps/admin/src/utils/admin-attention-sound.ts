import type { AdminAttentionIncrease } from './admin-attention';

let audioContext: AudioContext | null = null;
let unlockInstalled = false;
let lastPlayedAt = 0;

function getAudioContext() {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

export function installAdminAttentionSoundUnlock() {
  if (typeof window === 'undefined' || unlockInstalled) {
    return;
  }

  unlockInstalled = true;

  const unlock = () => {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    void ctx.resume().catch(() => undefined);
  };

  for (const eventName of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(eventName, unlock, { passive: true });
  }
}

export async function playAdminAttentionSound(increase: AdminAttentionIncrease) {
  const ctx = getAudioContext();
  if (!ctx) {
    return false;
  }

  if (Date.now() - lastPlayedAt < 2200) {
    return false;
  }

  if (ctx.state !== 'running') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }

  if (ctx.state !== 'running') {
    return false;
  }

  const frequencies: number[] = [];
  if (increase.hasNewOrders) {
    frequencies.push(720);
  }
  if (increase.hasNewMerchantMessages) {
    frequencies.push(960, 1240);
  }

  if (!frequencies.length) {
    return false;
  }

  const startAt = ctx.currentTime + 0.02;
  frequencies.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const toneStart = startAt + index * 0.16;
    const toneEnd = toneStart + 0.11;

    oscillator.type = index === frequencies.length - 1 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, toneStart);

    gainNode.gain.setValueAtTime(0.0001, toneStart);
    gainNode.gain.exponentialRampToValueAtTime(0.07, toneStart + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(toneStart);
    oscillator.stop(toneEnd + 0.02);
  });

  lastPlayedAt = Date.now();
  return true;
}
