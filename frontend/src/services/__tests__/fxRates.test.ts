import { clearFxCache, getFxRates, type FetchFx } from '../fxRates';

const at = (iso: string) => new Date(iso);

function fakeServer(answer: (date: string) => { rateDate: string | null; final: boolean }) {
  const calls: { dates: string[]; currencies: string[] }[] = [];
  const fetchFx: FetchFx = async (dates, currencies) => {
    calls.push({ dates, currencies });
    return dates.map((date) => {
      const a = answer(date);
      return {
        date,
        ...a,
        rates: a.rateDate ? Object.fromEntries(currencies.map((c) => [c, 10])) : {},
      };
    });
  };
  return { calls, fetchFx };
}

describe('exchange rates on the phone (KAN-42)', () => {
  beforeEach(() => clearFxCache());

  it('keeps a final day for good and does not ask again', async () => {
    const server = fakeServer((d) => ({ rateDate: d, final: true }));
    const first = await getFxRates(['2027-04-12'], ['MAD', 'ALL', 'EUR'], {
      now: at('2027-04-13T10:00:00Z'),
      fetchFx: server.fetchFx,
    });
    expect(first['2027-04-12']?.rates).toEqual({ ALL: 10, MAD: 10 });
    expect(server.calls).toEqual([{ dates: ['2027-04-12'], currencies: ['ALL', 'MAD'] }]);

    await getFxRates(['2027-04-12'], ['MAD'], {
      now: at('2028-01-01T00:00:00Z'),
      fetchFx: server.fetchFx,
    });
    expect(server.calls).toHaveLength(1);
  });

  it('asks again for a currency it does not have yet', async () => {
    const server = fakeServer((d) => ({ rateDate: d, final: true }));
    const opts = { now: at('2027-04-13T10:00:00Z'), fetchFx: server.fetchFx };
    await getFxRates(['2027-04-12'], ['MAD'], opts);
    const more = await getFxRates(['2027-04-12'], ['MAD', 'USD'], opts);
    expect(server.calls).toHaveLength(2);
    expect(more['2027-04-12']?.rates).toEqual({ MAD: 10, USD: 10 });
  });

  it('asks again for a not-final day after 6 hours', async () => {
    const server = fakeServer(() => ({ rateDate: '2027-04-12', final: false }));
    await getFxRates(['2027-04-13'], ['MAD'], {
      now: at('2027-04-13T01:00:00Z'),
      fetchFx: server.fetchFx,
    });
    await getFxRates(['2027-04-13'], ['MAD'], {
      now: at('2027-04-13T03:00:00Z'),
      fetchFx: server.fetchFx,
    });
    expect(server.calls).toHaveLength(1);
    await getFxRates(['2027-04-13'], ['MAD'], {
      now: at('2027-04-13T08:00:00Z'),
      fetchFx: server.fetchFx,
    });
    expect(server.calls).toHaveLength(2);
  });

  it('offline: gives what it kept, and waits a minute before asking again', async () => {
    const good = fakeServer((d) => ({ rateDate: d, final: true }));
    await getFxRates(['2027-04-12'], ['MAD'], {
      now: at('2027-04-13T10:00:00Z'),
      fetchFx: good.fetchFx,
    });

    let offlineCalls = 0;
    const offline: FetchFx = async () => {
      offlineCalls += 1;
      return null;
    };
    const result = await getFxRates(['2027-04-12', '2027-04-13'], ['MAD'], {
      now: at('2027-04-13T10:00:00Z'),
      fetchFx: offline,
    });
    expect(Object.keys(result)).toEqual(['2027-04-12']);
    await getFxRates(['2027-04-13'], ['MAD'], {
      now: at('2027-04-13T10:00:30Z'),
      fetchFx: offline,
    });
    expect(offlineCalls).toBe(1);
    await getFxRates(['2027-04-13'], ['MAD'], {
      now: at('2027-04-13T10:02:00Z'),
      fetchFx: offline,
    });
    expect(offlineCalls).toBe(2);
  });

  it('only EUR needs no call; a day with no rates is left out', async () => {
    const none = fakeServer(() => ({ rateDate: null, final: false }));
    expect(await getFxRates(['2027-04-12'], ['EUR'], { fetchFx: none.fetchFx })).toEqual({});
    expect(none.calls).toHaveLength(0);
    expect(await getFxRates(['2027-04-12'], ['MAD'], { fetchFx: none.fetchFx })).toEqual({});
  });

  it('a final day never goes back to a provisional answer', async () => {
    const final = fakeServer((d) => ({ rateDate: d, final: true }));
    await getFxRates(['2027-04-12'], ['MAD'], {
      now: at('2027-04-13T10:00:00Z'),
      fetchFx: final.fetchFx,
    });
    const provisional = fakeServer(() => ({ rateDate: '2027-04-10', final: false }));
    const result = await getFxRates(['2027-04-12'], ['MAD', 'USD'], {
      now: at('2027-04-13T10:00:00Z'),
      fetchFx: provisional.fetchFx,
    });
    expect(result['2027-04-12']?.rateDate).toBe('2027-04-12');
  });
});
