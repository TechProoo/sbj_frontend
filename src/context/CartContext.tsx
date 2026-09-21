import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { MenuItem, Modifier } from '../lib/types';
import { toNumber } from '../lib/format';

export interface CartLine {
  /// Same dish with different options is a different line, so the key folds in
  /// the chosen modifiers rather than being the menu item id alone.
  key: string;
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  modifiers: { id: string; name: string; priceDelta: number }[];
  notes?: string;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (item: MenuItem, modifiers: Modifier[], quantity: number, notes?: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'sbj.cart.v1';

const lineKey = (menuItemId: string, modifierIds: string[], notes?: string) =>
  [menuItemId, [...modifierIds].sort().join('+'), notes ?? ''].join('|');

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    // A cart that survives a refresh is the difference between a sale and an
    // abandoned checkout.
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as CartLine[]) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Private browsing — the cart just will not persist.
    }
  }, [lines]);

  const add = useCallback(
    (item: MenuItem, modifiers: Modifier[], quantity: number, notes?: string) => {
      const key = lineKey(
        item.id,
        modifiers.map((m) => m.id),
        notes,
      );

      setLines((current) => {
        const existing = current.find((line) => line.key === key);
        if (existing) {
          return current.map((line) =>
            line.key === key
              ? { ...line, quantity: line.quantity + quantity }
              : line,
          );
        }

        const unitPrice =
          toNumber(item.price) +
          modifiers.reduce((sum, m) => sum + toNumber(m.priceDelta), 0);

        return [
          ...current,
          {
            key,
            menuItemId: item.id,
            name: item.name,
            imageUrl: item.imageUrl,
            unitPrice,
            quantity,
            notes,
            modifiers: modifiers.map((m) => ({
              id: m.id,
              name: m.name,
              priceDelta: toNumber(m.priceDelta),
            })),
          },
        ];
      });
      setOpen(true);
    },
    [],
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.key !== key)
        : current.map((line) =>
            line.key === key ? { ...line, quantity } : line,
          ),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce(
      (sum, line) => sum + line.unitPrice * line.quantity,
      0,
    );
    return {
      lines,
      count,
      subtotal,
      add,
      setQuantity,
      remove,
      clear,
      isOpen,
      setOpen,
    };
  }, [lines, add, setQuantity, remove, clear, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside a CartProvider');
  return context;
}
