# Companies, stock exchange and manufacturers

[Game design index](../../GAME_DESIGN.md) · [Catalog](../../catalog.json) · [National economy](economy.md) · [Trade](trade-mechanics.md) · [Walk transport](../walk/transport.md) · [Release evidence](../../research/release-2.2.0.json)

> ID DOC-COMPANIES. Earth Simulator 2.2.0, Steam build 26710925. Static traces and controlled offline observations. [SRC-299, SRC-300, SRC-301, SRC-302]

## Formation and annual valuation

The company year pass reads available inventions, local production and export value. Each good contributes its share of priced local output plus half its share of export value. Sector weights also include services such as shipping, rail and air cargo lots from the preceding year, industry, city count, stability or military demand. Shipping requires access to a coast. The pass divides sector weights by their sum when it exceeds 1. Companies are eligible at a weight of 0.04 or higher. National quotas depend on era and share of world population, with separate sector limits for manufacturers. Ordinary founding can create at most two companies per nation per year. A company places its headquarters in the city of its most valuable relevant product when eligible, with the capital as fallback. [SRC-299]

National capitalisation starts from GDP × the era profit share × the price-to-profit factor. The era profit share rises from 0 in the earliest eras to 0.07 in the space era. The price-to-profit factor interpolates from 5 to 16 using stability, with war and golden-age modifiers. A company's target takes its sector's share of national capitalisation and weights it among local peers by the exponential of each company's log strength. Valuation closes 30% of the gap to target each year. Share price is valuation divided by issued shares. A price above 1,000 triggers a ten-for-one split. The annual dividend yield starts at 1% and can reach 6%, with higher strength improving it and positive growth reducing the increment. The Companies window shows the world index, company values, sectors and share information. [SRC-299]

Three successive years below 0.4 strength can bankrupt a company. An obsolete sector closes after eight years without positive weight. In each country and sector, the largest company can absorb the smallest at a 2% annual chance when the smaller valuation is below 40% of the larger. The exchange ratio uses their share prices at the merger. The corporation save section stores active and closed companies, the design registry, numerical sequences and the market index. [SRC-299]

## Ownership and Walk exchange

The company follows control of its headquarters on the annual pass. If the tile loses a valid owner, the company can move to its old nation's capital or close. Government and ideology define a state share and whether to nationalise all or specified strategic sectors. Nationalisation delists a listed company, sets the state's share to 100% and invalidates earlier player holdings when reconciled. A state enterprise can relist with a target state share of 30% or less where the new policy permits privatisation. [SRC-299, SRC-300]

The player can open the exchange from a broker or a merchant in a qualifying city. The nation's printing invention and a listed company are required. The player's holding is capped at 5% of issued shares and the amount available outside state ownership. Purchase uses the current stock price, converted through days of output and the venue's currency. The broker charges 1%, the merchant 2%. The game rounds cost up and proceeds down. A trade changes the character's wallet and portfolio. Corporate valuation, total issued shares and governing ownership continue on the company year pass. [SRC-300]

Reconciliation accounts for splits, merger exchanges, bankruptcies and nationalisation. It can pay out a fraction left after a merger conversion. Dividends use the current annual yield and the unpaid holding interval, limited to ten years and 120 days of output per visit across the portfolio. The holding year advances by the fraction paid, so revisiting does not repay the same interval. Payout is in the company's national currency. [SRC-300]

## Vehicle models

A manufacturer produces designs by vehicle class and invention tier. The design stores a stable ID, maker, generation, variant parts and dimensions. New generations arrive around a 22-year interval or when the available vehicle type changes. A superseded design can overlap its replacement for ten years, subject to the service-life limit. Vehicle selection weights domestic makers by value. A civilian model can use a foreign supplier even when a domestic manufacturer exists. Foreign supplier selection excludes states at war and favours nearby and allied manufacturers. [SRC-301]

Walk vehicles resolve the design from vehicle type, seed and nation and store its ID. Eligible 3D map trucks and aircraft resolve their manufacturer through the route origin or departure airport. They use selected design parts for shape and a company or airline palette for appearance. Existing add-on map models take precedence. [SRC-301]

## Offline observations

The build 26710925 fixture bootstrapped two modern economies and observed eleven passing checks. An aircraft maker supplied both the Walk design and a 3D map variant. A broker action opened the exchange. Buying 100 shares and selling five left 95, with one subsequent dividend payment. A split changed the holding to 950. Control followed a headquarters transfer. Nationalisation cleared the holding during reconciliation, privatisation relisted the company with a 5% state share, and the company and aircraft model survived reload. Natural establishment rates, multi-company merger chains, render appearance and connected rooms remain open. [SRC-302]
