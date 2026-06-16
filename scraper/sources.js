/*
 * Listing pages on myneta.info to ingest.
 *
 *   category:    MP | MLA | STATE | DISTRICT — what bucket each candidate goes into
 *   state:       default state tag (used if the individual page doesn't expose it)
 *   listingUrl:  myneta.info page whose links go to candidate.php?candidate_id=...
 *
 * SCOPE: Lok Sabha 2024 + the most recent state assembly election for every state.
 *
 * URL FORMAT WARNING
 * ------------------
 * myneta.info's path conventions aren't perfectly uniform — the path prefix
 * for some states uses camelCase (`LokSabha2024`), others use lowercase
 * (`maharashtra2024`), and a few use abbreviations. The URLs below are my best
 * guess at the convention. Before running scrape.js, run:
 *
 *     node verify-sources.js
 *
 * It opens each listingUrl in a headless browser, reports whether the page
 * loaded and how many candidate links it found, and prints fix suggestions.
 * Edit any URL it flags before running scrape.js.
 *
 * All URLs use `subAction=winner_analyzed` so we get sitting members (winners),
 * not every contestant. Drop that param if you want all candidates.
 */

const winners = (slug) =>
  `https://myneta.info/${slug}/index.php?action=show_winners&sort=default`;

module.exports = [
  // ---- Lok Sabha 2024 — all 543 MPs ----
  { category: 'MP', state: '',                  listingUrl: winners('LokSabha2024') },

  // ---- Most recent state assembly elections — sitting MLAs ----
  { category: 'MLA', state: 'Andhra Pradesh',   listingUrl: winners('AndhraPradesh2024') },
  { category: 'MLA', state: 'Arunachal Pradesh',listingUrl: winners('ArunachalPradesh2024') },
  { category: 'MLA', state: 'Assam',            listingUrl: winners('assam2021') },
  { category: 'MLA', state: 'Bihar',            listingUrl: winners('bihar2020') },
  { category: 'MLA', state: 'Chhattisgarh',     listingUrl: winners('chhattisgarh2023') },
  { category: 'MLA', state: 'Delhi',            listingUrl: winners('delhi2025') },
  { category: 'MLA', state: 'Goa',              listingUrl: winners('goa2022') },
  { category: 'MLA', state: 'Gujarat',          listingUrl: winners('gujarat2022') },
  { category: 'MLA', state: 'Haryana',          listingUrl: winners('haryana2024') },
  { category: 'MLA', state: 'Himachal Pradesh', listingUrl: winners('himachalpradesh2022') },
  { category: 'MLA', state: 'Jammu & Kashmir',  listingUrl: winners('JammuKashmir2024') },
  { category: 'MLA', state: 'Jharkhand',        listingUrl: winners('jharkhand2024') },
  { category: 'MLA', state: 'Karnataka',        listingUrl: winners('karnataka2023') },
  { category: 'MLA', state: 'Kerala',           listingUrl: winners('kerala2021') },
  { category: 'MLA', state: 'Madhya Pradesh',   listingUrl: winners('madhyapradesh2023') },
  { category: 'MLA', state: 'Maharashtra',      listingUrl: winners('maharashtra2024') },
  { category: 'MLA', state: 'Manipur',          listingUrl: winners('manipur2022') },
  { category: 'MLA', state: 'Meghalaya',        listingUrl: winners('meghalaya2023') },
  { category: 'MLA', state: 'Mizoram',          listingUrl: winners('mizoram2023') },
  { category: 'MLA', state: 'Nagaland',         listingUrl: winners('nagaland2023') },
  { category: 'MLA', state: 'Odisha',           listingUrl: winners('odisha2024') },
  { category: 'MLA', state: 'Puducherry',       listingUrl: winners('puducherry2021') },
  { category: 'MLA', state: 'Punjab',           listingUrl: winners('punjab2022') },
  { category: 'MLA', state: 'Rajasthan',        listingUrl: winners('rajasthan2023') },
  { category: 'MLA', state: 'Sikkim',           listingUrl: winners('sikkim2024') },
  { category: 'MLA', state: 'Tamil Nadu',       listingUrl: winners('tamilnadu2021') },
  { category: 'MLA', state: 'Telangana',        listingUrl: winners('telangana2023') },
  { category: 'MLA', state: 'Tripura',          listingUrl: winners('tripura2023') },
  { category: 'MLA', state: 'Uttar Pradesh',    listingUrl: winners('UttarPradesh2022') },
  { category: 'MLA', state: 'Uttarakhand',      listingUrl: winners('uttarakhand2022') },
  { category: 'MLA', state: 'West Bengal',      listingUrl: winners('westbengal2021') },
];
