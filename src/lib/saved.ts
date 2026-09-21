import { useCallback, useSyncExternalStore } from 'react';

/*
 * Saved dishes — the bookmark on every card.
 *
 * The list lives outside React so that every card showing the same dish flips
 * together, it survives a refresh the way the cart does, and two tabs open on
 * the menu stay in step.
 */

const STORAGE_KEY = 'sbj.saved.v1';
const EMPTY: readonly string[] = [];

const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    // Anything hand-edited into storage is ignored rather than crashing the
    // menu on load.
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

/// The snapshot `useSyncExternalStore` reads. Replaced wholesale on every
/// write, never mutated, so the reference doubles as the change signal.
let ids: readonly string[] = read();

function emit(): void {
  listeners.forEach((notify) => notify());
}

function write(next: readonly string[]): void {
  ids = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // A private window with storage blocked still gets the in-memory toggle.
  }
  emit();
}

// Another tab saving a dish is a change this tab has to honour.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    ids = read();
    emit();
  });
}

export function toggleSaved(id: string): void {
  write(ids.includes(id) ? ids.filter((saved) => saved !== id) : [...ids, id]);
}

export function clearSaved(): void {
  write(EMPTY);
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

/// Whether one dish is saved.
export function useIsSaved(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    useCallback(() => ids.includes(id), [id]),
    () => false,
  );
}

/// Every saved id, newest last. Stable between writes, so it is safe to use
/// as an effect or memo dependency.
export function useSavedIds(): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => ids,
    () => EMPTY,
  );
}

export function useSavedCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => ids.length,
    () => 0,
  );
}
