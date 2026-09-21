import type { IconType } from "react-icons";
import {
  LuCakeSlice,
  LuCoffee,
  LuCookie,
  LuCroissant,
  LuCupSoda,
  LuDrumstick,
  LuEgg,
  LuFish,
  LuSandwich,
  LuSoup,
  LuUtensils,
  LuWheat,
} from "react-icons/lu";
import type { Category } from "../lib/types";

/// A category has no icon in the database, so one is matched off its slug.
/// Anything unrecognised falls back to cutlery rather than an empty disc.
const ICON_BY_SLUG: { pattern: RegExp; icon: IconType }[] = [
  { pattern: /rice|swallow|grain/, icon: LuWheat },
  { pattern: /soup|stew/, icon: LuSoup },
  { pattern: /grill|chicken|meat|suya/, icon: LuDrumstick },
  { pattern: /fish|sea/, icon: LuFish },
  { pattern: /snack|small/, icon: LuCookie },
  { pattern: /drink|juice|smoothie/, icon: LuCupSoda },
  { pattern: /coffee|tea/, icon: LuCoffee },
  { pattern: /breakfast|egg/, icon: LuEgg },
  { pattern: /pastr|bread/, icon: LuCroissant },
  { pattern: /dessert|cake|sweet/, icon: LuCakeSlice },
  { pattern: /sandwich|shawarma|burger|wrap/, icon: LuSandwich },
];

function iconFor(category: Category): IconType {
  const key = `${category.slug} ${category.name}`.toLowerCase();
  return ICON_BY_SLUG.find(({ pattern }) => pattern.test(key))?.icon ?? LuUtensils;
}

/// The row of round category buttons under the banner. It scrolls sideways on
/// a phone and is the fastest way into a section of the menu.
export function CategoryRow({
  categories,
  onJump,
}: {
  categories: Category[];
  onJump: (slug: string) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <nav className="cat-row" aria-label="Categories">
      <div className="cat-row-track">
        {categories.map((category) => {
          const Icon = iconFor(category);
          return (
            <button
              key={category.id}
              type="button"
              className="cat-chip"
              onClick={() => onJump(category.slug)}
            >
              <span className="cat-chip-disc">
                {category.imageUrl ? (
                  <img src={category.imageUrl} alt="" loading="lazy" />
                ) : (
                  <Icon aria-hidden="true" />
                )}
              </span>
              <span className="cat-chip-name">{category.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
