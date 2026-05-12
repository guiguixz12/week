export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

type Listener = (toasts: ToastItem[]) => void

let _toasts: ToastItem[] = []
const _listeners = new Set<Listener>()

function _notify() {
  _listeners.forEach(l => l([..._toasts]))
}

export function toast(message: string, type: ToastType = 'success') {
  const id = Math.random().toString(36).slice(2)
  _toasts = [..._toasts, { id, message, type }]
  _notify()
  setTimeout(() => dismissToast(id), 3500)
}

export function dismissToast(id: string) {
  _toasts = _toasts.filter(t => t.id !== id)
  _notify()
}

export function subscribeToasts(listener: Listener) {
  _listeners.add(listener)
  listener([..._toasts])
  return () => { _listeners.delete(listener) }
}
