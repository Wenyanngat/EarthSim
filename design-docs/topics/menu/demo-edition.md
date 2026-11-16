# Trial edition

[Game design](../../GAME_DESIGN.md) · [Catalog](../../catalog.json) · [Source register](../../SOURCES.md) · [Extraction evidence](../../research/extraction-storage-editions.json)

> ID: `DOC-DEMO-EDITION`. Reference build 2.1.4.

The trial activates when `demomode.js` sees a truthy `window.GAME_DEMO`. The source describes the edition build step as supplying the marker before the trial module. The inspected entry page has no marker of its own. With the marker absent, the module leaves the trial inactive. With the marker present, a positive configured duration overrides the 15-minute default. [SRC-259, SRC-260]

## Active time and persistence

The clock samples every 250 ms. It charges time when the game window is focused, the document is visible, the world is initialized, the loader is hidden and the main menu is closed. Simulation pause alone leaves the clock running. Each sample measures elapsed wall time and clamps the contribution to the range from zero to one second, including after a long scheduling delay. [SRC-259, SRC-261]

The module reads `earthsim.demo` from browser storage and, where available, `demo-state.json` from disk. The disk path uses the directory two levels above the NW.js profile or falls back to the edition's local application data directory. The merge takes the larger used time, combines the first-notice flags with logical OR and combines the warning masks with bitwise OR. Each persisted record contains version `v`, used seconds `u`, notice flag `n`, warning mask `w` and write timestamp `ts`. [SRC-259]

The module writes after ten accumulated active seconds and flushes on blur, hidden-state transitions, page hide and unload. Disk persistence writes a temporary file and renames it over the prior state. Browser and disk write failures are caught independently. The trial timer record is separate from the [world save format](save-load.md). [SRC-256, SRC-259, SRC-261]

## Warnings and expiration

The first notice is eligible once the loader is hidden and waits 900 ms from its start. The default remaining-time thresholds are five minutes and one minute. Configured thresholds are converted to positive numbers and sorted in descending order. A warning that starts well below its threshold displays the actual remaining time. Flags mark notices and warnings already emitted. [SRC-259]

When the allowance runs out, the module persists exhausted time, freezes the world and shows the purchase and quit controls. Subsequent ticks maintain the end state. The capture-phase keyboard guard blocks game input after expiry while allowing Enter, Space and Tab in the dialog controls. The purchase path targets the full-game Steam app. [SRC-259, SRC-260]

## Edition gates

| Area | Trial behavior |
| --- | --- |
| Edition label | The menu title displays Demo. |
| Multiplayer | The main menu omits the multiplayer entry. |
| Workshop | The menu hides Workshop, the loaders skip local and Workshop mods, and the editor rejects opening. |
| Achievements and records | The gallery remains a showcase. Unlock writes, Steam achievement tabs and leaderboard requests are gated. |
| Steam bridge | Startup exits before launching the helper and exposes the full-game app ID for the purchase path. |
| Saves | Save and load remain in the menu. NW.js uses the edition's profile and the Windows fallback selects the demo directory. |

The feature gates are source traces. Isolated checks exercised the marker, configurable duration, focus and visibility, pause, state merge and simulated expiration. The packaged trial and its actual window, disk and Steam behavior remain open for observation. [SRC-256, SRC-259, SRC-260, SRC-261]
