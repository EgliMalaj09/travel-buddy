/**
 * A small built-in list of popular cities, used for the city search until Mapbox Search
 * is connected (T2), and as the offline fallback. Format: "City|COUNTRY|lat|lng".
 * Positions are city centres, rounded.
 */
const RAW = `Tirana|AL|41.3275|19.8187
Durrës|AL|41.3231|19.4414
Vlorë|AL|40.4661|19.4914
Sarandë|AL|39.8756|20.0053
Shkodër|AL|42.0693|19.5033
Berat|AL|40.7058|19.9522
Gjirokastër|AL|40.0758|20.1389
Korçë|AL|40.6186|20.7808
Himarë|AL|40.1017|19.7447
Ksamil|AL|39.7686|20.0006
Prishtina|XK|42.6629|21.1655
Prizren|XK|42.2139|20.7397
Podgorica|ME|42.4304|19.2594
Kotor|ME|42.4247|18.7712
Budva|ME|42.2911|18.8403
Skopje|MK|41.9981|21.4254
Ohrid|MK|41.1172|20.8019
Belgrade|RS|44.7866|20.4489
Novi Sad|RS|45.2671|19.8335
Sarajevo|BA|43.8563|18.4131
Mostar|BA|43.3438|17.8078
Zagreb|HR|45.8150|15.9819
Split|HR|43.5081|16.4402
Dubrovnik|HR|42.6507|18.0944
Zadar|HR|44.1194|15.2314
Ljubljana|SI|46.0569|14.5058
Bled|SI|46.3683|14.1146
Athens|GR|37.9838|23.7275
Thessaloniki|GR|40.6401|22.9444
Santorini|GR|36.3932|25.4615
Mykonos|GR|37.4467|25.3289
Corfu|GR|39.6243|19.9217
Crete (Heraklion)|GR|35.3387|25.1442
Rhodes|GR|36.4341|28.2176
Istanbul|TR|41.0082|28.9784
Antalya|TR|36.8969|30.7133
Cappadocia (Göreme)|TR|38.6431|34.8289
Izmir|TR|38.4237|27.1428
Sofia|BG|42.6977|23.3219
Plovdiv|BG|42.1354|24.7453
Bucharest|RO|44.4268|26.1025
Cluj-Napoca|RO|46.7712|23.6236
Rome|IT|41.9028|12.4964
Florence|IT|43.7696|11.2558
Venice|IT|45.4408|12.3155
Milan|IT|45.4642|9.1900
Naples|IT|40.8518|14.2681
Bologna|IT|44.4949|11.3426
Turin|IT|45.0703|7.6869
Verona|IT|45.4384|10.9916
Pisa|IT|43.7228|10.4017
Bari|IT|41.1171|16.8719
Palermo|IT|38.1157|13.3615
Catania|IT|37.5079|15.0830
Amalfi|IT|40.6340|14.6027
Sorrento|IT|40.6263|14.3758
Como|IT|45.8081|9.0852
Cagliari|IT|39.2238|9.1217
Valletta|MT|35.8989|14.5146
Paris|FR|48.8566|2.3522
Nice|FR|43.7102|7.2620
Lyon|FR|45.7640|4.8357
Marseille|FR|43.2965|5.3698
Bordeaux|FR|44.8378|-0.5792
Strasbourg|FR|48.5734|7.7521
Chamonix|FR|45.9237|6.8694
Monaco|MC|43.7384|7.4246
Madrid|ES|40.4168|-3.7038
Barcelona|ES|41.3874|2.1686
Seville|ES|37.3891|-5.9845
Valencia|ES|39.4699|-0.3763
Granada|ES|37.1773|-3.5986
Málaga|ES|36.7213|-4.4214
Palma de Mallorca|ES|39.5696|2.6502
Ibiza|ES|38.9067|1.4206
Tenerife (Santa Cruz)|ES|28.4636|-16.2518
Bilbao|ES|43.2630|-2.9350
Lisbon|PT|38.7223|-9.1393
Porto|PT|41.1579|-8.6291
Faro|PT|37.0194|-7.9322
Funchal (Madeira)|PT|32.6669|-16.9241
London|GB|51.5072|-0.1276
Edinburgh|GB|55.9533|-3.1883
Manchester|GB|53.4808|-2.2426
Liverpool|GB|53.4084|-2.9916
Dublin|IE|53.3498|-6.2603
Amsterdam|NL|52.3676|4.9041
Rotterdam|NL|51.9244|4.4777
Brussels|BE|50.8503|4.3517
Bruges|BE|51.2093|3.2247
Luxembourg|LU|49.6116|6.1319
Berlin|DE|52.5200|13.4050
Munich|DE|48.1351|11.5820
Hamburg|DE|53.5511|9.9937
Frankfurt|DE|50.1109|8.6821
Cologne|DE|50.9375|6.9603
Dresden|DE|51.0504|13.7373
Vienna|AT|48.2082|16.3738
Salzburg|AT|47.8095|13.0550
Innsbruck|AT|47.2692|11.4041
Hallstatt|AT|47.5622|13.6493
Zurich|CH|47.3769|8.5417
Geneva|CH|46.2044|6.1432
Lucerne|CH|47.0502|8.3093
Interlaken|CH|46.6863|7.8632
Zermatt|CH|46.0207|7.7491
Prague|CZ|50.0755|14.4378
Český Krumlov|CZ|48.8127|14.3175
Budapest|HU|47.4979|19.0402
Bratislava|SK|48.1486|17.1077
Kraków|PL|50.0647|19.9450
Warsaw|PL|52.2297|21.0122
Gdańsk|PL|54.3520|18.6466
Copenhagen|DK|55.6761|12.5683
Stockholm|SE|59.3293|18.0686
Oslo|NO|59.9139|10.7522
Bergen|NO|60.3913|5.3221
Tromsø|NO|69.6492|18.9553
Helsinki|FI|60.1699|24.9384
Rovaniemi|FI|66.5039|25.7294
Reykjavík|IS|64.1466|-21.9426
Tallinn|EE|59.4370|24.7536
Riga|LV|56.9496|24.1052
Vilnius|LT|54.6872|25.2797
Nicosia|CY|35.1856|33.3823
Paphos|CY|34.7720|32.4297
Marrakesh|MA|31.6295|-7.9811
Fes|MA|34.0181|-5.0078
Chefchaouen|MA|35.1688|-5.2636
Casablanca|MA|33.5731|-7.5898
Cairo|EG|30.0444|31.2357
Hurghada|EG|27.2579|33.8116
Sharm El Sheikh|EG|27.9158|34.3300
Tunis|TN|36.8065|10.1815
Dubai|AE|25.2048|55.2708
Abu Dhabi|AE|24.4539|54.3773
Doha|QA|25.2854|51.5310
Tel Aviv|IL|32.0853|34.7818
Jerusalem|IL|31.7683|35.2137
Amman|JO|31.9454|35.9284
Petra (Wadi Musa)|JO|30.3285|35.4444
New York|US|40.7128|-74.0060
Los Angeles|US|34.0522|-118.2437
San Francisco|US|37.7749|-122.4194
Las Vegas|US|36.1699|-115.1398
Miami|US|25.7617|-80.1918
Chicago|US|41.8781|-87.6298
Washington|US|38.9072|-77.0369
Boston|US|42.3601|-71.0589
Toronto|CA|43.6532|-79.3832
Vancouver|CA|49.2827|-123.1207
Montreal|CA|45.5017|-73.5673
Mexico City|MX|19.4326|-99.1332
Cancún|MX|21.1619|-86.8515
Havana|CU|23.1136|-82.3666
Rio de Janeiro|BR|-22.9068|-43.1729
Buenos Aires|AR|-34.6037|-58.3816
Lima|PE|-12.0464|-77.0428
Cusco|PE|-13.5320|-71.9675
Tokyo|JP|35.6762|139.6503
Kyoto|JP|35.0116|135.7681
Osaka|JP|34.6937|135.5023
Seoul|KR|37.5665|126.9780
Beijing|CN|39.9042|116.4074
Shanghai|CN|31.2304|121.4737
Hong Kong|HK|22.3193|114.1694
Singapore|SG|1.3521|103.8198
Bangkok|TH|13.7563|100.5018
Phuket|TH|7.8804|98.3923
Chiang Mai|TH|18.7883|98.9853
Bali (Denpasar)|ID|-8.6705|115.2126
Kuala Lumpur|MY|3.1390|101.6869
Hanoi|VN|21.0278|105.8342
Ho Chi Minh City|VN|10.8231|106.6297
Delhi|IN|28.7041|77.1025
Mumbai|IN|19.0760|72.8777
Goa (Panaji)|IN|15.4909|73.8278
Malé|MV|4.1755|73.5093
Colombo|LK|6.9271|79.8612
Sydney|AU|-33.8688|151.2093
Melbourne|AU|-37.8136|144.9631
Auckland|NZ|-36.8485|174.7633
Cape Town|ZA|-33.9249|18.4241
Zanzibar|TZ|-6.1659|39.2026
Nairobi|KE|-1.2921|36.8219`;

export interface City {
  cityName: string;
  countryCode: string;
  lat: number;
  lng: number;
  /** Stable id for the built-in list; Mapbox ids replace it later. */
  geoProviderId: string;
}

export const cities: City[] = RAW.split('\n').map((line) => {
  const [cityName = '', countryCode = '', lat = '0', lng = '0'] = line.split('|');
  return {
    cityName,
    countryCode,
    lat: Number(lat),
    lng: Number(lng),
    geoProviderId: `builtin:${countryCode}:${cityName}`,
  };
});
