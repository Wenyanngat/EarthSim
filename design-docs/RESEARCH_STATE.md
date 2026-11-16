# Контрольная точка исследования установленной версии 2.1.4

[Дорожная карта](ROADMAP.md) содержит отдельный анализ публичных планов и зависимостей релизов [SRC-239, SRC-240].

## Навигация после разделения документации

Рабочие тексты находятся в `topics/`; [GAME_DESIGN.md](GAME_DESIGN.md) — указатель. [catalog.json](catalog.json) связывает фичи, документы, источники и вопросы. См. [ANALYSIS.md](ANALYSIS.md). Разделение не добавило новых наблюдений и не изменило точку продолжения исследования ниже.

## Завершённые блоки текущего прохода

- Подготовка исходного текста и 46 изображений завершена ранее; не повторять перенос и побайтовое сравнение без причины. Исходный документ и игровые файлы не изменялись.
- Быстрая генерация, расширенное меню и сброс общества: основные обработчики, поля и события, судьба сценария [SRC-019–025].
- Экономика ядра и товарная торговля: ВВП/казна, экспортные веса, партии, пути, доставленный поток, вывод и `ext.trade` [SRC-026–033].
- Двор и наследование: год семьи, три закона, регент, выборы, навыки и `ext.people` [SRC-034–038].
- Прогулка: вход/выход, соотношение часов, клавиши/цели, труд, поручения, лечебные вещи, местные деньги, слава и розыск [SRC-039–046].
- Начат следующий блок: климат→экология→ёмкость населения, 20 биомов, обратная совместимость номеров в сохранении, русла, живое море, недра и соседская миграция [SRC-047–050].

## WP-BASELINE: извлечённая база

[Тема](topics/simulation/baseline.md), [JSON результата](research/extraction-baseline.json), SRC-058–061: манифест/скрипты/данные/boot/шина/часы прослежены, 26 изолированных проверок прошли. Проверены реальный прогрев и дробный календарь, ручной шаг и разный локальный/сетевой порядок. Полная игра не запускалась; статус `static_traced_runtime_pending`, runtime_verified=false.

## WP-FAUNA: извлечённая фауна

[Тема](topics/simulation/fauna.md), [машинный результат](research/extraction-fauna.json), SRC-062–066: необходимые входы среды, 35 видов/все FAU, плотности/пищевые цепи, ареалы/расселение, редкость/вымирание/охрана, одомашнивание, API/локальные потребители/save/load. 35 изолированных проверок прошли. Статус static_traced_runtime_pending; runtime_verified=false. Игровые файлы и пользовательские сохранения не изменялись.

## WP-DEMOGRAPHY-CITIES: извлечённая демография и города

[Тема](topics/simulation/demography-cities.md), [JSON](research/extraction-demography.json), SRC-067–072: ёмкость/ветер/адаптация, рост/болезни/миграция/затопление, города/паспорта/бюджет, благополучие и границы NPC. 45 изолированных проверок прошли; статическая часть пакета завершена, runtime_verified=false. Исправлено прежнее описание половинного вклада малых поселений: фактический коэффициент0.6 при urban>300.

## WP-ECONOMY-TECH: извлечённая экономика и технологии

[Экономика](topics/states/economy.md), [технологии](topics/states/technology.md), [JSON](research/extraction-economy.json), SRC-073–078: ресурсы/шельф, ВВП/казна, промышленность/выбросы, местная наука, восемь эпох/58 открытий, армия/мощь, передача знаний и локальное восстановление. 41 изолированная проверка прошла; 36 диапазонов, 11 файлов. REA civ.js переиспользован по неизменённым байтам, граф частичный. Полная игра не наблюдалась.

## WP-POLITICS-SOCIETY: извлечённая политика и общество

[Политика](topics/states/formation-politics.md), [народы и вера](topics/society/cultures-religions.md), [территория](topics/states/territory.md), [дипломатия](topics/states/diplomacy.md), [JSON](research/extraction-politics.json), SRC-079–085: 41 диапазон, 13 файлов, 59 изолированных проверок. Основание/реформы/единство/decline/распады, культуры/веры, соседи/вассалы/уния/блоки и локальные save/events прослежены. REA society.js сохранён с явным partial graph; игра не наблюдалась.

