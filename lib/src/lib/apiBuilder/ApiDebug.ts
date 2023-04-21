import type { RequestFnProps } from './types'

export type DebugSettings = {
  props?: false | ((props: RequestFnProps<any>) => unknown)
  response?: false | ((response: Response) => unknown)
}

export class ApiDebug {
  private settings: DebugSettings = {}
  private isEnabled = false

  public on(settings: DebugSettings = {}) {
    this.isEnabled = true
    this.settings = settings
  }

  public off() {
    this.isEnabled = false
    this.settings = {}
  }

  public props(props: RequestFnProps<any>) {
    if (!this.isEnabled || this.settings.props === false) return
    if (this.settings.props && !this.settings.props(props)) return
    console.log(props)
  }

  public response(props: Response) {
    if (!this.isEnabled || this.settings.response === false) return
    if (this.settings.response && !this.settings.response(props)) return
    console.log(props)
  }
}
