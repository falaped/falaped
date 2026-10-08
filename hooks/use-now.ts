"use client"

import { useEffect, useState } from "react"

/**
 * Agora (epoch ms), atualizado a cada `intervalMs`: para status que mudam só com o tempo,
 * como a consulta que passa a contar como parada. `initial` vem do servidor e evita
 * diferença na hidratação.
 */
export function useNow(intervalMs: number, initial: number = Date.now()): number {
  const [now, setNow] = useState(initial)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
