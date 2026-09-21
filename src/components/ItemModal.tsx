import { useEffect, useMemo, useState } from 'react';
import { LuMinus, LuPlus, LuSoup, LuX } from 'react-icons/lu';
import { useCart } from '../context/CartContext';
import { formatMoney, toNumber } from '../lib/format';
import type { MenuItem, Modifier } from '../lib/types';

export function ItemModal({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Record<string, string[]>>(() =>
    // A required single-choice group (portion size, pepper level) starts on its
    // first option so the customer never has to answer a question they do not
    // care about.
    Object.fromEntries(
      item.modifierGroups.map((group) => [
        group.id,
        group.minSelect > 0 && group.modifiers[0]
          ? [group.modifiers[0].id]
          : [],
      ]),
    ),
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const chosen: Modifier[] = useMemo(
    () =>
      item.modifierGroups.flatMap((group) =>
        group.modifiers.filter((modifier) =>
          selected[group.id]?.includes(modifier.id),
        ),
      ),
    [item.modifierGroups, selected],
  );

  const unitPrice =
    toNumber(item.price) +
    chosen.reduce((sum, modifier) => sum + toNumber(modifier.priceDelta), 0);

  const unmetGroup = item.modifierGroups.find(
    (group) => (selected[group.id]?.length ?? 0) < group.minSelect,
  );

  const toggle = (groupId: string, modifierId: string, maxSelect: number) => {
    setSelected((current) => {
      const existing = current[groupId] ?? [];

      if (maxSelect === 1) {
        return { ...current, [groupId]: [modifierId] };
      }

      if (existing.includes(modifierId)) {
        return {
          ...current,
          [groupId]: existing.filter((id) => id !== modifierId),
        };
      }

      // At the cap, the newest choice replaces the oldest rather than silently
      // doing nothing.
      const next =
        existing.length >= maxSelect
          ? [...existing.slice(1), modifierId]
          : [...existing, modifierId];
      return { ...current, [groupId]: next };
    });
  };

  const submit = () => {
    add(item, chosen, quantity, notes.trim() || undefined);
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal dish-sheet">
        {/* The card the customer just tapped, carried into the sheet: same
            photo, same scrim, same type — so the two read as one object. */}
        <div className="dish-sheet-hero">
          <div className={`dish-art${item.imageUrl ? '' : ' dish-art-empty'}`}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" />
            ) : (
              <LuSoup className="glyph" aria-hidden="true" />
            )}
          </div>

          <div className="dish-scrim" aria-hidden="true" />

          <button
            type="button"
            className="dish-save dish-sheet-close"
            onClick={onClose}
            aria-label="Close"
          >
            <LuX size={17} aria-hidden="true" />
          </button>

          <div className="dish-sheet-head">
            <h2>{item.name}</h2>
            {item.description && <p>{item.description}</p>}
          </div>
        </div>

        <div className="modal-body">
          {item.modifierGroups.map((group) => (
            <div key={group.id} className="option-group">
              <h4>{group.name}</h4>
              <p className="hint">
                {group.minSelect > 0 ? 'Required · ' : 'Optional · '}
                {group.maxSelect === 1
                  ? 'choose one'
                  : `choose up to ${group.maxSelect}`}
              </p>

              {group.modifiers.map((modifier) => (
                <label key={modifier.id} className="option">
                  <input
                    type={group.maxSelect === 1 ? 'radio' : 'checkbox'}
                    name={group.id}
                    checked={
                      selected[group.id]?.includes(modifier.id) ?? false
                    }
                    onChange={() =>
                      toggle(group.id, modifier.id, group.maxSelect)
                    }
                  />
                  <span>{modifier.name}</span>
                  {toNumber(modifier.priceDelta) > 0 && (
                    <span className="delta">
                      +{formatMoney(modifier.priceDelta)}
                    </span>
                  )}
                </label>
              ))}
            </div>
          ))}

          <div className="field">
            <label htmlFor="item-notes">Notes for the kitchen</label>
            <textarea
              id="item-notes"
              rows={2}
              maxLength={200}
              placeholder="No onions, extra pepper…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <div className="modal-foot">
          <div className="stepper">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Reduce quantity"
            >
              <LuMinus size={16} aria-hidden="true" />
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(50, q + 1))}
              aria-label="Increase quantity"
            >
              <LuPlus size={16} aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            className="dish-add"
            onClick={submit}
            disabled={Boolean(unmetGroup)}
          >
            {unmetGroup
              ? `Choose ${unmetGroup.name.toLowerCase()}`
              : `Add to Cart · ${formatMoney(unitPrice * quantity)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
