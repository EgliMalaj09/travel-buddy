import type {
  ChecklistReason,
  CountryCode,
  Flight,
  IsoDate,
  TaskCategory,
  Trip,
  TripStop,
} from '@/data/types';
import { findCountry as countryByCode } from '@/data/static/countries';

import { addDays } from './dates';

/**
 * The smart checklist rules (KAN-24, V1). The app makes the checklist on the phone from these,
 * so it works offline. V1 covers trips in Europe (releases.md: "rules the owner writes for European
 * destinations"); other countries get one "check the entry rules" item.
 *
 * Every entry-rule item links to an official page: rules change, and the screen says to check
 * official sources before travelling. The owner reviews the wording (KAN-26).
 *
 * Change the version when the rules change: the phone then updates the lists of planned trips.
 */
export const CHECKLIST_RULES_VERSION = '2026.11.1';

/** The day these rules and links were last checked. */
const CHECKED: IsoDate = '2026-11-12';

/** One item the rules want on the list. */
export interface ChecklistSuggestion {
  ruleId: string;
  title: string;
  notes: string | null;
  category: TaskCategory;
  reason: ChecklistReason;
  dueDate: IsoDate | null;
  sourceUrl: string | null;
  sourceCheckedAt: IsoDate | null;
  sortOrder: number;
}

export interface ChecklistContext {
  trip: Pick<
    Trip,
    'startDate' | 'endDate' | 'activities' | 'passportCountrySnapshot' | 'homeCurrencySnapshot'
  >;
  stops: Pick<TripStop, 'countryCode' | 'cityName' | 'nights'>[];
  flights: Pick<Flight, 'id'>[];
}

// --- Country groups (checked 12 Nov 2026) ---

const EU = new Set(
  'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' '),
);
/** EU + Iceland, Liechtenstein, Norway, Switzerland: free movement with an ID card, EHIC. */
const EEA_CH = new Set([...EU, 'IS', 'LI', 'NO', 'CH']);
/** Schengen area (Bulgaria and Romania fully since 1 Jan 2025). Not Ireland or Cyprus. */
const SCHENGEN = new Set(
  'AT BE BG HR CZ DK EE FI FR DE GR HU IS IT LV LI LT LU MT NL NO PL PT RO SK SI ES SE CH'.split(
    ' ',
  ),
);
/** ETIAS countries: Schengen plus Cyprus. */
const ETIAS = new Set([...SCHENGEN, 'CY']);
/**
 * Passports that visit Schengen without a visa for short stays (EU Regulation 2018/1806, Annex II,
 * main countries). Everyone else gets "check if you need a visa".
 */
const SCHENGEN_VISA_FREE = new Set(
  (
    'AD AE AG AL AR AU BA BB BN BR BS CA CL CO CR DM GB GD GE GT HK HN IL JP KI KN KR LC MC MD ' +
    'ME MH MK MO MU MX MY NI NR NZ PA PE PW PY RS SB SC SG SM SV TL TO TT TV TW UA US UY VA VC VU WS'
  ).split(' '),
);
/** Passports that need a UK ETA instead of a visa (the main ones; the rest: "check if you need a visa"). */
const UK_ETA = new Set([
  ...EEA_CH,
  ...'AD AG AR AU BB BN BR BS CA CL CR DM GD GT HK IL JP KI KN KR LC MC MH MO MU MX MY NI NR NZ PA PE PW PY SB SC SG SM TO TT TV TW US UY VA VC WS'.split(
    ' ',
  ),
]);
/** Countries in "Europe" for V1 (the rest get one generic entry-rules item). */
const EUROPE = new Set([
  ...EEA_CH,
  ...'GB AL BA ME MK RS XK MD UA AD MC SM VA TR GE AM AZ'.split(' '),
]);
/** Countries where cars need a motorway vignette (sticker or e-vignette). */
const VIGNETTE = new Set('AT CH CZ SK SI HU BG RO'.split(' '));
/** Type G plugs (UK style). */
const PLUG_G = new Set('GB IE MT CY'.split(' '));

// --- Official links ---

const LINKS = {
  euTravel: 'https://europa.eu/youreurope/citizens/travel/entry-exit/index_en.htm',
  etias: 'https://travel-europe.europa.eu/etias_en',
  ees: 'https://travel-europe.europa.eu/ees_en',
  schengenVisa:
    'https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy_en',
  ukEta: 'https://www.gov.uk/guidance/apply-for-an-electronic-travel-authorisation-eta',
  ukVisa: 'https://www.gov.uk/check-uk-visa',
  ehic: 'https://employment-social-affairs.ec.europa.eu/policies-and-activities/moving-working-europe/eu-social-security-coordination/european-health-insurance-card_en',
  roaming:
    'https://europa.eu/youreurope/citizens/consumers/internet-telecoms/mobile-roaming-costs/index_en.htm',
  driving:
    'https://europa.eu/youreurope/citizens/vehicles/driving-licence/driving-licence-recognition-validity/index_en.htm',
} as const;

