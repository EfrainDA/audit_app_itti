"use client"

import { useEffect, useState } from "react"
import { mockUnidades, type UnidadNegocio } from "@/lib/data"
import { useAppData } from "@/hooks/use-app-data"

const STORAGE_KEY = "qualittyx-unidades"
const EVENT_NAME = "qualittyx-unidades-updated"

function readUnidades(): UnidadNegocio[] {
  if (typeof window === "undefined") return mockUnidades

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return mockUnidades

  try {
    return JSON.parse(stored) as UnidadNegocio[]
  } catch {
    return mockUnidades
  }
}

function persistUnidades(unidades: UnidadNegocio[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unidades))
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function useUnidades() {
  const { data } = useAppData()
  const [unidades, setUnidadesState] = useState<UnidadNegocio[]>(data.unidades.length ? data.unidades : mockUnidades)

  useEffect(() => {
    const sync = () => setUnidadesState(readUnidades())

    sync()
    window.addEventListener("storage", sync)
    window.addEventListener(EVENT_NAME, sync)

    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener(EVENT_NAME, sync)
    }
  }, [])

  useEffect(() => {
    if (data.unidades.length) {
      setUnidadesState(data.unidades)
    }
  }, [data.unidades])

  const setUnidades = (updater: UnidadNegocio[] | ((current: UnidadNegocio[]) => UnidadNegocio[])) => {
    const next = typeof updater === "function" ? updater(readUnidades()) : updater
    setUnidadesState(next)
    persistUnidades(next)
  }

  return { unidades, setUnidades }
}
