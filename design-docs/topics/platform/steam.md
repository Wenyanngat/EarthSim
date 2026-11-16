# Steam integration, statistics and records

[Game design](../../GAME_DESIGN.md) · [Catalog](../../catalog.json) · [Sources](../../SOURCES.md) · [Extraction evidence](../../research/extraction-steam-platform.json)

> ID: `DOC-STEAM-PLATFORM`. Reference build 2.1.4.

Earth Simulator uses a Windows helper to communicate with Steam from its NW.js desktop build. Achievements also have a local profile. The bridge reads account information, submits platform activity and passes service responses back to the relevant menus. [SRC-262–266]

## Helper lifecycle

The priority for the application ID is a numeric `SteamAppId` environment value, a numeric `steam_appid.txt` beside the executable, then the bundled fallback `4932460`. The trial chooses the full-game ID for its purchase action and exits before helper initialization. Desktop setup requires both `steam_ach.exe` and `steam_api64.dll`. The game starts the helper with the selected ID in a hidden child window. Browser mode, missing files and synchronous launch failure leave achievements available locally. [SRC-262, SRC-263]

The bridge writes text lines to stdin and buffers stdout until a line break, including CRLF. Human-readable values such as player names and presence text use base64-encoded UTF-8 on the wire. The helper's `READY` line drains queued commands and starts reads for achievements, Workshop items, the account, launch context, all five statistics, Big Picture or Deck mode, Remote Play sessions and country. Generic commands queue at most 200 entries before readiness. The achievement unlock method adds its raw achievement ID to that queue without applying this cap. [SRC-262, SRC-263, SRC-265]

`steamAPI.available` reflects construction of the bridge object and stays true after a child exit. The private readiness and child state drive command delivery. Initialization failure and process error or exit mark Workshop loading settled. Process error or exit also clears the child and readiness state. On unload, the game flushes pending stats when ready and sends a quit line if the pipe is writable. [SRC-262, SRC-263]

## Local profile and Steam counters

The local achievement store `earthsim.ach` keeps timestamps keyed by the built-in achievement IDs. On receipt of a completed helper list, the game quietly imports known Steam unlocks and sends known local IDs missing from that list. Unknown IDs are ignored and the union can unlock an aggregate achievement. Scenario completions in `earthsim.scn` remain separate. Trial mode gates progression and synchronization. [Achievement criteria](../menu/achievements.md) [SRC-232–235, SRC-263]

| Counter | Increment source and unit |
| --- | --- |
| `years_simulated` | One per simulation year event. |
| `disasters_sent` | The disaster count increment passed to the achievement counter. |
| `brush_strokes` | The paint count increment passed to the achievement counter, including completed brush actions. |
| `walk_minutes` | One per 60-second sample while walk mode is active. |
| `net_minutes` | One per 60-second sample while a multiplayer session is live. |

The minute timer counts only when the helper is ready and the document is visible. It can count both modes at the same sample. The minute timer accumulates the additions. A simulation year event more than 60 seconds after the previous scheduled flush can write them, and unload requests a final flush. [SRC-263, SRC-266]

At readiness the game requests each counter's Steam baseline. The first valid integer response for a defined counter establishes its baseline. In-session positive additions wait in memory. The value shown by the bridge is the baseline plus pending additions, or unavailable until a baseline arrives. A flush sends updated values only for counters with a known baseline and requests a single `STORE` if any changed. It advances the local baseline and clears those pending additions as it writes, so the displayed count reflects local arithmetic before Steam confirms persistence. [SRC-263, SRC-266]

## Leaderboards

| Board | Score source |
| --- | --- |
| `world_years` | Highest floored simulation year the session has seen. |
| `world_peak_population` | Highest world population rounded to thousands, accumulated on year events. |

The year hook tracks both maxima and sends positive scores on its gated flush. World generation resets the tracked population peak and timeline era tracker. It preserves the tracked maximum year during the current launch. Score requests optionally carry a two-letter country. A rank reply updates the local per-board rank. Acceptance and the rules applied by Steam to a submitted score depend on the service. [SRC-263, SRC-264]

The achievements gallery asks for the top ten and then five around the current player for each board. Identical requests share callbacks. Each board processes one request at a time and holds up to eight additional distinct requests. Row counts clamp to 1–25. The active request ends on the helper terminator or after 50 seconds, after which the next request can start. Timeout and queue overflow return empty rows. Once both boards have results, the gallery spaces refreshes by at least one minute. [SRC-264, SRC-266]

The UI shows rank, score, player name, country and a marker on the player's own row. The bridge strips markup-sensitive characters and controls from decoded names and caps them at 32 code units. The gallery suppresses ranks from the around-player rows that already appeared in the top rows. It can show a loading state followed by an empty state. The bridge also uses empty rows on timeout, so that screen alone cannot identify the cause. [SRC-264]

## Other platform features

| Feature | Game-side behavior |
| --- | --- |
| Account and country | Uses the Steam persona name as a fallback for the multiplayer display name. Recognizes a two-letter Steam country and can use it for the flag and scores. |
| Rich presence | Updates every 2.5 seconds with menu, room, co-op, walk, year and era context. Repeated key values are suppressed. Room context can add a join action and player group. |
| Invitations and room entry | The network menu checks the Steam launch, helper and internet-room conditions for invitations. Incoming joins wait for the game callback and can ask before leaving the current room. Steam-gated servers request account authorization through the helper. The JS bridge waits up to six seconds for that result. |
| Workshop | Enumerates subscribed items, settles the local listing and retries pending downloads after 20 seconds. Create and update requests report their results through the same bridge. [Workshop lifecycle](../modding/data-code-editor.md) |
| Timeline | Switches between menu and game mode. World generation resets era tracking. Rising eras after an initial era, walking deaths and player kills of rulers can add timeline events. |
| Remote Play Together | Requests the invitation dialog with a four-second timeout. It passes guest session and direct input updates to co-op, which can switch its input mode as guests join or leave. [Local co-op](../network/local-coop-rivalry.md) |
| Steam keyboard | Big Picture or Deck mode enables a request with device-pixel-scaled bounds and a three-second timeout. The bridge can also request dismissal. |
| External pages | Uses the NW.js shell to open Steam pages. Overlay shortcuts are handled from the app's Steam integration. |

The bridge routes platform activity. Workshop, room membership and authorization have their own downstream rules. [Rooms and synchronization](../network/rooms-sync.md) [SRC-265]

## Verification boundary

The JavaScript bridge and achievement module ran in Node with a simulated child pipe, browser state and clock. Checks covered queued and split replies, missing and closed helpers, the profile union, counter accumulation and flushing, leaderboard decoding and timeouts, Workshop settling and selected Remote Play and keyboard paths. Open questions include the native helper's internal behavior, actual Steam service acceptance, account authorization, hardware input and Steam Cloud. [SRC-266]

## Zombie Epidemic ownership in 2.2.0

The creator tool for starting a Zombie Epidemic outbreak checks entitlement at selection. The existing outbreak is part of the world state. A player can join a world containing the outbreak or load its save and interact with it without owning the add-on. The unentitled offline test profile kept the tool locked and loaded an active pre-existing outbreak. Steam's entitlement response, purchase flow and cross-owner rooms remain open. [SRC-306, SRC-307]
