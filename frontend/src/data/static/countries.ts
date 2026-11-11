/**
 * Static country and currency data shipped with the app (A13: our own file, no library).
 * Names come from the phone's built-in Intl data, so they need no translation files.
 * Format: "COUNTRY:CURRENCY" (ISO 3166-1 alpha-2 : ISO 4217). Update via AppConfig.staticDataVersion later.
 */
const RAW =
  'AD:EUR AE:AED AF:AFN AG:XCD AI:XCD AL:ALL AM:AMD AO:AOA AR:ARS AS:USD AT:EUR AU:AUD AW:AWG AX:EUR AZ:AZN ' +
  'BA:BAM BB:BBD BD:BDT BE:EUR BF:XOF BG:BGN BH:BHD BI:BIF BJ:XOF BL:EUR BM:BMD BN:BND BO:BOB BQ:USD BR:BRL ' +
  'BS:BSD BT:BTN BW:BWP BY:BYN BZ:BZD CA:CAD CC:AUD CD:CDF CF:XAF CG:XAF CH:CHF CI:XOF CK:NZD CL:CLP CM:XAF ' +
  'CN:CNY CO:COP CR:CRC CU:CUP CV:CVE CW:XCG CX:AUD CY:EUR CZ:CZK DE:EUR DJ:DJF DK:DKK DM:XCD DO:DOP DZ:DZD ' +
  'EC:USD EE:EUR EG:EGP EH:MAD ER:ERN ES:EUR ET:ETB FI:EUR FJ:FJD FK:FKP FM:USD FO:DKK FR:EUR GA:XAF GB:GBP ' +
  'GD:XCD GE:GEL GF:EUR GG:GBP GH:GHS GI:GIP GL:DKK GM:GMD GN:GNF GP:EUR GQ:XAF GR:EUR GT:GTQ GU:USD GW:XOF ' +
  'GY:GYD HK:HKD HN:HNL HR:EUR HT:HTG HU:HUF ID:IDR IE:EUR IL:ILS IM:GBP IN:INR IO:USD IQ:IQD IR:IRR IS:ISK ' +
  'IT:EUR JE:GBP JM:JMD JO:JOD JP:JPY KE:KES KG:KGS KH:KHR KI:AUD KM:KMF KN:XCD KP:KPW KR:KRW KW:KWD KY:KYD ' +
  'KZ:KZT LA:LAK LB:LBP LC:XCD LI:CHF LK:LKR LR:LRD LS:LSL LT:EUR LU:EUR LV:EUR LY:LYD MA:MAD MC:EUR MD:MDL ' +
  'ME:EUR MF:EUR MG:MGA MH:USD MK:MKD ML:XOF MM:MMK MN:MNT MO:MOP MP:USD MQ:EUR MR:MRU MS:XCD MT:EUR MU:MUR ' +
  'MV:MVR MW:MWK MX:MXN MY:MYR MZ:MZN NA:NAD NC:XPF NE:XOF NF:AUD NG:NGN NI:NIO NL:EUR NO:NOK NP:NPR NR:AUD ' +
  'NU:NZD NZ:NZD OM:OMR PA:PAB PE:PEN PF:XPF PG:PGK PH:PHP PK:PKR PL:PLN PM:EUR PN:NZD PR:USD PS:ILS PT:EUR ' +
  'PW:USD PY:PYG QA:QAR RE:EUR RO:RON RS:RSD RU:RUB RW:RWF SA:SAR SB:SBD SC:SCR SD:SDG SE:SEK SG:SGD SH:SHP ' +
  'SI:EUR SJ:NOK SK:EUR SL:SLE SM:EUR SN:XOF SO:SOS SR:SRD SS:SSP ST:STN SV:USD SX:XCG SY:SYP SZ:SZL TC:USD ' +
  'TD:XAF TG:XOF TH:THB TJ:TJS TK:NZD TL:USD TM:TMT TN:TND TO:TOP TR:TRY TT:TTD TV:AUD TW:TWD TZ:TZS UA:UAH ' +
  'UG:UGX US:USD UY:UYU UZ:UZS VA:EUR VC:XCD VE:VES VG:USD VI:USD VN:VND VU:VUV WF:XPF WS:WST XK:EUR YE:YER ' +
  'YT:EUR ZA:ZAR ZM:ZMW ZW:ZWG';

export interface Country {
  code: string;
  name: string;
  currencyCode: string;
}

export interface Currency {
  code: string;
  name: string;
}

function displayName(type: 'region' | 'currency', code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const countries: Country[] = RAW.split(' ')
  .map((pair) => {
    const [code = '', currencyCode = ''] = pair.split(':');
    return { code, currencyCode, name: displayName('region', code) };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

export const currencies: Currency[] = [...new Set(countries.map((c) => c.currencyCode))]
  .map((code) => ({ code, name: displayName('currency', code) }))
  .sort((a, b) => a.code.localeCompare(b.code));

export function findCountry(code: string | undefined): Country | undefined {
  return countries.find((c) => c.code === code);
}

export function currencyForCountry(code: string | undefined): string | undefined {
  return findCountry(code)?.currencyCode;
}

/** Best guess for the phone's country, e.g. "AL" from locale "sq-AL". */
export function deviceCountry(): string | undefined {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = locale.split('-').find((part) => /^[A-Z]{2}$/.test(part));
    return findCountry(region)?.code;
  } catch {
    return undefined;
  }
}
