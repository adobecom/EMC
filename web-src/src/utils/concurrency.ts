/*
* <license header>
*/

/**
 * Runs `worker` over `items` with at most `limit` calls in flight at once.
 * Results preserve input order regardless of completion order. A rejecting
 * `worker` call propagates — callers that want per-item degradation (skip a
 * failed item rather than failing the whole batch) should catch inside `worker`.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []

  const effectiveLimit = Math.max(1, Math.min(limit, items.length))
  const results: R[] = new Array(items.length)
  let cursor = 0

  async function runNext(): Promise<void> {
    const i = cursor++
    if (i >= items.length) return
    results[i] = await worker(items[i], i)
    return runNext()
  }

  await Promise.all(Array.from({ length: effectiveLimit }, runNext))
  return results
}
