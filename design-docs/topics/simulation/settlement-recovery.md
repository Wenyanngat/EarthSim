# Settlement recovery and landmarks

[Game design index](../../GAME_DESIGN.md) · [Catalog](../../catalog.json) · [City card](../society/cities.md) · [Disasters](disasters.md) · [Release evidence](../../research/release-2.2.0.json)

> ID DOC-SETTLEMENT-RECOVERY. Earth Simulator 2.2.0, Steam build 26710925. [SRC-304, SRC-305, SRC-307]

## Persistent ruins

The settlement model remembers building stock, visual era and appearance separately from current urban development. A disaster snapshots the pre-impact city and marks the cause at the affected site. Active ruin time begins once at least half of remembered stock is vacant and a minimum amount remains. The ruin keeps its cause, start year and initial damage level. Decay advances by material and elapsed years. Short-lived settlement stock can disappear, while an older non-tribal city can retain a visible mound. Ice sheets can hide the site. [SRC-304]

The annual update chooses among reoccupation, clearance, quarrying and decay. A healthy owner of the same visual era can reoccupy ruins through stage 2.5. Later eras and older ruins call for clearance. An owner from an earlier visual era slowly quarries younger ruins. A cold, contaminated, uninhabited or unowned site can remain in decay without clearance. At 5% vacancy or less, an occupied ruin ends its timer. Nearly empty, compatible sites can attract city placement. Stock settings leave the optional direct growth multiplier neutral. The ruins data supplies reports for map and Walk separately from current urban development. [SRC-304]

The offline fixture retained the original stock and cause after two earthquakes and after reload. At the same site, fresh ruins selected reoccupation and a controlled 50-year advance selected clearance. Returning to the original date and restoring used building stock emitted the restored event. Natural population and building recovery speed remain open. [SRC-307]

## Landmark construction and ownership

The registry tracks ten landmark types with era, invention and type-specific gates for AI foundation. The AI considers stability, city count, peace or war, existing projects and rarity. A player can commission an eligible known type in an owned city at the required era, with up to four records per tile and a check against duplicate live projects. Scenario and rivalry rules can lock the action. The annual step charges up to 25% of estimated annual tax income per project. Funding, stability and pace determine progress, with half speed during war. [SRC-305]

Landmarks keep their original builder when city control changes. Standing landmarks below half damage can contribute stability, happiness or GDP. Captured buildings give 70% of their regular benefit. Multiple contributions diminish by a factor of 0.7, with caps of 0.04 stability, 0.05 happiness and 0.08 GDP. Eligible landmarks can also shift nearby eligible cells toward the owner's culture or religion. [SRC-305]

Flooding, prolonged depopulation, severe damage or a nearby fresh crater can ruin completed buildings or abandon construction. Owners can repair standing buildings in stable peacetime. Non-ancient ruins may enter restoration and can expire. Ancient ruins are retained and can gain tourism value at 150 years. The registry saves type, stage, progress, builder, current owner and event history. [SRC-305]

In the offline fixture a theatre completed from a player order, spent 314.244 treasury units and added 0.02 happiness. After the city changed hands, the builder record remained and the new owner received 0.014. The landmark and its owner survived the save round trip. [SRC-307]