## WP-PEOPLE-DYNASTIES: извлечённые семьи и престолы

[Династии](topics/society/dynasties.md), [процедурные семьи](topics/society/commoner-families.md), [JSON](research/extraction-dynasties.json), SRC-086–092: 47 диапазонов, 13 файлов и 63 изолированные проверки. Полный настоящий people.js исполняется в VM с lexical exposure частных функций без изменения их тел; ошибки подписчиков проверяются. REA people.js сохранён с partial graph. Runtime полной игры отсутствует.

## WP-TRADE-NAVIGATION: товары и навигация

[Модель](topics/states/trade-mechanics.md), [навигация](topics/states/trade-navigation.md), [JSON](research/extraction-trade.json), SRC-093–100: 45 диапазонов/11 файлов, 71 проверка. Профили/партии/поставка/перепродажа/потоки/город/носители/ETA/ветер/пути, локальные блокада/каперство/прогулочные handoffs и сохранение извлечены. Профиль не склад; перепродажа не списывает исходную массу; городской KPI ограничен12; ядро платит отдельно. REA partial экспортирован и сброшен. Полной игры не наблюдали.

## WP-WORLD-WARS-TERRITORY: войны и территория

64 диапазона, 17 файлов, 16 групп переходов и 91 изолированная проверка. Прослежены война, мир, сухопутные/морские исходы, ядерные эффекты, загрузка и все группы смены владельца поставки. Сценарий W90 фиксирует унаследованную из памяти заявку ответа после обычной загрузки. REA civ.js экспортирован и сброшен. [Военная симуляция](topics/states/war-mechanics.md) · [Ракеты](topics/states/strategic-weapons.md) · [Территория](topics/states/territory.md) · [JSON](research/extraction-wars.json) [SRC-101–109]

## WP-MENU-LIFECYCLE: меню и переходы мира

Прослежены старт, пауза и «Продолжить», наборы, boot, запись и ошибки, выход, быстрая регенерация, сброс, новости и авторы. 49 диапазонов, 20 файлов и 58 изолированных проверок с исходными обработчиками. Работа с файлами пользователя, NW.js и сетевой комнатой остаётся непроверенной. [Жизненный цикл меню](topics/menu/lifecycle.md) · [Машинный отчёт](research/extraction-menu.json) [SRC-110–117]

## WP-WORLD-NATURE: природная симуляция

Прослежены все типы генерации, высоты и география растра Земли, калибровка, правила имён, климат и гидрология, биомы, недра, загрязнение, управление планетой и природные последствия сброса. 53 диапазона, 12 файлов и 50 успешных изолированных проверок. [Рельеф](topics/simulation/world-terrain.md) · [Реальная Земля](topics/simulation/real-earth.md) · [Климат и экология](topics/simulation/climate-ecology.md) · [Машинный отчёт](research/extraction-nature.json) [SRC-118–126]

## WP-DISASTERS-DIVINE: катастрофы и силы творца

Разобраны три фичи. 59 диапазонов в 13 файлах покрывают десять бедствий, ветви раздора, кисти, сценарные ограничения, сохранение и подсчёт. Прошла 51 изолированная проверка. [Катастрофы](topics/simulation/disasters.md) · [Инструменты](topics/interface/tools.md) · [Машинный отчёт](research/extraction-disasters.json) [SRC-127–134]

## WP-MAP-INTERFACE: карта, окна и статистика

Прослежены 16 фичей. 104 диапазона в 21 файле фиксируют ввод и слои, инспектор, имена, регуляторы, статистику, страницы, ленты и историю. 59 изолированных проверок прошли. [Слои](topics/interface/map-layers.md) · [Статистика и история](topics/interface/statistics-history.md) · [Машинный отчёт](research/extraction-map.json) [SRC-135–143]

## WP-WALK-CORE — режимы, персонажи и локальный мир

