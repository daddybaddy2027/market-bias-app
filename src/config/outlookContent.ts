export type OutlookSection = {
  key:
    | "market_regime"
    | "currency_outlook"
    | "main_drivers"
    | "important_events"
    | "pair_of_the_week"
    | "technical_structure"
    | "base_scenario"
    | "alternative_scenario"
    | "invalidation";
  title: string;
  body: string;
};

export type TechnicalFundamentalOutlook = {
  id: string;
  title: string;
  author: string;
  publishedAt: string;
  preview: string[];
  sections: OutlookSection[];
};

export const OUTLOOK_STRUCTURE = [
  "Title — Fundamental and Technical Outlook",
  "Author",
  "Published date",
  "Market regime",
  "USD / EUR / GBP / JPY outlook",
  "Main drivers",
  "Important events",
  "Pair of the week",
  "Technical structure",
  "Base scenario",
  "Alternative scenario",
  "Invalidation",
] as const;

export const OUTLOOKS: TechnicalFundamentalOutlook[] = [
  {
    id: "launch-preview",
    title: "Fundamental and Technical Outlook",
    author: "Bongani Mantjate",
    publishedAt: "2026-07-27T12:00:00+02:00",
    preview: [
      "A structured weekly view of the macro environment, monetary-policy expectations and the technical setup behind the main FX pairs.",
      "Each outlook explains the base case, the main risks and the conditions that would invalidate the view.",
    ],
    sections: [
      {
        key: "market_regime",
        title: "Market regime",
        body: "The full weekly market-regime assessment will appear here after publication.",
      },
      {
        key: "currency_outlook",
        title: "USD / EUR / GBP / JPY outlook",
        body: "Relative currency outlooks will describe the key monetary-policy and sentiment differences across the main currencies.",
      },
      {
        key: "main_drivers",
        title: "Main drivers",
        body: "The analysis will connect rates, inflation, labour data, oil, yields, geopolitics, risk sentiment and cross-asset flows.",
      },
      {
        key: "important_events",
        title: "Important events",
        body: "The weekly schedule will highlight the events most likely to change the current market view.",
      },
      {
        key: "pair_of_the_week",
        title: "Pair of the week",
        body: "One main FX pair will be selected for a deeper fundamental and technical review.",
      },
      {
        key: "technical_structure",
        title: "Technical structure",
        body: "Technical structure will be used to define context, confirmation, invalidation and possible execution areas.",
      },
      {
        key: "base_scenario",
        title: "Base scenario",
        body: "The most likely scenario will be explained together with the evidence supporting it.",
      },
      {
        key: "alternative_scenario",
        title: "Alternative scenario",
        body: "A credible alternative path will be included when the market can reasonably develop in more than one direction.",
      },
      {
        key: "invalidation",
        title: "Invalidation",
        body: "Every outlook will explain what would make the original thesis no longer valid.",
      },
    ],
  },
];
