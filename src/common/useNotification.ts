import {storeToRefs} from 'pinia';
import appStore from '@/stores';

import {notificationManager} from '@/common/notification-manager';
import {audioManager} from '@/common/audio-manager';
import {logger} from '@/common/utils.ts';

export function useNotification() {
  const {account} = storeToRefs(appStore.useAccountStore);

  /**
   * 应用是否开启通知
   * :todo 后续后端加一个allow_notification总开关
   */
  const isNotificationEnabled = () => {
    return account.value.allow_vibration === true;
  };

  /**
   * 浏览器是否允许通知
   */
  const isBrowserNotificationGranted = () => {
    return notificationManager.isGranted();
  };

  /**
   * 当前是否可以发送通知
   */
  const canNotify = () => {
    return isNotificationEnabled() && isBrowserNotificationGranted();
  };

  /**
   * 系统通知
   */
  const notify = async (title: string, options = {}) => {
    if (!canNotify()) {
      logger.warn('用户关闭了浏览器通知权限或者总开关关闭');
      return null;
    }
    return notificationManager.show(title, options);
  };

  /**
   * 通知声音
   */
  const playSound = async (src: string, volume = 1) => {
    /**
     * App 通知关闭
     */
    if (!account.value.allow_vibration) {
      return false;
    }

    /**
     * 用户关闭声音
     */
    if (!account.value.allow_beep) {
      return false;
    }

    return audioManager.play(src, {volume: volume});
  };

  /**
   * 震动
   */
  // const vibrate = (
  //   pattern: VibratePattern = [200],
  // ) => {
  //   if (!isNotificationEnabled()) {
  //     return false
  //   }
  //
  //   if (account.value.allow_vibration !== true) {
  //     return false
  //   }
  //
  //   if (!('vibrate' in navigator)) {
  //     return false
  //   }
  //
  //   return navigator.vibrate(pattern)
  // }

  /**
   * 通知 + 声音 + 震动
   */
  const notifyWithSound = async (title: string, options: NotificationOptions = {}, sound?: string, volume = 1) => {
    // 总开关关闭
    if (!isNotificationEnabled()) {
      return {
        notification: null,
        soundPlayed: false,
      };
    }

    const notification = notify(title, options);

    let soundPlayed = false;
    // let vibrated = false
    if (sound && account.value.allow_beep === true) {
      soundPlayed = await playSound(sound, volume);
    }

    // if (account.value.allow_vibration === true) {
    //   vibrated = vibrate(vibration)
    // }

    return {
      notification,
      soundPlayed,
    };
  };

  return {
    notify,
    playSound,
    notifyWithSound,
  };
}
