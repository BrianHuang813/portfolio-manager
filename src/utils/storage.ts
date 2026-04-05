// Spec: F1 — typed localStorage wrappers used by Settings and services

export function getConfig<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function setConfig<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function clearConfig(key: string): void {
  localStorage.removeItem(key)
}

export function getRawString(key: string): string | null {
  return localStorage.getItem(key)
}

export function setRawString(key: string, value: string): void {
  localStorage.setItem(key, value)
}
