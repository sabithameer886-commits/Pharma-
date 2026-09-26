import { MedicineType } from '../types';

export interface PackUnitInfo {
  count: number;
  unitLabel: string;
  isSplittable: boolean;
  packDescription: string;
}

/**
 * Parses packaging size strings (e.g., "10 Tablets / Strip", "15 Capsules", "5 Tablets", "100ml Bottle")
 * to determine the number of individual dispensable units (tablets/capsules).
 */
export function parsePackUnits(packSize?: string, type?: MedicineType): PackUnitInfo {
  const raw = (packSize || '').trim();
  const lower = raw.toLowerCase();

  const isTablet = type === 'Tablet' || lower.includes('tablet') || lower.includes('tab');
  const isCapsule = type === 'Capsule' || lower.includes('capsule') || lower.includes('cap');
  const isSplittable = isTablet || isCapsule;
  const unitLabel = isCapsule ? 'Capsule' : isTablet ? 'Tablet' : 'Unit';

  if (!raw) {
    return {
      count: isSplittable ? 10 : 1,
      unitLabel,
      isSplittable,
      packDescription: isSplittable ? '10 Units / Pack' : '1 Unit',
    };
  }

  // Look for patterns like "10 Tablets", "15 Tablets / Strip", "10's", "1x10", "10 x 10", "14 Tabs", "20 Capsules"
  const patterns = [
    /(\d+)\s*(?:tablets?|capsules?|tabs?|caps?)/i,
    /(\d+)\s*['’]s/i,
    /1\s*[xX*]\s*(\d+)/i,
    /(\d+)\s*[xX*]\s*(\d+)/i,
    /(\d+)\s*\/\s*(?:strip|pack|box|blister)/i,
    /pack\s*(?:of)?\s*(\d+)/i,
    /strip\s*(?:of)?\s*(\d+)/i,
  ];

  for (const regex of patterns) {
    const match = raw.match(regex);
    if (match) {
      if (regex.source.includes('[xX*]') && match[2]) {
        // e.g. 10 x 10 or 1 x 10
        const parsed = parseInt(match[2], 10);
        if (parsed > 0 && parsed <= 500) {
          return {
            count: parsed,
            unitLabel,
            isSplittable,
            packDescription: raw,
          };
        }
      } else {
        const parsed = parseInt(match[1], 10);
        if (parsed > 0 && parsed <= 500) {
          return {
            count: parsed,
            unitLabel,
            isSplittable,
            packDescription: raw,
          };
        }
      }
    }
  }

  // Pure number check (e.g. "10", "15")
  const numOnlyMatch = raw.match(/^(\d+)$/);
  if (numOnlyMatch) {
    const parsed = parseInt(numOnlyMatch[1], 10);
    if (parsed > 0) {
      return {
        count: parsed,
        unitLabel,
        isSplittable,
        packDescription: `${parsed} ${unitLabel}s / Strip`,
      };
    }
  }

  // Default fallback
  const defaultCount = isSplittable ? 10 : 1;
  return {
    count: defaultCount,
    unitLabel,
    isSplittable,
    packDescription: raw || `${defaultCount} ${unitLabel}s / Strip`,
  };
}

/**
 * Calculates per-tablet or per-unit price based on pack MRP and units per pack.
 * Rounds to 2 decimal places.
 */
export function getPerUnitPrice(packMrp: number, packUnits: number): number {
  if (!packMrp || packMrp <= 0) return 0;
  const units = Math.max(1, packUnits || 1);
  return Math.round((packMrp / units) * 100) / 100;
}

/**
 * Formats inventory stock into human-readable strips + loose tablets breakdown.
 * Example: 9.8 packs of 10-tablets => "9 Strips + 8 Tablets (98 tabs)"
 */
export function formatStockWithLooseUnits(
  stockQuantity: number,
  packSize?: string,
  type?: MedicineType
): {
  displayText: string;
  shortText: string;
  totalTablets: number;
  fullStrips: number;
  looseTablets: number;
  isSplittable: boolean;
} {
  const { count: packUnits, unitLabel, isSplittable } = parsePackUnits(packSize, type);

  if (!isSplittable || packUnits <= 1) {
    const rounded = Math.round(stockQuantity);
    return {
      displayText: `${rounded} ${unitLabel}${rounded === 1 ? '' : 's'}`,
      shortText: `${rounded} ${unitLabel[0]}`,
      totalTablets: rounded,
      fullStrips: rounded,
      looseTablets: 0,
      isSplittable: false,
    };
  }

  // Stock can be stored as packs (e.g. 50 or 49.7) or total tablets (if user treated it as tablets)
  // In our system, batches are stored in strips/packs (e.g., 50 strips).
  // A deduction of 3 tablets from a 10-pack strip gives 50 - 0.3 = 49.7 strips.
  const fullStrips = Math.floor(Math.max(0, stockQuantity));
  const fractional = Math.max(0, stockQuantity - fullStrips);
  const looseTablets = Math.round(fractional * packUnits);
  const totalTablets = fullStrips * packUnits + looseTablets;

  let displayText = '';
  if (fullStrips > 0 && looseTablets > 0) {
    displayText = `${fullStrips} Strips + ${looseTablets} ${unitLabel}${looseTablets > 1 ? 's' : ''} (${totalTablets} total)`;
  } else if (fullStrips > 0) {
    displayText = `${fullStrips} Strips (${totalTablets} ${unitLabel}s)`;
  } else if (looseTablets > 0) {
    displayText = `${looseTablets} Loose ${unitLabel}${looseTablets > 1 ? 's' : ''}`;
  } else {
    displayText = `0 Strips (Out of stock)`;
  }

  const shortText =
    fullStrips > 0 && looseTablets > 0
      ? `${fullStrips}s + ${looseTablets}t`
      : fullStrips > 0
      ? `${fullStrips} Strips`
      : `${looseTablets} Tabs`;

  return {
    displayText,
    shortText,
    totalTablets,
    fullStrips,
    looseTablets,
    isSplittable: true,
  };
}
