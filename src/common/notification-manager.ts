export interface SystemNotificationOptions {
  /**
   * 通知正文
   */
  body?: string

  /**
   * 通知图标
   */
  icon?: string

  /**
   * 通知唯一标识
   */
  tag?: string

  /**
   * 是否静默
   */
  silent?: boolean

  /**
   * 点击通知时是否自动关闭
   */
  requireInteraction?: boolean
}

class NotificationManager {
  /**
   * 判断浏览器是否支持系统通知
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' &&
      'Notification' in window
  }

  /**
   * 获取当前通知权限
   *
   * default  = 用户还没有选择
   * granted  = 已允许
   * denied   = 已拒绝
   */
  getPermission(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied'
    }

    return Notification.permission
  }

  /**
   * 是否已经允许通知
   */
  isGranted(): boolean {
    return (
      this.getPermission() === 'granted'
    )
  }

  /**
   * 是否已经拒绝通知
   */
  isDenied(): boolean {
    return (
      this.getPermission() === 'denied'
    )
  }

  /**
   * 是否还没有选择
   */
  isDefault(): boolean {
    return (
      this.getPermission() === 'default'
    )
  }

  /**
   * 请求浏览器通知权限
   *
   * 必须由用户主动操作触发。
   *
   * 例如：
   *
   * button @click="enableNotification"
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn(
        '[NotificationManager] 当前浏览器不支持系统通知'
      )

      return 'denied'
    }

    /**
     * 已允许
     */
    if (
      Notification.permission === 'granted'
    ) {
      return 'granted'
    }

    /**
     * 已拒绝
     *
     * 浏览器通常不会再次弹出权限窗口，
     * 需要用户到浏览器设置中手动恢复。
     */
    if (
      Notification.permission === 'denied'
    ) {
      console.warn(
        '[NotificationManager] 通知权限已经被拒绝，请到浏览器设置中重新允许'
      )

      return 'denied'
    }

    try {
      return await Notification.requestPermission()
    } catch (error) {
      console.warn(
        '[NotificationManager] 请求通知权限失败',
        error
      )

      return 'denied'
    }
  }

  /**
   * 显示系统通知
   */
  show(
    title: string,
    options: SystemNotificationOptions = {}
  ): Notification | null {
    if (!this.isSupported()) {
      return null
    }

    if (!this.isGranted()) {
      console.warn(
        '[NotificationManager] 没有系统通知权限'
      )

      return null
    }

    try {
      const notification =
        new Notification(
          title,
          {
            body: options.body,
            icon: options.icon,
            tag: options.tag,
            silent: options.silent,
            requireInteraction:
              options.requireInteraction
          }
        )

      /**
       * 点击通知
       */
      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return notification
    } catch (error) {
      console.warn(
        '[NotificationManager] 创建系统通知失败',
        error
      )

      return null
    }
  }

  /**
   * 关闭指定通知
   */
  close(
    notification: Notification | null
  ): void {
    if (!notification) {
      return
    }

    notification.close()
  }
}

export const notificationManager =
  new NotificationManager()