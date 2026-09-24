/*
* <license header>
*/

import { mapWithConcurrency } from './concurrency'

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('mapWithConcurrency', () => {
  it('returns an empty array without calling worker for an empty input', async () => {
    const worker = jest.fn()
    const result = await mapWithConcurrency([], 3, worker)
    expect(result).toEqual([])
    expect(worker).not.toHaveBeenCalled()
  })

  it('preserves input order even when later items resolve first', async () => {
    const items = [1, 2, 3]
    const gates = items.map(() => deferred<number>())

    const promise = mapWithConcurrency(items, 3, (item, index) => gates[index].promise)

    // Resolve out of order: last item first, first item last.
    gates[2].resolve(30)
    gates[0].resolve(10)
    gates[1].resolve(20)

    await expect(promise).resolves.toEqual([10, 20, 30])
  })

  it('never runs more than `limit` workers concurrently', async () => {
    const items = Array.from({ length: 10 }, (_, i) => i)
    let inFlight = 0
    let maxInFlight = 0

    await mapWithConcurrency(items, 3, async (item) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await Promise.resolve()
      inFlight--
      return item
    })

    expect(maxInFlight).toBeLessThanOrEqual(3)
  })

  it('behaves like Promise.all when limit >= items.length', async () => {
    const items = [1, 2, 3]
    const result = await mapWithConcurrency(items, 10, async (item) => item * 2)
    expect(result).toEqual([2, 4, 6])
  })

  it('propagates a rejection from worker', async () => {
    const items = [1, 2, 3]
    await expect(
      mapWithConcurrency(items, 2, async (item) => {
        if (item === 2) throw new Error('boom')
        return item
      })
    ).rejects.toThrow('boom')
  })
})
