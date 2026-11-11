import { countries, currencies, currencyForCountry, findCountry } from '../countries';

describe('country list', () => {
  it('has the countries we need with their currency', () => {
    expect(countries.length).toBeGreaterThan(200);
    expect(findCountry('AL')?.currencyCode).toBe('ALL');
    expect(currencyForCountry('MA')).toBe('MAD');
    expect(currencyForCountry('IT')).toBe('EUR');
  });

  it('has each currency once', () => {
    const codes = currencies.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
