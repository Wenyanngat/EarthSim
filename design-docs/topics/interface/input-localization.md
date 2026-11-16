# Input, language and measurement units

[Game design](../../GAME_DESIGN.md) · [Catalog](../../catalog.json) · [Sources](../../SOURCES.md) · [Extraction evidence](../../research/extraction-input-access.json)

> ID: `DOC-INPUT-LOCALIZATION`. Reference build 2.1.4.

The game routes input through map, camera and walk contexts. Keyboard overrides, controller preferences, language and display units each have a separate local profile. [SRC-267–273]

## Map and walk hotkeys

| Context | Default actions |
| --- | --- |
| Map time and brush | Space toggles pause, S steps, plus and minus change speed, and brackets change brush size. |
| Map tools | Digits 1–0 select terrain, elevation, smoothing, water, temperature, precipitation, current, wind, population and eraser. I or Q selects inspection. |
| Map views and names | Tab switches 2D/3D. N picks a geographic label. B/T/H/C/W/G/P/E/Z select biome, temperature, humidity, currents, wind, politics, population, ecology or pollution. |
| Map windows and world | F2 opens statistics, L the chronicle, D people, V wars, F5 quick save and F9 quick load. R regenerates after a second press within 1.6 seconds. |
| 3D camera | W/S/A/D move and Q/E rotate. |
| Walking | W/S/A/D move, Shift runs, Space jumps, Ctrl or C crouches, E interacts and F handles vehicles. Digits 1–9 select weapons. J opens the journal and M the world map. |
| Vehicle aliases | Many vehicle, aircraft and tank actions share a canonical walk binding. Q is the independent vehicle horn action. |

Map actions run in the document handler. It treats F2, F5 and F9 before its general repeat and modifier rejection. F11 stays assigned to fullscreen. Walking uses window capture, updates held movement on repeat but skips repeated action dispatch. Registered walk module keys have a chance to consume an event before vehicle and common walk actions. The complete declaration tables below include the remaining default bindings and aliases. [SRC-267]

## Key changes

The binding editor accepts supported physical `KeyboardEvent.code` values. It leaves reserved keys such as Escape, F1 and F11 and mouse controls outside its configurable set. Keyboard remapping runs in window capture for keydown and keyup. It skips typing targets, Alt and Meta combinations and ordinary Ctrl chords outside walk mode. It tracks physical keys across keyup and uses a synthetic event when browser event properties cannot be patched. Capture consumes the next nonrepeat keydown. [SRC-268]

Conflicts are checked among canonical actions in the same context, including an unmoved action's alternate codes. The settings editor can exchange bindings, while the low-level setter validates and assigns a code. Overrides are stored under `earthsim.keys`. A same-context duplicate in an invalid stored profile resets the overrides. Settings can snapshot and restore edits. Shared aliases follow their canonical action. Movement alternates remain available through native key handling until the keys are assigned elsewhere. [SRC-268]

The 3D remap table gives camera overrides priority over a map remap on the same physical key. A fixture sending K with both overrides produced Space in 2D and W in 3D. These checks exercised event routing through the remapper. Rendered focus and what each game action does remain separate observations. [SRC-267, SRC-268, SRC-273]

## Controller

The Gamepad API supplies standard button and axis indices. Device identity changes the displayed Xbox, DualShock or DualSense labels. Input activity selects the primary pad, while devices already assigned to local co-op guests stay outside that primary assignment. Start has a fixed menu role. [Local co-op](../network/local-coop-rivalry.md) [SRC-269]

Walking with a live player and no blocking window uses walk controls. The left stick moves, the right stick looks and buttons dispatch the assigned actions. In UI mode the left stick moves a virtual cursor, A clicks, the directional pad snaps focus, and the right stick scrolls or controls the map camera. Separate binding groups cover foot, vehicle and map. [SRC-269]