Прослежены девять фичей. 67 диапазонов в 15 файлах фиксируют вход, режимы и профиль, физику и здоровье, планы клеток, коллизии, разрушения, ввод и журнал. Прошли 56 изолированных проверок. [Персонажи](topics/walk/modes-characters.md) · [Здоровье](topics/walk/player-life.md) · [Местный мир](topics/walk/world-generation.md) · [Машинный отчёт](research/extraction-walk-core.json) [SRC-144–151]

## WP-WALK-SOCIETY-ECONOMY — жители, охота и экономика прогулки

Прослежены восемь фичей, 83 диапазона в 12 файлах и 61 изолированная проверка. Извлечены роли и персоны, стада и добыча, 72 товара, владение 24 типами транспорта, кошельки, 12 генераторов и разные схемы расчёта за работу. [Жители и охота](topics/walk/npc-life.md) · [Лавки](topics/walk/shops-equipment.md) · [Задания и работа](topics/walk/quests-jobs.md) · [Машинный отчёт](research/extraction-walk-society-economy.json) [SRC-152–160]

## WP-WALK-LAW-BASES — закон, дворец, полиция и базы

Прослежены пять фичей, 74 диапазона в 10 файлах. Прошли 60 изолированных проверок свидетелей, славы, преследования, профиля, ареста, аудиенции, баз и переходов AIR/SEA. [Слава и закон](topics/walk/reputation-law.md) · [Дворец](topics/walk/palace-audience.md) · [Погоня и базы](topics/walk/pursuit-bases.md) · [Машинный отчёт](research/extraction-walk-law-bases.json) [SRC-161–168]

## WP-WALK-GROUND-TRANSPORT — дорожное движение и железная дорога

Прослежены шесть фичей, 80 диапазонов в 10 файлах, 78 записей транспортного реестра. Прошла 51 изолированная проверка дорог, переходов транспорта, проекции путей, поездок, приоритетов, смены и переездов. [Транспорт](topics/walk/transport.md) · [Дорожное движение](topics/walk/road-traffic.md) · [Поезда и переезды](topics/walk/rail.md) · [Машинный отчёт](research/extraction-walk-ground-transport.json) [SRC-169–177]

## WP-WALK-AIR — авиация, билеты, контракты и аренда

Прослежены четыре фичи, 73 диапазона в 9 файлах. Прошла 71 изолированная проверка полного walkair.js в свежих VM. Извлечены поколения полей, очередь, модели, билет, пилотская работа, дирижабль, аренда, угон и парашют. [Авиация](topics/walk/air.md) · [Транспортный каталог](topics/walk/transport.md) · [Машинный отчёт](research/extraction-walk-air.json) [SRC-178–186]

## WP-WALK-SEA — морской транспорт, порты, работа и экипажи

Прослежены четыре фичи, 15 корпусов, 87 диапазонов в девяти файлах. Прошла 91 изолированная проверка полного walksea.js. Извлечены порты, палубы, смены, билеты, экипажи, захват, преследование, паника и затопление. Статус `static_traced_runtime_pending`. [Морской транспорт](topics/walk/sea.md) · [Транспортный каталог](topics/walk/transport.md) · [Машинный отчёт](research/extraction-walk-sea.json) [SRC-187–195]

## WP-WALK-WORLD-EFFECTS — груз, ракеты и бой

Прослежены три фичи, 105 диапазонов в 13 файлах. Прошли 129 изолированных проверок: 33 торговых, 48 ракетных и 48 боевых. Проверены 21 исходный файл и тестовые копии. Статус `static_traced_runtime_pending`. [Влияние на мир](topics/walk/world-effects.md) · [Бой и оружие](topics/walk/combat.md) · [Машинный отчёт](research/extraction-walk-world-effects.json) [SRC-196–210]

## WP-NETWORK — сетевое ядро, комнаты и восстановление

Прослежены шесть фичей и 68 диапазонов кода. Прошли 65 изолированных проверок. Извлечены комнаты, права, присутствие, порядок ходов, снимки и восстановление. Статус `static_traced_runtime_pending`. [Сетевые комнаты](topics/network/rooms-sync.md) · [Машинный отчёт](research/extraction-network.json) [SRC-211–218]

## WP-NETWORK-WALK. Сетевая прогулка, общий мир и PvP

