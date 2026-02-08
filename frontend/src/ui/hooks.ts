import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../api/http'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await fn()
        if (!cancelled) setData(result)
      } catch (e) {
        if (cancelled) return
        if (e instanceof ApiError) setError(e.message)
        else setError('Erro inesperado')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, deps)

  return useMemo(() => ({ data, loading, error, setData }), [data, loading, error])
}