The stick transformation returns zero inside a radial dead zone of 0.18 and scales the remaining magnitude linearly to 1 while preserving direction. Digital stick actions use the 0.35 threshold and trigger presses use 0.3. The triggers also have analog values. The controller editor waits for all buttons to release before it captures a new press. Back can combine with another button, or bind by itself on release. Capture times out after nine seconds. [SRC-269, SRC-273]

The `earthsim.gamepad` record stores enable state, cursor speed, look sensitivity, inversion and overrides for all three groups. Loading validates the resulting bindings against each group's defaults. A collision invalidates that group's stored overrides. The next tables retain the actual defaults and tuning values. [SRC-269, SRC-273]

## On-screen keyboard

The controller can open a keyboard for editable text, password, search, email, number, URL and telephone inputs and for text areas. Read-only and disabled fields are excluded. Steam's native keyboard is tried when available. A failed request falls back to the local keyboard if the same input is still focused. The Steam bridge's Big Picture and Deck requirements are documented in its platform trace. [Steam keyboard](../platform/steam.md) [SRC-265, SRC-270]

The local keyboard offers Latin, Cyrillic and accented layouts. Russian and Ukrainian start in Cyrillic. Inserting text replaces the selected range and moves the caret. Backspace removes the selection or the character before the caret. Fields without caret support append at the end. Input changes emit a bubbling input event, and Done emits change and synthetic Enter. On a pad, X deletes, Y inserts a space, Start finishes and B closes. [SRC-270]

## Language and fallback

There are 17 visible languages, including inline Russian and English. Fifteen dictionary files supply the others. The catalogue also defines a hidden pseudo-locale. A recognized `earthsim.lang` value takes precedence over the browser's preferred languages. Automatic matching handles simplified and traditional Chinese, Portuguese through the Brazilian variant, and Belarusian through Russian. Unmatched preferences fall back to English. Applying a new language stores the preference and reloads the page. [SRC-271]

The entry script loads the selected dictionary during parsing. In translated locales, the lookup uses Russian source text as the key. A contextual lookup adds the context separator and context to that key. Missing dictionaries or keys fall back to the supplied English text, then to Russian when the English text is absent. Format helpers replace numbered placeholders. Plural selection uses explicit Russian one/few/many rules or the locale's `Intl.PluralRules`. The chosen locale also supplies number and decimal formatting. [SRC-271]

Display translations and generated names use different paths. User-authored names are stored as literal state. The separate geography trace documents language-dependent generated names and places whose stored labels persist. [Names and geography](customization.md) [SRC-250–253, SRC-271]

## Measurement options

The defaults are Celsius and metric. The independent preferences `temp=f` and `len=us` select Fahrenheit and US units and persist in `earthsim.units`. These options format values for display. They leave the underlying simulation fields in their original units. [SRC-272]

| Display | Conversion and thresholds |
| --- | --- |
| Temperature | Absolute Fahrenheit is Celsius × 1.8 + 32. A temperature difference uses × 1.8 without an offset. |
| Precipitation | Millimeters ÷ 25.4 gives inches. |
| Elevation and length | Meters × 3.28084 gives feet. |
| Walking distance | In metric the display switches from meters to kilometers at 1,000 m. In US units it switches from feet to miles at 304.8 m and divides meters by 1609.344. |
| Speed | Kilometers per hour × 0.621371 gives miles per hour. The translated string filter also recognizes meters per second and converts with × 2.23694. |
| Mass | Metric tonnes × 1.10231 gives US short tons. |

Direct formatting helpers round values for their display. The translation hook can also convert supported unit strings in translated labels, using the Russian source as the eligibility key. Applying unit settings updates these formatters and the selected map layer. [SRC-272, SRC-273]

## Verification

The isolated checks executed the five modules with browser, event and device adapters. They covered remap priorities and corrupt preferences, controller axes and chords, text editing and native fallback, registration of all dictionary files, translation fallback, plural forms and conversion boundaries. Full gameplay dispatch, actual hardware, the Steam keyboard and rendered layout across languages remain open. [SRC-273]

## Complete keyboard defaults and aliases

