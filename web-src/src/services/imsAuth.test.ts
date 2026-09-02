import { imsAuthService } from './imsAuth'

// resetOversizedCookies is private — access via a narrow cast rather than exposing it publicly
const resetOversizedCookies = () => (imsAuthService as unknown as { resetOversizedCookies(): void }).resetOversizedCookies()

/** Minimal in-memory stand-in for the browser's cookie jar, supporting set/expire via document.cookie writes. */
function createCookieJar(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    get cookie(): string {
      return Array.from(store.entries()).map(([name, value]) => `${name}=${value}`).join('; ')
    },
    set cookie(pair: string) {
      const [assignment, ...attrs] = pair.split(';').map(p => p.trim())
      const eqIndex = assignment.indexOf('=')
      const name = eqIndex === -1 ? assignment : assignment.slice(0, eqIndex)
      const value = eqIndex === -1 ? '' : assignment.slice(eqIndex + 1)
      const expiresAttr = attrs.find(a => /^expires=/i.test(a))
      const isExpired = expiresAttr && new Date(expiresAttr.split('=')[1]).getTime() <= Date.now()
      if (isExpired) {
        store.delete(name)
      } else {
        store.set(name, value)
      }
    }
  }
}

describe('ImsAuthService — resetOversizedCookies', () => {
  const originalDocument = (global as unknown as { document?: unknown }).document
  const originalWindow = (global as unknown as { window?: unknown }).window

  afterEach(() => {
    ;(global as unknown as { document?: unknown }).document = originalDocument
    ;(global as unknown as { window?: unknown }).window = originalWindow
    jest.restoreAllMocks()
  })

  function installJar(initial: Record<string, string>) {
    const jar = createCookieJar(initial)
    ;(global as unknown as { document: unknown }).document = jar
    ;(global as unknown as { window: unknown }).window = { location: { hostname: 'events-internal.adobe.com' } }
    return jar
  }

  it('does nothing when total cookie payload is small', () => {
    const jar = installJar({ small: 'value' })
    resetOversizedCookies()
    expect(jar.cookie).toContain('small=value')
  })

  it('clears an individually-oversized cookie once total payload crosses the threshold', () => {
    const jar = installJar({ bigCookie: 'x'.repeat(4500) })
    resetOversizedCookies()
    expect(jar.cookie).not.toContain('bigCookie=')
  })

  it('leaves small unrelated cookies alone even when the total payload is large', () => {
    const jar = installJar({ bigCookie: 'x'.repeat(4500), consent: '1' })
    resetOversizedCookies()
    expect(jar.cookie).toContain('consent=1')
    expect(jar.cookie).not.toContain('bigCookie=')
  })

  it('does not warn when the clear actually shrinks the cookie payload', () => {
    installJar({ bigCookie: 'x'.repeat(4500) })
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    resetOversizedCookies()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('warns when the payload does not shrink after clearing (e.g. an HttpOnly culprit JS cannot touch)', () => {
    // A cookie jar that ignores writes entirely — stands in for an HttpOnly or
    // parent-domain-scoped cookie that document.cookie can never actually clear.
    const stuckValue = `bigCookie=${'x'.repeat(4500)}`
    ;(global as unknown as { document: unknown }).document = {
      get cookie() { return stuckValue },
      set cookie(_value: string) { /* no-op: simulates an uncleanable cookie */ }
    }
    ;(global as unknown as { window: unknown }).window = { location: { hostname: 'events-internal.adobe.com' } }
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    resetOversizedCookies()

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('did not shrink'))
  })
})
