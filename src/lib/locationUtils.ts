// City name variations for fuzzy matching
const CITY_ALIASES: Record<string, string[]> = {
  // Switzerland
  geneva: ['geneve', 'genf', 'ginevra'],
  zurich: ['zürich', 'zurich', 'zurigo'],
  bern: ['berne', 'berna'],
  basel: ['basle', 'bâle', 'basilea'],
  lausanne: ['losanna'],
  lucerne: ['luzern', 'lucerna'],
  lugano: ['lugano'],
  winterthur: ['winterthour'],
  stgallen: ['st. gallen', 'st gallen', 'saint gallen', 'san gallo'],
  
  // Germany
  munich: ['münchen', 'munchen', 'muenchen'],
  cologne: ['köln', 'koln', 'koeln'],
  frankfurt: ['francfort', 'francoforte'],
  dusseldorf: ['düsseldorf', 'duesseldorf'],
  nuremberg: ['nürnberg', 'nuernberg'],
  
  // France
  paris: ['paris'],
  lyon: ['lyons', 'lione'],
  marseille: ['marseilles', 'marsiglia'],
  strasbourg: ['strassburg', 'strasburgo'],
  
  // Austria
  vienna: ['wien', 'vienne', 'viena'],
  
  // Italy
  milan: ['milano', 'mailand'],
  rome: ['roma', 'rom'],
  florence: ['firenze', 'florenz'],
  venice: ['venezia', 'venedig'],
  naples: ['napoli', 'neapel'],
  turin: ['torino'],
  
  // UK
  london: ['londres', 'londra'],
  
  // Netherlands
  amsterdam: ['amsterdam'],
  thehague: ['the hague', 'den haag', 'la haye'],
  
  // Belgium
  brussels: ['bruxelles', 'brussel', 'brüssel'],
  antwerp: ['antwerpen', 'anvers'],
};

// Build reverse lookup map
const ALIAS_TO_CANONICAL: Record<string, string> = {};
Object.entries(CITY_ALIASES).forEach(([canonical, aliases]) => {
  ALIAS_TO_CANONICAL[canonical.toLowerCase()] = canonical;
  aliases.forEach(alias => {
    ALIAS_TO_CANONICAL[alias.toLowerCase()] = canonical;
  });
});

/**
 * Normalize a city name to check for matches
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .trim();
}

/**
 * Get all variations of a search term for fuzzy city matching
 */
export function getCityVariations(searchTerm: string): string[] {
  const normalized = normalizeString(searchTerm);
  const variations = new Set<string>([normalized, searchTerm.toLowerCase()]);
  
  // Check if this is a known alias
  const canonical = ALIAS_TO_CANONICAL[normalized];
  if (canonical) {
    // Add the canonical name and all its aliases
    variations.add(canonical.toLowerCase());
    CITY_ALIASES[canonical]?.forEach(alias => {
      variations.add(alias.toLowerCase());
      variations.add(normalizeString(alias));
    });
  }
  
  // Also check partial matches in all aliases
  Object.entries(CITY_ALIASES).forEach(([canonical, aliases]) => {
    const allNames = [canonical, ...aliases];
    if (allNames.some(name => 
      normalizeString(name).includes(normalized) || 
      normalized.includes(normalizeString(name))
    )) {
      variations.add(canonical.toLowerCase());
      aliases.forEach(alias => {
        variations.add(alias.toLowerCase());
        variations.add(normalizeString(alias));
      });
    }
  });
  
  return Array.from(variations);
}

/**
 * Check if a city name matches the search query (with fuzzy matching)
 */
export function cityMatchesSearch(cityName: string, searchQuery: string): boolean {
  if (!searchQuery.trim()) return true;
  
  const normalizedCity = normalizeString(cityName);
  const normalizedQuery = normalizeString(searchQuery);
  
  // Direct match
  if (normalizedCity.includes(normalizedQuery)) return true;
  
  // Get all variations of the search query
  const variations = getCityVariations(searchQuery);
  
  // Check if city matches any variation
  return variations.some(variation => {
    const normalizedVariation = normalizeString(variation);
    return normalizedCity.includes(normalizedVariation) || 
           normalizedVariation.includes(normalizedCity);
  });
}

/**
 * Generic industry terms that shouldn't restrict search results.
 * If a query consists only of these (e.g. "barber shops", "salon near me"),
 * treat it as a browse-all query rather than a name/location filter.
 */
const GENERIC_SEARCH_TERMS = new Set([
  'barber', 'barbers', 'barbershop', 'barbershops',
  'shop', 'shops', 'salon', 'salons', 'studio', 'studios',
  'hair', 'haircut', 'haircuts', 'cut', 'cuts', 'fade', 'fades',
  'hairdresser', 'hairdressers', 'coiffeur', 'coiffure', 'friseur', 'parrucchiere',
  'beauty', 'grooming', 'near', 'me', 'nearme', 'nearby', 'in', 'the', 'a', 'best',
]);

/**
 * Remove generic industry terms from a normalized query, leaving only the
 * specific part (e.g. "zurich barber shop" -> "zurich").
 */
function stripGenericTerms(normalizedQuery: string): string {
  return normalizedQuery
    .split(/\s+/)
    .filter((token) => token && !GENERIC_SEARCH_TERMS.has(token))
    .join(' ')
    .trim();
}

/**
 * Filter function that checks both shop name and city with fuzzy matching
 */
export function barberMatchesSearch(
  shopName: string,
  city: string,
  searchQuery: string
): boolean {
  if (!searchQuery.trim()) return true;

  const normalizedQuery = normalizeString(searchQuery);
  const normalizedShopName = normalizeString(shopName);

  // Generic queries like "barber shops" or "salon near me" match everything
  const specificQuery = stripGenericTerms(normalizedQuery);
  if (!specificQuery) return true;

  // Check shop name (also space-insensitive so "barber shop" matches "Barbershop")
  if (normalizedShopName.includes(normalizedQuery)) return true;
  const compactShopName = normalizedShopName.replace(/\s+/g, '');
  if (compactShopName.includes(normalizedQuery.replace(/\s+/g, ''))) return true;
  if (
    normalizedShopName.includes(specificQuery) ||
    compactShopName.includes(specificQuery.replace(/\s+/g, ''))
  ) return true;

  // Check city with fuzzy matching (full query and its specific part)
  return cityMatchesSearch(city, searchQuery) || cityMatchesSearch(city, specificQuery);
}