| Action | Display group | Input context | Default | Alternate codes | Uses binding of |
| --- | --- | --- | --- | --- | --- |
| `pause` | `map` | `map` | `Space` |  |   |
| `step` | `map` | `map` | `KeyS` |  |   |
| `speedUp` | `map` | `map` | `Equal` | `NumpadAdd` |   |
| `speedDn` | `map` | `map` | `Minus` | `NumpadSubtract` |   |
| `brushDn` | `map` | `map` | `BracketLeft` |  |   |
| `brushUp` | `map` | `map` | `BracketRight` |  |   |
| `toggle3d` | `map` | `map` | `Tab` |  |   |
| `inspect` | `map` | `map` | `KeyI` | `KeyQ` |   |
| `tool_terrain` | `map` | `map` | `Digit1` |  |   |
| `tool_elevation` | `map` | `map` | `Digit2` |  |   |
| `tool_smooth` | `map` | `map` | `Digit3` |  |   |
| `tool_water` | `map` | `map` | `Digit4` |  |   |
| `tool_temp` | `map` | `map` | `Digit5` |  |   |
| `tool_precip` | `map` | `map` | `Digit6` |  |   |
| `tool_current` | `map` | `map` | `Digit7` |  |   |
| `tool_wind` | `map` | `map` | `Digit8` |  |   |
| `tool_population` | `map` | `map` | `Digit9` |  |   |
| `tool_eraser` | `map` | `map` | `Digit0` |  |   |
| `geoNames` | `map` | `map` | `KeyN` |  |   |
| `layer_biome` | `map` | `map` | `KeyB` |  |   |
| `layer_temperature` | `map` | `map` | `KeyT` |  |   |
| `layer_humidity` | `map` | `map` | `KeyH` |  |   |
| `layer_currents` | `map` | `map` | `KeyC` |  |   |
| `layer_wind` | `map` | `map` | `KeyW` |  |   |
| `layer_political` | `map` | `map` | `KeyG` |  |   |
| `layer_population` | `map` | `map` | `KeyP` |  |   |
| `layer_eco` | `map` | `map` | `KeyE` |  |   |
| `layer_pollution` | `map` | `map` | `KeyZ` |  |   |
| `stats` | `win` | `map` | `F2` |  |   |
| `chronicle` | `win` | `map` | `KeyL` |  |   |
| `people` | `win` | `map` | `KeyD` |  |   |
| `wars` | `win` | `map` | `KeyV` |  |   |
| `regen` | `win` | `map` | `KeyR` |  |   |
| `quickSave` | `win` | `map` | `F5` |  |   |
| `quickLoad` | `win` | `map` | `F9` |  |   |
| `journal` | `win` | `walk` | `KeyJ` |  |   |
| `wmap` | `win` | `walk` | `KeyM` |  |   |
| `camF` | `cam` | `cam` | `KeyW` |  |   |
| `camB` | `cam` | `cam` | `KeyS` |  |   |
| `camL` | `cam` | `cam` | `KeyA` |  |   |
| `camR` | `cam` | `cam` | `KeyD` |  |   |
| `camQL` | `cam` | `cam` | `KeyQ` |  |   |
| `camQR` | `cam` | `cam` | `KeyE` |  |   |
| `fwd` | `foot` | `walk` | `KeyW` |  |   |
| `back` | `foot` | `walk` | `KeyS` |  |   |
| `left` | `foot` | `walk` | `KeyA` |  |   |
| `right` | `foot` | `walk` | `KeyD` |  |   |
| `run` | `foot` | `walk` | `ShiftLeft` | `ShiftRight` |   |
| `jump` | `foot` | `walk` | `Space` |  |   |
| `crouch` | `foot` | `walk` | `ControlLeft` | `ControlRight`, `KeyC` |   |
| `use` | `foot` | `walk` | `KeyE` |  |   |
| `vehicle` | `foot` | `walk` | `KeyF` |  |   |
| `reload` | `foot` | `walk` | `KeyR` |  |   |
| `view` | `foot` | `walk` | `KeyV` |  |   |
| `torch` | `foot` | `walk` | `KeyL` |  |   |
| `drop` | `foot` | `walk` | `KeyG` |  |   |
| `quitjob` | `foot` | `walk` | `KeyX` |  |   |
| `heal` | `foot` | `walk` | `KeyB` |  |   |
| `time` | `foot` | `walk` | `KeyT` |  |   |
| `hideui` | `foot` | `walk` | `KeyH` |  |   |
| `wpn1` | `foot` | `walk` | `Digit1` |  |   |
| `wpn2` | `foot` | `walk` | `Digit2` |  |   |
| `wpn3` | `foot` | `walk` | `Digit3` |  |   |
| `wpn4` | `foot` | `walk` | `Digit4` |  |   |
| `wpn5` | `foot` | `walk` | `Digit5` |  |   |
| `wpn6` | `foot` | `walk` | `Digit6` |  |   |
| `wpn7` | `foot` | `walk` | `Digit7` |  |   |
| `wpn8` | `foot` | `walk` | `Digit8` |  |   |
| `wpn9` | `foot` | `walk` | `Digit9` |  |   |
| `horn` | `veh` | `walk` | `KeyQ` |  |   |
| `v_fwd` | `veh` |   |   |  | `fwd` |
| `v_back` | `veh` |   |   |  | `back` |
| `v_left` | `veh` |   |   |  | `left` |
| `v_right` | `veh` |   |   |  | `right` |
| `v_stop` | `veh` |   |   |  | `jump` |
| `v_view` | `veh` |   |   |  | `view` |
| `v_exit` | `veh` |   |   |  | `vehicle` |
| `v_rev` | `veh` |   |   |  | `reload` |
| `v_swl` | `veh` |   |   |  | `left` |
| `v_swr` | `veh` |   |   |  | `right` |
| `a_thr` | `air` |   |   |  | `fwd` |
| `a_thd` | `air` |   |   |  | `back` |
| `a_gear` | `air` |   |   |  | `quitjob` |
| `a_gas` | `air` |   |   |  | `reload` |
| `a_chute` | `air` |   |   |  | `drop` |
| `a_brake` | `air` |   |   |  | `jump` |
| `a_look` | `air` |   |   |  | `crouch` |
| `t_hull` | `tank` |   |   |  | `run` |
| `t_gun` | `tank` |   |   |  | `view` |
| `t_exit` | `tank` |   |   |  | `vehicle` |

