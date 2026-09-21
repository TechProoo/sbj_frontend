import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Category } from '../lib/types';

/// Loads the storefront menu once, at the shell level, so the header's dish
/// strip and whichever page is mounted render from the same data.
export function useMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .getMenu()
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : 'Could not load the menu.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading, error };
}
