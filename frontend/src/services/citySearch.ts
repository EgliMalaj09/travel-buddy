import { cities, type City } from '@/data/static/cities';
import { countries } from '@/data/static/countries';

/**
 * City search for "Where are you going?" (Create a trip, T2).
 * Today: the built-in city list (works offline). Mapbox Search plugs in here later,
 * with the built-in list kept as the offline fallback; screens do not change.
 */
export interface CitySearch {
  search(query: string): Promise<City[]>;
}

/** Lower case and without accents, so "fes" finds "Fès" and "cesky" finds "Český". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const countryNames = new Map(countries.map((c) => [c.code, fold(c.name)]));

export function createBuiltInCitySearch(list: City[] = cities): CitySearch {
  return {
    async search(query) {
      const q = fold(query);
      if (!q) return [];
      const starts: City[] = [];
      const contains: City[] = [];
      for (const city of list) {
        const name = fold(city.cityName);
        if (name.startsWith(q)) starts.push(city);
        else if (name.includes(q) || countryNames.get(city.countryCode)?.startsWith(q))
          contains.push(city);
      }
      return [...starts, ...contains].slice(0, 30);
    },
  };
}

export const citySearch: CitySearch = createBuiltInCitySearch();
