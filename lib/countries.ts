export const COUNTRIES = {
  DE: {
    name: "Germany",
    flag: "🇩🇪",
    region: "Europe",
    newsQuery: "Germany politics economy",
    economicSource: "ecb",
    wbCode: "DEU",
  },
  GB: {
    name: "United Kingdom",
    flag: "🇬🇧",
    region: "Europe",
    newsQuery: "United Kingdom economy politics",
    economicSource: "worldbank",
    wbCode: "GBR",
  },
  AE: {
    name: "United Arab Emirates",
    flag: "🇦🇪",
    region: "Middle East",
    newsQuery: "UAE economy Dubai politics",
    economicSource: "worldbank",
    wbCode: "ARE",
  },
  US: {
    name: "United States",
    flag: "🇺🇸",
    region: "Global",
    newsQuery: "US economy Federal Reserve policy",
    economicSource: "fred",
    wbCode: "USA",
  },
  RU: {
    name: "Russia",
    flag: "🇷🇺",
    region: "Global",
    newsQuery: "Russia economy sanctions geopolitics",
    economicSource: "worldbank",
    wbCode: "RUS",
  },
} as const;

export type CountryCode = keyof typeof COUNTRIES;

export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];
