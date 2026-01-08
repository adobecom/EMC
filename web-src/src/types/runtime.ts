/* 
* <license header>
*/

/**
 * Type definitions for Adobe Experience Cloud Runtime
 * These types define the interface with the Adobe Experience Cloud shell
 */

export interface IMSProfile {
  userId?: string
  name?: string
  email?: string
  [key: string]: any
}

export interface IMS {
  profile?: IMSProfile
  org?: string
  token?: string
}

export interface RuntimeConfiguration {
  imsOrg?: string
  imsToken?: string
  locale?: string
}

export interface HistoryEvent {
  type: string
  path: string
}

export interface ReadyEvent {
  imsOrg: string
  imsToken: string
  imsProfile: IMSProfile
  locale: string
}

export interface Runtime {
  on(event: 'configuration', handler: (config: RuntimeConfiguration) => void): void
  on(event: 'history', handler: (event: HistoryEvent) => void): void
  on(event: 'ready', handler: (event: ReadyEvent) => void): void
  done(): void
  favicon?: string
  heroClick?: () => void
  solution?: {
    icon: string
    title: string
    shortTitle: string
  }
  title?: string
}

export interface Actions {
  [key: string]: string
}
