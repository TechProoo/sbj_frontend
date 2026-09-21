import type { IconType } from 'react-icons';
import {
  LuBookmark,
  LuCookie,
  LuCroissant,
  LuCupSoda,
  LuDrumstick,
  LuEgg,
  LuFish,
  LuFlame,
  LuPlus,
  LuSoup,
  LuUtensils,
  LuWheat,
} from 'react-icons/lu';
import { formatMoney } from '../lib/format';
import { toggleSaved, useIsSaved } from '../lib/saved';
import type { MenuItem } from '../lib/types';

const ICON_BY_TAG: Record<string, IconType> = {
  rice: LuWheat,
  swallow: LuSoup,
  soup: LuSoup,
  grill: LuDrumstick,
  fish: LuFish,
  snack: LuCookie,
  drink: LuCupSoda,
  breakfast: LuEgg,
  sharing: LuUtensils,
  pastry: LuCroissant,
};

/// Placeholder art for dishes with no photography yet: the closest icon to
/// whatever the dish is tagged as.
function fallbackTag(item: MenuItem): string {
  return item.tags.find((tag) => tag in ICON_BY_TAG) ?? '';
}

/// The badge in the top-left corner. One short word about the dish — the
/// design only has room for one, so the strongest claim wins.
function badgeLabel(item: MenuItem, showFlag: boolean): string {
  if (showFlag && item.isFeatured) return 'Best Seller';
  if (item.tags.some((tag) => /^(veg|vegan|vegetarian)$/.test(tag))) return 'Veg';
  if (item.spiceLevel >= 3) return 'Extra Hot';
  const [first] = item.tags;
  return first ? first[0].toUpperCase() + first.slice(1) : 'Top Pick';
}

export function ItemCard({
  item,
  index,
  onSelect,
  showFlag = true,
}: {
  item: MenuItem;
  /// Position within its section — the design numbers every card.
  index: number;
  onSelect: (item: MenuItem) => void;
  /// Off on the featured board, where every card is popular and the badge
  /// would just be noise.
  showFlag?: boolean;
}) {
  const saved = useIsSaved(item.id);
  const FallbackIcon = ICON_BY_TAG[fallbackTag(item)] ?? LuSoup;

  return (
    <article
      className={`dish-card${item.isAvailable ? '' : ' is-sold-out'}`}
      onClick={() => item.isAvailable && onSelect(item)}
    >
      <div className={`dish-art${item.imageUrl ? '' : ' dish-art-empty'}`}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" />
        ) : (
          <FallbackIcon className="glyph" aria-hidden="true" />
        )}
      </div>

      <div className="dish-scrim" aria-hidden="true" />

      <span className="dish-badge">{badgeLabel(item, showFlag)}</span>

      {!item.isAvailable && <span className="dish-sold">Sold out</span>}

      <button
        type="button"
        className={`dish-save${saved ? ' is-saved' : ''}`}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${item.name} from saved` : `Save ${item.name}`}
        onClick={(event) => {
          event.stopPropagation();
          toggleSaved(item.id);
        }}
      >
        <LuBookmark size={16} aria-hidden="true" />
      </button>

      <div className="dish-body">
        <span className="dish-index label">
          {String(index + 1).padStart(2, '0')}
        </span>

        <h3>{item.name}</h3>

        {item.description && <p className="dish-desc">{item.description}</p>}

        <div className="dish-meta">
          <span className="dish-price">{formatMoney(item.price)}</span>
          <span className="dish-facts">
            {item.prepMinutes} min
            {item.spiceLevel > 0 && (
              <span
                className="dish-heat"
                title={`Spice level ${item.spiceLevel} of 3`}
              >
                {Array.from({ length: item.spiceLevel }, (_, heat) => (
                  <LuFlame key={heat} size={13} aria-hidden="true" />
                ))}
              </span>
            )}
          </span>
        </div>

        {/* The label is the button on a desktop card; on a phone the same
            button shrinks to the disc the design puts beside the price. */}
        <button
          type="button"
          className="dish-add"
          disabled={!item.isAvailable}
          aria-label={
            item.isAvailable ? `Add ${item.name} to cart` : `${item.name} is sold out`
          }
          onClick={(event) => {
            event.stopPropagation();
            onSelect(item);
          }}
        >
          <span className="dish-add-label">
            {item.isAvailable ? 'Add to Cart' : 'Sold out today'}
          </span>
          <LuPlus className="dish-add-icon" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
