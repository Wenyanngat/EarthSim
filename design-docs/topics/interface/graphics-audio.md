# Graphics, sound and music

[Game design](../../GAME_DESIGN.md) · [Catalog](../../catalog.json) · [Sources](../../SOURCES.md) · [Extraction evidence](../../research/extraction-presentation.json)

> ID: `DOC-GRAPHICS-AUDIO`. Reference build 2.1.4. Source traces and isolated checks describe the implementation. GPU output, sound and performance in a running game remain open.

## 2D map, 3D map and walk mode

The frame loop gives walk mode first use of the renderer, then the 3D map, then the 2D canvas. Switching on the 3D map succeeds only after Three.js and the renderer initialize. Leaving 3D marks the 2D base and borders for redraw. Walk uses the Three.js renderer with its own scene and camera and restores the prior renderer pixel ratio and clear color on exit. [SRC-274]

The 2D map paints a land base and a separately updated water buffer. Base supersampling and water resolution are separate. The 3D map takes the smaller of device pixel ratio and 2, multiplies by the resolution scale and floors the result at 0.5. Walk uses a device pixel ratio cap of 1.5 and the same 0.5–1 scale range. [SRC-274, SRC-275]

## Quality and persistence

Normal (`medium`) is the default. Each preset fills the fields below. The switches and numeric controls change individual values, and the resulting values determine whether the preset label is one of the four names or Custom. Older saved presets fill missing fields from their current counterpart. The graphics record lives under `earthsim.gfx`. [SRC-275]

The texture toggle raises the bake setting to at least 16 when enabled and caps it at 12 when disabled. Selecting FXAA or MSAA enables post-processing. Disabling post-processing clears the AA selection. In a successful post pass the renderer uses FXAA when requested, or 4-sample MSAA when the multisample target is available. When the post path throws, direct scene rendering takes over and the broken-path flag prevents further post attempts while set. [SRC-275]

Graphics controls apply immediately. They rebuild the 2D buffers and 3D assets while keeping the current world. Cancel or closing the settings pane without Apply restores the opening graphics and sound snapshot. Apply commits unit selections and any language change. Rain and snow density saves immediately as `earthsim.rain` and is absent from the Cancel snapshot. Its menu levels are 100%, 60%, 30% and 0% for visible particles in 3D and walk. The day/night option is also independent of the four quality presets. [SRC-275, SRC-276, SRC-277]

## Terrain, detail and weather

The 3D terrain bake blends biome base and lush colors by vegetation and overlays ice, ash, ruins and fallout from the world state. High simulation speeds blend toward averaged seasonal climate. The blend is zero while paused. Textures can come from embedded `TEXDATA`, shipped `tex/` images or mod overrides. Failed image loads stay unready, color sampling falls back to neutral 0.5 and unmapped shader materials use a white texture. Road textures and compatible vehicle models also have mod hooks. [SRC-276]

The map updates terrain when the sea-level change reaches 0.0004 or the water mask changes, or when the periodic elevation signature changes. Terrain color can rebake after 20 frames when dirty and after 150 frames as a recency fallback. Cities update on terrain/camera changes or on the periodic growth path while unpaused. Roads and borders can refresh on a separate 15-frame check. Settlement models simplify with distance, and object budgets depend on the chosen detail level. [SRC-276]

The mover pool caps land traffic at 80, inter-state land traffic at 40, sea traffic at 120, air traffic at 60 and rail traffic at 40. Animation pauses with the simulation and caps the speed multiplier by mode. Terrain, roads, buildings, vegetation, traffic and particles follow the world and the camera through these display paths. [SRC-276]

The shader environment has a 420-second day cycle and a declared night share of 0.24. Turning off day/night fixes the visual time at 0.596 while shader time continues advancing. Cloud shadows, water reflections, foam and the high-quality water effects depend on their respective controls. Dynamic building and tree shadows require the dynamic shadow setting, a nearby camera and sufficient sunlight. The top two presets enable that setting. [SRC-275, SRC-276]

## Sound, ambience and world events

The Web Audio graph sends effects, ambience and music through one master gain and limiter. Sound and music are both on by default, with master volume at 0.8 and music volume at 0.6. The master toggle suspends the context and pauses mod media. The music toggle changes the music bus and stops its scheduler or pauses its media. The build requests autoplay. It can attempt context creation at startup, retry or resume after a pointer/key event, and wake on visibility restoration. [SRC-277]

The normal effects mix has 24 voice groups and a 64-source cap with a priority allowance of 16. Effects use synthesized envelopes and shared white/pink noise. The public effect registry is separate from UI sounds and event cues, and the same sound can be limited within a short window. [SRC-277]

