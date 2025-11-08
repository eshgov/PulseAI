/**
 * Audio Metronome Utility
 * Plays audio beep at target BPM for CPR rhythm guidance
 */

class AudioMetronome {
  private audioContext: AudioContext | null = null;
  private intervalId: number | null = null;
  private targetBPM: number = 110;
  private isPlaying: boolean = false;

  /**
   * Initialize audio context
   */
  private async initAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browsers require user interaction)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * Play a beep sound
   */
  private async playBeep(): Promise<void> {
    try {
      const context = await this.initAudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      // Create a short beep (100ms)
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.1);
    } catch (error) {
      console.warn('Could not play metronome beep:', error);
    }
  }

  /**
   * Start metronome at target BPM
   */
  async start(targetBPM: number = 110): Promise<void> {
    if (this.isPlaying) {
      this.stop();
    }

    this.targetBPM = targetBPM;
    this.isPlaying = true;

    // Calculate interval in milliseconds
    const intervalMs = (60 / targetBPM) * 1000;

    // Play initial beep
    await this.playBeep();

    // Set up interval
    this.intervalId = window.setInterval(() => {
      if (this.isPlaying) {
        this.playBeep();
      }
    }, intervalMs);
  }

  /**
   * Stop metronome
   */
  stop(): void {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Update target BPM
   */
  async updateBPM(targetBPM: number): Promise<void> {
    if (this.isPlaying && targetBPM !== this.targetBPM) {
      this.stop();
      await this.start(targetBPM);
    } else {
      this.targetBPM = targetBPM;
    }
  }
}

// Export singleton instance
export const audioMetronome = new AudioMetronome();

