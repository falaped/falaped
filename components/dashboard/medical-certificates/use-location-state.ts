"use client"

import { useState, useCallback } from "react"

type LocationStateResult = {
  state: string
  loading: boolean
  error: string | null
  requestLocation: () => void
}

/**
 * Requests browser geolocation and reverse-geocodes to get state (e.g. "São Paulo").
 * Fallback: user can set state manually; this hook only provides the request.
 */
export function useLocationState(onStateResolved?: (state: string) => void): LocationStateResult {
  const [state, setState] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = useCallback(() => {
    setError(null)
    setLoading(true)
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada neste navegador.")
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "pt-BR" } },
          )
          const data = (await res.json()) as { address?: { state?: string } }
          const stateName = data?.address?.state ?? ""
          setState(stateName)
          onStateResolved?.(stateName)
        } catch {
          setError("Não foi possível obter o Estado.")
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError("Permissão de localização negada ou indisponível.")
        setLoading(false)
      },
      { timeout: 10000 },
    )
  }, [onStateResolved])

  return { state, loading, error, requestLocation }
}