The event poll runs every 600 ms. It considers up to 40 entries, ignores pre-existing history on the first scan, and picks the highest-importance eligible new cue. The nominal spacing is 900 ms, reaching 2.7 seconds as simulation speed increases. A disaster cue is suppressed within three seconds of a qualifying large sound. [SRC-277]

Ambience updates every 1.2 seconds, sampling a 5×5 cell neighborhood around the camera or walking player. Wind, shore, precipitation, city and night layers change with the sampled world. The mix uses a 0.4 multiplier in the menu, 1.3 on foot and 1 on the map. Menu visibility takes precedence over walk when resolving scene. [SRC-277]

The audio load tier follows the higher of the Fast preset's baseline and the tier chosen by underrun monitoring. Higher load reduces the effect reverb from 1.9 seconds to 0.9 seconds and then disables it, and trims music voices. Persistent underflow can cause a context rebuild with the `playback` latency hint. [SRC-277, SRC-278]

## Procedural music

Twelve built-in pieces have authored chords, parts and several arrangement variations. The track forms span 56–166 BPM and use 3/4, 4/4 and 6/4 meter. A weighted selector favors the menu theme in the menu, era pieces on the map, and trail or street music in walk mode. Danger, war, darkness, nearby settlement density and a prolonged pause can change the pool. The director checks every 50 ms with 0.3 seconds of normal look-ahead. It holds a scene change for 1.6 seconds, can crossfade over 3.5 seconds and waits at least 60 seconds before interrupting a track for an urgent change in mood. Between finished tracks it waits 10–25 seconds on the map or walk and 5–10 seconds in the menu. [SRC-278]

The settings player displays the built-in title, elapsed time and duration and offers Next or explicit track selection. A valid explicit selection queues a request for the next scheduler tick. Mod music takes over the music bus when a playlist is available, and the built-in controls are disabled while the mod playlist is present. The loader accepts up to 12 files per mod registration, while the audio-side playlist takes up to 32 URLs. Media `ended` advances cyclically. The error handler advances the index and schedules a retry only when the new index is nonzero. Mod sound effects use decoded buffers and the same source and repeat budgets as the stock effects. [SRC-277, SRC-278]

## Scope of verification

The isolated probe covers preset loads and changes, settings persistence, rendering fallback and scaling, mixer lifecycle and gates, and built-in music selection and scheduling. The game's renderers and audio devices still need observation under actual GPU and browser conditions. [SRC-279]

## Quality preset values

| Parameter | Fast | Normal | High | Ultra |
| --- | --- | --- | --- | --- |
| `water` | 0.5 | 0.5 | 1 | 1 |
| `base` | 1 | 1 | 2 | 2 |
| `tex3d` | false | true | true | true |
| `bake3d` | 12 | 16 | 28 | 32 |
| `shadows` | 0 | 1 | 2 | 2 |
| `post` | false | true | true | true |
| `water3d` | 0 | 1 | 2 | 2 |
| `clouds` | false | true | true | true |
| `detail` | 0 | 1 | 2 | 3 |
| `aa` | 0 | 1 | 1 | 2 |
| `scale` | 1 | 1 | 1 | 1 |

## Map detail budgets

| Pool | Detail 0 | Detail 1 | Detail 2 | Detail 3 |
| --- | --- | --- | --- | --- |
| Buildings | 6500 | 22000 | 36000 | 56000 |
| Trees | 6000 | 14000 | 24000 | 36000 |
| 3D trees | 0 | 1800 | 4500 | 9000 |
| People | 120 | 260 | 380 | 520 |
| Fauna | 0 | 220 | 400 | 640 |
| Particles | 600 | 1600 | 3200 | 5000 |

## Built-in tracks

| ID | English title |
| --- | --- |
| `menu` | Cradle of the World |
| `dawn` | First Fire |
| `agrarian` | Fields and Rivers |
| `classical` | Marble and Laurel |
| `industrial` | Iron and Steam |
| `modern` | City Lights |
| `space` | To the Stars |
| `war` | Drums of War |
| `winter` | The Long Winter |
| `calm` | Breath of the Planet |
| `trail` | The Trail |
| `streets` | Streets |

## Public sound registry

`step`, `shot`, `hit`, `hurt`, `horn`, `animal`, `thunder`, `quake`, `eruption`, `explosion`, `splash`, `door`, `talk`, `coin`, `sword`, `thud`, `take`, `swing`, `shout`, `scream`, `reload`, `empty`, `draw`, `crash`, `battle`, `alarm`, `gallop`, `oar`, `siren`, `hover`, `engine`, `rain`. [SRC-277]
