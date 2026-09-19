import { audioManager } from '@/common/audio-manager'

export function useAudio() {
  const play = (
    src: string,
    volume = 1
  ) => {
    return audioManager.play(src, {
      volume
    })
  }

  const pause = (src: string) => {
    audioManager.pause(src)
  }

  const stop = (src: string) => {
    audioManager.stop(src)
  }

  const stopAll = () => {
    audioManager.stopAll()
  }

  const setVolume = (volume: number) => {
    audioManager.setVolume(volume)
  }

  const getVolume = () => {
    return audioManager.getVolume()
  }

  const setMuted = (muted: boolean) => {
    audioManager.setMuted(muted)
  }

  const isMuted = () => {
    return audioManager.isMuted()
  }

  return {
    play,
    pause,
    stop,
    stopAll,
    setVolume,
    getVolume,
    setMuted,
    isMuted
  }
}