insert into public.scenarios (
  name,
  summary,
  region,
  urgency,
  development_stage,
  affected_sectors
)
select
  name,
  summary,
  region,
  urgency,
  development_stage,
  affected_sectors
from (
  values
    (
      'Strait of Hormuz Disruption',
      'Iran-US tensions creating risk of closure or restriction of the Strait of Hormuz, through which approximately 20% of global oil trade passes. Impacts LNG shipping, oil prices, and insurance costs for vessels in the Persian Gulf.',
      'Middle East',
      'high',
      'active',
      'energy, infrastructure, shipping, commodities'
    ),
    (
      'Russia Sanctions Enforcement Tightening',
      'Western governments tightening enforcement of sanctions on Russian oil exports, targeting shadow fleet operators and intermediary jurisdictions. Creates counterparty risk for commodity traders and financing exposure for firms with Russian-linked supply chains.',
      'Russia / Eastern Europe',
      'high',
      'escalating',
      'energy, private markets, commodities, finance'
    ),
    (
      'China Critical Minerals Export Controls',
      'China imposing export controls on critical minerals including gallium, germanium, graphite, and rare earths. Directly affects battery supply chains, semiconductor manufacturing, clean energy hardware, and defence-linked industries.',
      'China / Asia',
      'high',
      'active',
      'clean tech, energy transition, industrials, technology'
    ),
    (
      'EU-China Clean Tech De-risking and Tariffs',
      'European Union implementing tariffs and supply chain de-risking policies targeting Chinese solar panels, EVs, and clean energy components. Creates pricing disruption for European renewable energy projects and alters supply chain economics for energy-transition investors.',
      'Europe / China',
      'medium',
      'active',
      'energy transition, infrastructure, clean tech'
    ),
    (
      'European Gas Supply Disruption Risk',
      'Structural vulnerability in European gas supply following the loss of Russian pipeline gas. Price volatility driven by LNG import constraints, North African supply uncertainty, and storage fluctuations creates operational and financing risk for energy-exposed assets.',
      'Europe / Russia / North Africa',
      'medium',
      'active',
      'energy, infrastructure, industrials'
    ),
    (
      'US-China Technology and Semiconductor Controls',
      'Escalating US export controls on advanced semiconductors and AI hardware, combined with Chinese counter-restrictions. Affects technology supply chains, data centre development, and any business dependent on advanced computing hardware or Chinese manufacturing partners.',
      'US / China / Asia',
      'medium',
      'escalating',
      'technology, industrials, private markets, infrastructure'
    )
) as seed_scenarios (
  name,
  summary,
  region,
  urgency,
  development_stage,
  affected_sectors
)
where not exists (
  select 1
  from public.scenarios
);
