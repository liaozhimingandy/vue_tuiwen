interface Turnstile {

  render(
    element: HTMLElement,
    options: any
  ): string


  reset(
    widgetId?: string
  ): void


  remove(
    widgetId?: string
  ): void


  getResponse(
    widgetId?: string
  ): string

}


interface Window {

  turnstile: Turnstile

}