Прослежены две фичи и 45 диапазонов кода. Прошли 29 изолированных проверок. Извлечены присутствие, общий мир, действия гостей, PvP, часы и погода. Статус `static_traced_runtime_pending`. [Сетевая прогулка](topics/network/walk.md) · [Машинный отчёт](research/extraction-network-walk.json) [SRC-219–225]

## WP-LOCAL-MULTIPLAYER. Общий экран, Remote Play и соперничество

Прослежены три фичи и 37 диапазонов кода. Прошли 24 изолированные проверки. Извлечены места гостей, действия на общей карте, раздельный ввод Steam, выбор держав и счёт соперничества. Статус `static_traced_runtime_pending`. [Локальная кооперация и соперничество](topics/network/local-coop-rivalry.md) · [Машинный отчёт](research/extraction-local-multiplayer.json) [SRC-226–231]

## WP-SCENARIOS-PROFILE. Сценарии, обучение и профиль

Извлечены 13 встроенных сценариев с 45 целями, 32 достижения, 13 шагов обучения, 11 подсказок и расписание событий дополнений. Прослежены 68 диапазонов кода. Прошли 32 изолированные проверки. Статус `static_traced_runtime_pending`. [Сценарии](topics/menu/scenarios.md) · [Достижения](topics/menu/achievements.md) · [Обучение](topics/interface/onboarding.md) · [События](topics/menu/scripted-events.md) · [Машинный отчёт](research/extraction-scenarios-profile.json) [SRC-232–238]

## WP-MODDING. Data, code, editor and Workshop

Six features traced across 36 source ranges. Fifty isolated checks passed. Extracted data formats, code boot/patching, ModAPI, world sanitation, heightmaps, editor drafts and Workshop lifecycle. Status: `static_traced_runtime_pending`; `runtime_verified=false`. [Modding](topics/modding/data-code-editor.md) · [Evidence](research/extraction-modding.json) [SRC-243–249]

## WP-CUSTOMIZATION. Names, geography and flags

Three features traced across 20 source ranges; 53 isolated checks passed. Extracted seven rename targets, flag validation/editor behavior, player and cultural geography, persistence and editor-role command dispatch. Status: `static_traced_runtime_pending`; `runtime_verified=false`. [Customization](topics/interface/customization.md) · [Evidence](research/extraction-customization.json) [SRC-250–255]

## WP-STORAGE-EDITIONS. Saves and trial edition

Two features traced across 31 source ranges. 28 isolated checks passed. Disk and browser saves, partial writes, legacy migration, the trial clock and edition gates are documented. Full-game runtime remains pending. [Saves](topics/menu/save-load.md) · [Trial edition](topics/menu/demo-edition.md) · [Evidence](research/extraction-storage-editions.json) [SRC-256–261]

## WP-STEAM-PLATFORM. Steam, statistics and records

Two features traced across 40 source ranges. 27 isolated checks passed. The Steam helper lifecycle, local profile union, counters, records and platform callbacks are documented. Full-game runtime remains pending. [Steam integration](topics/platform/steam.md) · [Evidence](research/extraction-steam-platform.json) [SRC-262–266]

## Текущая система и точка продолжения

27 packages are statically extracted, including eight primary and nineteen deferred packages. The isolated checks total 1476. Every package retains `runtime_verified=false`. The catalog contains 144 features and 123 documents. The plan contains 29 packages.

Next package: `WP-INPUT-ACCESS`, deferred queue rank 20. Trace input, controllers, localization and units. [Plan](EXTRACTION_PLAN.md) · [Feature scope](research/feature-scope.json)

## Нерешённые вопросы и ограничения

- Статический анализ без запуска, сетевой сессии и тестовых сохранений; случайные ветви, производительность, графические шкалы и результат работы мода требуют наблюдения в отдельной тестовой копии.
- 11 различных PNG зрительно сверены из 46; рис. 44 просмотрен дважды. Новый DOCX не собирался.
- После изменений в других разделах сверять формулировки с исходником и кодом, обновлять [COVERAGE.md](COVERAGE.md), [SOURCES.md](SOURCES.md), [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) и [CHANGELOG.md](CHANGELOG.md). В основном тексте исторические ошибки не оставлять рядом с исправлениями.