## Complete controller defaults

| Context | Action | Standard button | Index | Hold flag |
| --- | --- | --- | --- | --- |
| `foot` | `attack` | `RT` | 7 | 1 |
| `foot` | `aim` | `LT` | 6 | 1 |
| `foot` | `wnext` | `RB` | 5 |  |
| `foot` | `wprev` | `LB` | 4 |  |
| `foot` | `jump` | `A` | 0 | 1 |
| `foot` | `crouch` | `B` | 1 | 1 |
| `foot` | `use` | `X` | 2 |  |
| `foot` | `vehicle` | `Y` | 3 |  |
| `foot` | `run` | `L3` | 10 |  |
| `foot` | `view` | `R3` | 11 |  |
| `foot` | `torch` | `UP` | 12 |  |
| `foot` | `reload` | `DOWN` | 13 |  |
| `foot` | `heal` | `LEFT` | 14 |  |
| `foot` | `journal` | `RIGHT` | 15 |  |
| `foot` | `wmap` | `BACK` | 8 |  |
| `foot` | `drop` | `BACK + X` | 34 |  |
| `foot` | `quitjob` | `BACK + Y` | 35 |  |
| `foot` | `time` | `BACK + A` | 32 |  |
| `foot` | `hideui` | `BACK + B` | 33 |  |
| `veh` | `v_fwd` | `RT` | 7 | 1 |
| `veh` | `v_back` | `LT` | 6 | 1 |
| `veh` | `fire` | `RB` | 5 | 1 |
| `veh` | `aim2` | `LB` | 4 | 1 |
| `veh` | `v_stop` | `A` | 0 | 1 |
| `veh` | `a_look` | `B` | 1 | 1 |
| `veh` | `use` | `X` | 2 |  |
| `veh` | `v_exit` | `Y` | 3 |  |
| `veh` | `horn` | `L3` | 10 |  |
| `veh` | `v_view` | `R3` | 11 |  |
| `veh` | `a_gear` | `UP` | 12 |  |
| `veh` | `v_rev` | `DOWN` | 13 |  |
| `veh` | `a_chute` | `LEFT` | 14 |  |
| `veh` | `journal` | `RIGHT` | 15 |  |
| `veh` | `wmap` | `BACK` | 8 |  |
| `veh` | `torch` | `BACK + X` | 34 |  |
| `veh` | `heal` | `BACK + Y` | 35 |  |
| `veh` | `time` | `BACK + A` | 32 |  |
| `veh` | `hideui` | `BACK + B` | 33 |  |
| `map` | `click` | `A` | 0 | 1 |
| `map` | `back` | `B` | 1 |  |
| `map` | `pause` | `X` | 2 |  |
| `map` | `toggle3d` | `Y` | 3 |  |
| `map` | `zoomIn` | `RT` | 7 | 1 |
| `map` | `zoomOut` | `LT` | 6 | 1 |
| `map` | `rotR` | `RB` | 5 | 1 |
| `map` | `rotL` | `LB` | 4 | 1 |
| `map` | `speedDn` | `LEFT` | 14 |  |
| `map` | `speedUp` | `RIGHT` | 15 |  |
| `map` | `stats` | `UP` | 12 |  |
| `map` | `chronicle` | `DOWN` | 13 |  |

