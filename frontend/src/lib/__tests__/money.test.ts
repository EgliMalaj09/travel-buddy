import { amountText, convertMinor, formatMoney, minorUnits, parseAmount } from '../money';

describe('money in minor units (KAN-42)', () => {
  it('knows the decimals of each currency', () => {
    expect(minorUnits('EUR')).toBe(2);
    expect(minorUnits('JPY')).toBe(0);
    expect(minorUnits('KWD')).toBe(3);
  });

  it('reads what people type, with dots or commas', () => {
    expect(parseAmount('12.5', 'EUR')).toBe(1250);
    expect(parseAmount('12,50', 'EUR')).toBe(1250);
    expect(parseAmount(' 1 200 ', 'EUR')).toBe(120000);
    expect(parseAmount('1,200', 'EUR')).toBe(120000);
    expect(parseAmount('1.200', 'EUR')).toBe(120000);
    expect(parseAmount('1,200.50', 'EUR')).toBe(120050);
    expect(parseAmount('1.200,50', 'EUR')).toBe(120050);
    expect(parseAmount('.5', 'EUR')).toBe(50);
    expect(parseAmount('1500', 'JPY')).toBe(1500);
    expect(parseAmount('1.250', 'KWD')).toBe(1250);
    // A 2-decimal currency never has 3 decimals: the dot groups thousands.
    expect(parseAmount('12.345', 'EUR')).toBe(1234500);
  });

  it('refuses amounts that are not positive or have too many decimals', () => {
    for (const bad of ['', '0', '0.00', '-5', 'abc', '1.234.5', '12.3456', '1,2,3']) {
      expect(parseAmount(bad, 'EUR')).toBeNull();
    }
    expect(parseAmount('15.5', 'JPY')).toBeNull();
    expect(parseAmount('99999999999999', 'EUR')).toBeNull();
  });

  it('turns minor units back into the field text', () => {
    expect(amountText(1250, 'EUR')).toBe('12.50');
    expect(amountText(5, 'EUR')).toBe('0.05');
    expect(amountText(1500, 'JPY')).toBe('1500');
    expect(amountText(1250, 'KWD')).toBe('1.250');
  });

  it('formats with the currency', () => {
    expect(formatMoney(1250, 'EUR')).toBe('€12.50');
    expect(formatMoney(150000, 'JPY')).toBe('JP¥150,000');
    expect(formatMoney(20000, 'MAD')).toContain('200.00');
  });

  it('converts with the rates of the day, rounded to the home minor units', () => {
    const rates = { MAD: 10.5, ALL: 97.25, JPY: 160 };
    // 200 MAD → 19.047619 EUR → 1852.38 ALL
    expect(convertMinor(20000, 'MAD', 'ALL', rates)).toBe(185238);
    expect(convertMinor(20000, 'MAD', 'EUR', rates)).toBe(1905);
    expect(convertMinor(1000, 'EUR', 'JPY', rates)).toBe(1600);
    expect(convertMinor(1600, 'JPY', 'EUR', rates)).toBe(1000);
    expect(convertMinor(1234, 'MAD', 'MAD', undefined)).toBe(1234);
    expect(convertMinor(1234, 'MAD', 'EUR', undefined)).toBeNull();
    expect(convertMinor(1234, 'XYZ', 'EUR', rates)).toBeNull();
  });
});
