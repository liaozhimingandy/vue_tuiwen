export interface AudioPlayOptions {
  volume?: number;
  loop?: boolean;
}

interface AudioItem {
  audio: HTMLAudioElement;
  volume: number;
}

class AudioManager {
  private readonly audioMap = new Map<string, AudioItem>();

  private masterVolume = 1;
  private muted = false;

  private getAudio(src: string, volume = 1): AudioItem {
    let item = this.audioMap.get(src);

    if (!item) {
      const audio = new Audio(src);

      audio.preload = 'auto';

      item = {
        audio,
        volume,
      };

      this.audioMap.set(src, item);
    }

    return item;
  }

  private getActualVolume(volume: number): number {
    if (this.muted) {
      return 0;
    }

    return Math.min(1, Math.max(0, volume * this.masterVolume));
  }

  /**
   * 播放音效
   *
   * 浏览器如果因为 autoplay policy 拒绝播放，
   * 静默失败，不影响业务逻辑。
   */
  async play(src: string, options: AudioPlayOptions = {}): Promise<boolean> {
    if (!src) {
      return false;
    }

    const {volume = 1, loop = false} = options;

    const item = this.getAudio(src, volume);

    item.volume = volume;

    const audio = item.audio;

    audio.loop = loop;
    audio.muted = this.muted;
    audio.volume = this.getActualVolume(volume);

    try {
      audio.currentTime = 0;

      await audio.play();

      return true;
    } catch {
      // 浏览器禁止自动播放时静默失败
      return false;
    }
  }

  pause(src: string): void {
    const item = this.audioMap.get(src);

    if (!item) {
      return;
    }

    item.audio.pause();
  }

  stop(src: string): void {
    const item = this.audioMap.get(src);

    if (!item) {
      return;
    }

    item.audio.pause();
    item.audio.currentTime = 0;
  }

  stopAll(): void {
    for (const item of this.audioMap.values()) {
      item.audio.pause();
      item.audio.currentTime = 0;
    }
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.min(1, Math.max(0, volume));

    this.updateVolumes();
  }

  getVolume(): number {
    return this.masterVolume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;

    this.updateVolumes();
  }

  isMuted(): boolean {
    return this.muted;
  }

  private updateVolumes(): void {
    for (const item of this.audioMap.values()) {
      item.audio.muted = this.muted;
      item.audio.volume = this.getActualVolume(item.volume);
    }
  }

  destroyAudio(src: string): void {
    const item = this.audioMap.get(src);

    if (!item) {
      return;
    }

    item.audio.pause();
    item.audio.removeAttribute('src');
    item.audio.load();

    this.audioMap.delete(src);
  }

  destroy(): void {
    for (const item of this.audioMap.values()) {
      item.audio.pause();
      item.audio.removeAttribute('src');
      item.audio.load();
    }

    this.audioMap.clear();
  }
}

export const audioManager = new AudioManager();
