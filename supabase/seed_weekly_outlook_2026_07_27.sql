-- First reviewed Outlook publication supplied by Bongani Mantjate.
-- Upload the chart first to the private Storage bucket:
-- outlook-media/weekly-market-outlook-2026-07-27/gbpusd-4h.png
--
-- This seed preserves the author's supplied thesis and wording as closely as
-- possible while arranging it into the platform's standard section structure.

insert into public.macro_commentary (
  slug,
  title,
  author_name,
  published_at,
  preview_sentences,
  market_regime,
  currency_outlook,
  main_drivers,
  important_events,
  pair_of_the_week,
  technical_structure,
  base_scenario,
  alternative_scenario,
  invalidation,
  commentary_type,
  access_level,
  published,
  chart_image_path,
  chart_image_alt,
  chart_image_caption,
  updated_at
)
values (
  'weekly-market-outlook-2026-07-27',
  'Weekly Market Outlook',
  'Bongani Mantjate',
  '2026-07-27T18:00:00+02:00'::timestamptz,
  array[
    'This might turn out to be an interesting week in the market, with tension in the Middle East de-escalating and the Fed meeting on Wednesday widely expected to keep rates the same.',
    'The US dollar is facing pressure at the start of the week after Donald Trump halted strikes on Iran for two nights, while the US and Iran reportedly submitted formal responses to return to negotiations.'
  ],
  $outlook$
This might turn out to be an interesting week in the market, with tension in the Middle East de-escalating and the Fed meeting Wednesday widely expected to keep rates the same.

The US dollar is facing pressure at the start of the week after Donald Trump halted strikes on Iran for two nights. As per Al-Arabiya, the US and Iran have submitted formal responses to return to negotiations.

Oil prices gapped down more than 5% at the Monday open. The current environment is highly sensitive to energy-driven inflation, Treasury yields and expectations around the Federal Reserve.
$outlook$,
  $outlook$
The current sentiment is bearish for the US dollar against the G10 and precious metals. The sentiment can change because the week contains several market-moving events.

A hawkish Federal Reserve tone could support the dollar. A dovish tone would support continuation of the already weaker dollar. Better-than-expected German inflation could be positive for the EUR, while the Bank of England tone could become the catalyst GBPUSD needs to continue higher.

Australian inflation data can provide insight into the Reserve Bank of Australia's next move.
$outlook$,
  $outlook$
The main drivers are Middle East de-escalation, oil prices, energy-driven inflation, US Treasury yields, safe-haven demand and expectations around the Federal Reserve.

If a Middle East peace deal holds, this might add more pressure on the safe-haven status of the dollar. As an oil exporter, the US dollar can gain relative safe-haven support during high energy prices compared with oil-importing economies. Higher oil prices were also driving US Treasury yields higher and increasing expectations of tighter policy.
$outlook$,
  $outlook$
Wednesday: Federal Reserve rate decision. The current rate is expected to remain unchanged according to the FedWatch tool, but traders will watch the Fed Chair's tone and concerns about inflation.

Australia: inflation data that can give insight into the Reserve Bank of Australia's next move.

Thursday: Bank of England decision, with rates expected to remain unchanged. The tone could be the catalyst GBPUSD needs to continue the move up.

Other important events include German inflation, the US PCE price index, Q2 GDP and US jobless claims. These releases might fuel or reverse current dollar strength.
$outlook$,
  $outlook$
GBPUSD.

An interesting feature of GBPUSD right now is that the rate gap between the two currencies is very limited, which changes how the pair behaves because there is less rate differential pulling the pair in one direction. The pair may therefore become more sensitive to economic, political and geopolitical factors, UK sentiment and dollar firmness.
$outlook$,
  $outlook$
On the four-hour time frame, the pair has been respecting a trendline acting as resistance. With the dollar softening, the expected setup is a break of structure and an entry around 1.33645, targeting resistance near 1.35423.

The pair is also below the 200-candle exponential moving average. A break above it would signal additional buying pressure.
$outlook$,
  $outlook$
The base scenario is a bullish GBPUSD break of structure, with a possible entry around 1.33645 and a target near 1.35423. The setup depends on continued dollar softness and technical confirmation above resistance and the 200-period exponential moving average.
$outlook$,
  $outlook$
A hawkish Federal Reserve tone, renewed dollar firmness or failure to confirm the technical break would weaken the bullish GBPUSD scenario. A change in dollar sentiment would be important for managing or exiting the trade.
$outlook$,
  $outlook$
The weekly weaker-dollar thesis can be invalidated if Iran-related headlines change and oil starts pushing higher. It can also be invalidated if the Federal Reserve sounds worried about inflation or points to interest-rate hikes in the coming months.

For the GBPUSD trade setup, the stop loss is placed below support at 1.32929.
$outlook$,
  'weekly_outlook',
  'premium',
  true,
  'weekly-market-outlook-2026-07-27/gbpusd-4h.png',
  'GBPUSD four-hour technical chart with trendlines, entry, target and stop-loss levels',
  'GBPUSD 4h setup: proposed entry around 1.33645, target near 1.35423 and stop below 1.32929.',
  now()
)
on conflict (slug) do update
set
  title = excluded.title,
  author_name = excluded.author_name,
  published_at = excluded.published_at,
  preview_sentences = excluded.preview_sentences,
  market_regime = excluded.market_regime,
  currency_outlook = excluded.currency_outlook,
  main_drivers = excluded.main_drivers,
  important_events = excluded.important_events,
  pair_of_the_week = excluded.pair_of_the_week,
  technical_structure = excluded.technical_structure,
  base_scenario = excluded.base_scenario,
  alternative_scenario = excluded.alternative_scenario,
  invalidation = excluded.invalidation,
  commentary_type = excluded.commentary_type,
  access_level = excluded.access_level,
  published = excluded.published,
  chart_image_path = excluded.chart_image_path,
  chart_image_alt = excluded.chart_image_alt,
  chart_image_caption = excluded.chart_image_caption,
  updated_at = now();