const countryName = (code: CountryCode) => countryByCode(code)?.name ?? code;

const list = (names: string[]) =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

/** Lower-case letters, digits and dashes, for rule ids made from a name. */
const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

/**
 * The items the rules want for this trip, in list order. The same trip always gives the same
 * rule ids, so the phone can tell which items are new, still wanted, or no longer needed.
 */
export function checklistSuggestions({
  trip,
  stops,
  flights,
}: ChecklistContext): ChecklistSuggestion[] {
  const passport = trip.passportCountrySnapshot?.toUpperCase() || null;
  const due = (daysBefore: number) =>
    trip.startDate ? addDays(trip.startDate, -daysBefore) : null;
  const countries = [...new Set(stops.map((s) => s.countryCode.toUpperCase()).filter(Boolean))];
  const abroad = countries.filter((c) => c !== passport);
  const out: ChecklistSuggestion[] = [];
  const add = (
    s: Omit<
      ChecklistSuggestion,
      'sortOrder' | 'reason' | 'sourceCheckedAt' | 'notes' | 'sourceUrl'
    > &
      Partial<Pick<ChecklistSuggestion, 'reason' | 'notes' | 'sourceUrl'>>,
  ) =>
    out.push({
      reason: 'rule',
      notes: null,
      sourceUrl: null,
      ...s,
      sourceCheckedAt: s.sourceUrl ? CHECKED : null,
      sortOrder: (out.length + 1) * 10,
    });

  const passportEeaCh = !!passport && EEA_CH.has(passport);
  const nights = stops.reduce((n, s) => n + Math.max(0, s.nights), 0);

  // --- Documents ---
  if (abroad.length > 0) {
    const idCardEnough = passportEeaCh && abroad.every((c) => EEA_CH.has(c));
    add(
      idCardEnough
        ? {
            ruleId: 'id-document',
            title: 'Check your passport or ID card',
            notes: 'Inside the EU you can travel with a valid national ID card or passport.',
            category: 'documents',
            dueDate: due(60),
            sourceUrl: LINKS.euTravel,
          }
        : {
            ruleId: 'passport-valid',
            title: 'Check your passport is valid',
            notes: abroad.some((c) => SCHENGEN.has(c))
              ? 'For the Schengen area it must be valid 3 months after you leave and issued in the last 10 years.'
              : 'Check how long it must still be valid after your trip.',
            category: 'documents',
            dueDate: due(60),
            sourceUrl: LINKS.euTravel,
          },
    );
  }

  const nonEuInEtias = !!passport && !EEA_CH.has(passport) && abroad.some((c) => ETIAS.has(c));
  if (nonEuInEtias && SCHENGEN_VISA_FREE.has(passport)) {
    add({
      ruleId: 'etias',
      title: 'Check if you need ETIAS',
      notes:
        'ETIAS is the online travel permit for visa-free visitors to the Schengen area and Cyprus. Apply only on the official EU site.',
      category: 'documents',
      dueDate: due(30),
      sourceUrl: LINKS.etias,
    });
    add({
      ruleId: 'ees',
      title: 'Expect fingerprints and a photo at the border',
      notes:
        'The EU Entry/Exit System registers visitors from outside the EU at their first entry. Leave extra time.',
      category: 'documents',
      dueDate: due(1),
      sourceUrl: LINKS.ees,
    });
  } else if (nonEuInEtias) {
    add({
      ruleId: 'schengen-visa',
      title: 'Check if you need a Schengen visa',
      notes:
        'A visa can take weeks. Apply at the embassy of the country where you spend the most time.',
      category: 'documents',
      dueDate: due(90),
      sourceUrl: LINKS.schengenVisa,
    });
  }
  if (nonEuInEtias && nights > 90) {
    add({
      ruleId: 'schengen-90-days',
      title: 'Your trip is longer than 90 days',
      notes:
        'Visitors can stay up to 90 days in any 180 in the Schengen area. Check if you need a long-stay visa.',
      category: 'documents',
      dueDate: due(90),
      sourceUrl: LINKS.schengenVisa,
    });
  }

  if (abroad.includes('GB') && passport !== 'IE') {
    add(
      passport && UK_ETA.has(passport)
        ? {
            ruleId: 'uk-eta',
            title: 'Get a UK ETA',
            notes:
              'Most visitors who need no visa need an ETA for the UK. Apply on GOV.UK or the UK ETA app.',
            category: 'documents',
            dueDate: due(14),
            sourceUrl: LINKS.ukEta,
          }
        : {
            ruleId: 'uk-visa',
            title: 'Check if you need a UK visa',
            category: 'documents',
            dueDate: due(90),
            sourceUrl: LINKS.ukVisa,
          },
    );
  }

  for (const c of abroad.filter((x) => !EUROPE.has(x))) {
    add({
      ruleId: `entry-${c.toLowerCase()}`,
      title: `Check the entry rules for ${countryName(c)}`,
      notes:
        "Look at your government's travel advice and the embassy's site for visas and vaccines.",
      category: 'documents',
      dueDate: due(60),
    });
  }

  // --- Health ---
  if (abroad.length > 0) {
    add({
      ruleId: 'travel-insurance',
      title: 'Get travel insurance',
      notes:
        nonEuInEtias && !SCHENGEN_VISA_FREE.has(passport!) ? 'A Schengen visa needs it.' : null,
      category: 'health',
      dueDate: due(30),
    });
  }
  if (passportEeaCh && abroad.some((c) => EEA_CH.has(c))) {
    add({
      ruleId: 'ehic',
      title: 'Bring your European Health Insurance Card',
      notes:
        'It covers needed public healthcare in the EU, Iceland, Liechtenstein, Norway and Switzerland.',
      category: 'health',
      dueDate: due(14),
      sourceUrl: LINKS.ehic,
    });
  }
  add({
    ruleId: 'medicines',
    title: 'Check your medicines and prescriptions',
    category: 'health',
    dueDate: due(7),
  });

  // --- Money ---
  const currencies = [
    ...new Set(abroad.map((c) => countryByCode(c)?.currencyCode).filter((x): x is string => !!x)),
  ].filter((cur) => cur !== trip.homeCurrencySnapshot);
  if (currencies.length > 0) {
    add({
      ruleId: 'currency',
      title: `Plan how you pay in ${list(currencies)}`,
      notes: 'Some cash for small places, and a card without fees abroad.',
      category: 'money',
      dueDate: due(7),
    });
  }
  if (abroad.length > 0) {
    add({
      ruleId: 'card-abroad',
      title: 'Check your bank card works abroad',
      category: 'money',
      dueDate: due(7),
    });
  }

  // --- Phone ---
  if (abroad.length > 0 && !(passportEeaCh && abroad.every((c) => EEA_CH.has(c)))) {
    add({
      ruleId: 'roaming',
      title: 'Check roaming or get an eSIM',
      notes: 'Roaming outside your home zone can be expensive.',
      category: 'phone',
      dueDate: due(7),
      sourceUrl: passportEeaCh ? LINKS.roaming : null,
    });
  }
  const needsPlugG = abroad.some((c) => PLUG_G.has(c)) && !(passport && PLUG_G.has(passport));
  const needsPlugEu =
    !!passport && PLUG_G.has(passport) && abroad.some((c) => EUROPE.has(c) && !PLUG_G.has(c));
  if (needsPlugG || needsPlugEu) {
    add({
      ruleId: 'plug-adapter',
      title: needsPlugG ? 'Get a UK-style plug adapter' : 'Get a European plug adapter',
      category: 'phone',
      dueDate: due(7),
    });
  }
  add({
    ruleId: 'offline-maps',
    title: 'Download offline maps',
    category: 'phone',
    dueDate: due(1),
  });

  // --- Transport ---
  if (flights.length > 0) {
    add({ ruleId: 'check-in', title: 'Check in online', category: 'transport', dueDate: due(1) });
    add({
      ruleId: 'airport-transfer',
      title: 'Plan how you get to the airport',
      category: 'transport',
      dueDate: due(1),
    });
  }
  if (trip.activities.includes('road_trip')) {
    if (passport && !EEA_CH.has(passport) && abroad.length > 0) {
      add({
        ruleId: 'driving-permit',
        title: 'Check if you need an International Driving Permit',
        category: 'transport',
        reason: 'activity',
        dueDate: due(30),
        sourceUrl: LINKS.driving,
      });
    }
    for (const c of countries.filter((x) => VIGNETTE.has(x))) {
      add({
        ruleId: `vignette-${c.toLowerCase()}`,
        title: `Buy a motorway vignette for ${countryName(c)}`,
        notes: 'Buy it only from the official seller. Fines are high without one.',
        category: 'transport',
        reason: 'activity',
        dueDate: due(1),
      });
    }
  }

  // --- Stay ---
  for (const s of stops.filter((x) => x.nights > 0 && x.cityName.trim())) {
    add({
      ruleId: `stay-${s.countryCode.toLowerCase()}-${slug(s.cityName)}`,
      title: `Book where you sleep in ${s.cityName.trim()}`,
      category: 'stay',
      dueDate: due(30),
    });
  }

  // --- Activities and home ---
  if (trip.activities.includes('skiing')) {
    add({
      ruleId: 'ski-pass',
      title: 'Book ski passes and gear',
      category: 'other',
      reason: 'activity',
      dueDate: due(14),
    });
  }
  if (trip.activities.includes('hiking')) {
    add({
      ruleId: 'hiking-plan',
      title: 'Check trails, huts and the weather',
      category: 'other',
      reason: 'activity',
      dueDate: due(3),
    });
  }
  add({
    ruleId: 'home-ready',
    title: 'Get home ready: plants, pets, mail',
    category: 'other',
    dueDate: due(3),
  });

  return out;
}