## Controller tuning

| Parameter | Value |
| --- | --- |
| `DEAD` | 0.18 |
| `CURSOR` | 1000 |
| `LOOK` | 1050 |
| `STICK_KEY` | 0.35 |
| `TRIG` | 0.3 |
| `PAN` | 1.15 |
| `PAN2D` | 900 |
| `ROT` | 1.5 |
| `ZOOM` | 1.9 |
| `SCROLL` | 1100 |
| `POINTER` | 9173 |
| `CAP_MS` | 9000 |

## Language catalogue

| Language ID | Language | Steam selection name | Formatting locale | Visibility |
| --- | --- | --- | --- | --- |
| `ru` | Russian | `russian` | `ru-RU` | Visible |
| `en` | English | `english` | `en-US` | Visible |
| `zh-CN` | Chinese (Simplified) | `schinese` | `zh-CN` | Visible |
| `zh-TW` | Chinese (Traditional) | `tchinese` | `zh-TW` | Visible |
| `ja` | Japanese | `japanese` | `ja-JP` | Visible |
| `ko` | Korean | `koreana` | `ko-KR` | Visible |
| `de` | German | `german` | `de-DE` | Visible |
| `fr` | French | `french` | `fr-FR` | Visible |
| `es` | Spanish | `spanish` | `es-ES` | Visible |
| `pt-BR` | Portuguese (Brazil) | `brazilian` | `pt-BR` | Visible |
| `pl` | Polish | `polish` | `pl-PL` | Visible |
| `tr` | Turkish | `turkish` | `tr-TR` | Visible |
| `it` | Italian | `italian` | `it-IT` | Visible |
| `uk` | Ukrainian | `ukrainian` | `uk-UA` | Visible |
| `cs` | Czech | `czech` | `cs-CZ` | Visible |
| `th` | Thai | `thai` | `th-TH` | Visible |
| `vi` | Vietnamese | `vietnamese` | `vi-VN` | Visible |
| `qps` | Pseudo-locale | `english` | `en-US` | Hidden |

## Room language change in 2.2.0

The selected language is stored before the page reload. A connected room prepares the seat and world recovery first. The two-client test changed the guest to German and restored its existing room seat and local snapshot. See [room recovery](../network/rooms-sync.md#room-recovery-in-220). [SRC-315, SRC-317]
