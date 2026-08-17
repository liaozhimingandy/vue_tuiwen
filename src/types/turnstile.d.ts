export {}

declare global {
  interface Window {
    turnstile: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string
          action?: string
          theme?: string
          size?: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        }
      ) => string
      execute: (widgetId: string) => void
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}
