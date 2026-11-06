import { useEffect, useRef, useState } from 'react'
import { errorText } from './errors.ts'

type QueryState<T> = {
  data: T | null
  error: string | null
  loading: boolean
  refreshing: boolean
  reload: () => void
}

export function useQuery<T>(loader: () => Promise<T>, deps: readonly unknown[]): QueryState<T> {
  const [packet, setPacket] = useState<{ key: string; data: T } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  const key = JSON.stringify(deps)
  const loaderRef = useRef(loader)

  useEffect(() => {
    loaderRef.current = loader
  })

  useEffect(() => {
    const gate = { ignore: false }
    setLoading(true)
    setError(null)
    loaderRef
      .current()
      .then((next) => {
        if (gate.ignore) return
        setPacket({ key, data: next })
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (gate.ignore) return
        setError(errorText(reason))
        setLoading(false)
      })
    return () => {
      gate.ignore = true
    }
  }, [key, nonce])

  const data = packet?.key === key ? packet.data : null

  return {
    data,
    error,
    loading: loading && data === null,
    refreshing: loading && data !== null,
    reload: () => setNonce((value) => value + 1),
  }
}
