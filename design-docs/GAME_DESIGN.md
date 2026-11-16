# Дизайн Earth Simulator: тематические документы

Большой документ разделён по экранам и системам. Рабочие тексты находятся в `topics/`; этот файл сохранён как точка входа по прежнему адресу. Версия исследованных файлов — **2.1.4**; наблюдений в запущенной игре нет.

[JSON-каталог фичей и документов](catalog.json) · [Анализ структуры](ANALYSIS.md) · [Источники](SOURCES.md) · [Текущие вопросы](OPEN_QUESTIONS.md)

Публичные планы релизов, зависимости и предложенные критерии готовности собраны в [анализе дорожной карты](ROADMAP.md).

[100 идей для модов и DLC за пределами дорожной карты](EXPANSION_IDEAS.md).

[«Земля слышит». Ещё 100 механик для игрока-бога по мотивам Populous](POPULOUS_DLC.md).

[Полный план извлечения логики](EXTRACTION_PLAN.md) охватывает все обнаруженные системы. [Перечень 144 фичей](FEATURE_INVENTORY.md) и [JSON охвата](research/feature-scope.json) связывают их с 29 этапами и игровыми модулями.

Исходный [дизайн-документ](Earth%20Simulator%20Дизайн%20Документ.md) сохранён без изменений. Нумерация старых разделов указана внутри тем и в JSON. Документы «Каркас исследования» отмечают пробелы, а не завершённые механики.

[Результат WP-BASELINE](topics/simulation/baseline.md) · [Машинные данные и проверки](research/extraction-baseline.json). Статические цепочки извлечены; 26 изолированных проверок прошли, наблюдений игры нет [SRC-058–061].

[Результат WP-FAUNA](topics/simulation/fauna.md) · [Машинные данные](research/extraction-fauna.json): 35 видов, все FAU, 35 успешных изолированных проверок. Наблюдений игры нет [SRC-062–066]. Затем извлечён WP-DEMOGRAPHY-CITIES; см. следующий результат.

[WP-DEMOGRAPHY-CITIES](topics/simulation/demography-cities.md) · [Машинный результат](research/extraction-demography.json): 45 изолированных проверок, наблюдений игры нет [SRC-067–072]. После него извлечён WP-ECONOMY-TECH; см. ниже.

[WP-ECONOMY-TECH](topics/states/economy.md) · [Технологии: восемь эпох и 58 открытий](topics/states/technology.md) · [JSON](research/extraction-economy.json): 41 изолированная проверка; наблюдений игры нет [SRC-073–078]. После него извлечён WP-POLITICS-SOCIETY; см. ниже.

[WP-POLITICS-SOCIETY](topics/states/formation-politics.md) · [Народы и вера](topics/society/cultures-religions.md) · [Территория](topics/states/territory.md) · [JSON](research/extraction-politics.json): 59 изолированных проверок; полной игры не наблюдали [SRC-079–085]. Затем извлечён WP-PEOPLE-DYNASTIES; см. ниже.

[WP-PEOPLE-DYNASTIES](topics/society/dynasties.md) · [Семьи простолюдинов](topics/society/commoner-families.md) · [JSON](research/extraction-dynasties.json): 63 изолированные проверки; полной игры не наблюдали [SRC-086–092]. Затем извлечён WP-TRADE-NAVIGATION; см. ниже.

[WP-TRADE-NAVIGATION](topics/states/trade-mechanics.md) · [Перевозчики и навигация](topics/states/trade-navigation.md) · [JSON](research/extraction-trade.json): 71 изолированная проверка; полной игры не наблюдали [SRC-093–100]. Затем извлечён WP-WORLD-WARS-TERRITORY.

Основная очередь статически извлечена. WP-WORLD-WARS-TERRITORY добавил 91 изолированную проверку. [Военная симуляция](topics/states/war-mechanics.md) · [Ядерные эффекты](topics/states/strategic-weapons.md) · [JSON](research/extraction-wars.json) [SRC-101–109]

Затем извлечён WP-MENU-LIFECYCLE и прошли 58 изолированных проверок. [Жизненный цикл меню](topics/menu/lifecycle.md) · [JSON](research/extraction-menu.json) [SRC-110–117]

WP-WORLD-NATURE охватывает 11 фичей. Извлечены генерация и недра, «Реальная Земля» и имена, климат, биомы, вода и природные последствия управления миром. Прошли 50 изолированных проверок. [Рельеф](topics/simulation/world-terrain.md) · [Реальная Земля](topics/simulation/real-earth.md) · [Машинный отчёт](research/extraction-nature.json) [SRC-118–126]

WP-DISASTERS-DIVINE охватывает десять бедствий, природные броски, силы творца и кисти. Прошла 51 изолированная проверка. [Катастрофы](topics/simulation/disasters.md) · [Инструменты](topics/interface/tools.md) · [Машинный отчёт](research/extraction-disasters.json) [SRC-127–134]

WP-MAP-INTERFACE охватывает 16 фичей карты и окон. Прошли 59 изолированных проверок. [Слои](topics/interface/map-layers.md) · [Статистика и история](topics/interface/statistics-history.md) · [Машинный отчёт](research/extraction-map.json) [SRC-135–143]

WP-WALK-CORE охватывает девять фичей прогулки. Прошли 56 изолированных проверок. [Персонажи](topics/walk/modes-characters.md) · [Здоровье](topics/walk/player-life.md) · [Местный мир](topics/walk/world-generation.md) · [Машинный отчёт](research/extraction-walk-core.json) [SRC-144–151]

WP-WALK-SOCIETY-ECONOMY охватывает восемь фичей жителей, охоты, имущества, торговли и работы. Прошла 61 изолированная проверка. [Жители](topics/walk/npc-life.md) · [Лавки](topics/walk/shops-equipment.md) · [Задания и работа](topics/walk/quests-jobs.md) · [Машинный отчёт](research/extraction-walk-society-economy.json) [SRC-152–160]

WP-WALK-LAW-BASES охватывает пять фичей славы, закона, двора, нарядов и баз. Прошли 60 изолированных проверок. [Слава и закон](topics/walk/reputation-law.md) · [Дворец](topics/walk/palace-audience.md) · [Погоня и базы](topics/walk/pursuit-bases.md) · [Машинный отчёт](research/extraction-walk-law-bases.json) [SRC-161–168]

WP-WALK-GROUND-TRANSPORT охватывает шесть фичей. Собраны 78 записей транспорта, дорожное движение, поездки, смена машиниста и переезды. Прошла 51 изолированная проверка. [Транспорт](topics/walk/transport.md) · [Дорожное движение](topics/walk/road-traffic.md) · [Поезда и переезды](topics/walk/rail.md) · [Машинный отчёт](research/extraction-walk-ground-transport.json) [SRC-169–177]

WP-WALK-AIR охватывает четыре фичи. Извлечены поколения авиации, очередь аэродрома, модели полёта, пассажирские рейсы, контракты, аренда, угон и парашют. Прошла 71 изолированная проверка. [Авиация](topics/walk/air.md) · [Транспортный каталог](topics/walk/transport.md) · [Машинный отчёт](research/extraction-walk-air.json) [SRC-178–186]


Прослежены четыре фичи, 15 корпусов, 87 диапазонов в девяти файлах. Прошла 91 изолированная проверка полного walksea.js. Извлечены порты, палубы, смены, билеты, экипажи, захват, преследование, паника и затопление. Статус `static_traced_runtime_pending`. [Морской транспорт](topics/walk/sea.md) · [Транспортный каталог](topics/walk/transport.md) · [Машинный отчёт](research/extraction-walk-sea.json) [SRC-187–195]

Прослежены три фичи, 105 диапазонов в 13 файлах. Прошли 129 изолированных проверок: 33 торговых, 48 ракетных и 48 боевых. Проверены 21 исходный файл и тестовые копии. Статус `static_traced_runtime_pending`. [Влияние на мир](topics/walk/world-effects.md) · [Бой и оружие](topics/walk/combat.md) · [Машинный отчёт](research/extraction-walk-world-effects.json) [SRC-196–210]

Прослежены шесть фичей и 68 диапазонов кода. Прошли 65 изолированных проверок. Извлечены комнаты, права, присутствие, порядок ходов, снимки и восстановление. Статус `static_traced_runtime_pending`. [Сетевые комнаты](topics/network/rooms-sync.md) · [Машинный отчёт](research/extraction-network.json) [SRC-211–218]

Прослежены две фичи и 45 диапазонов кода. Прошли 29 изолированных проверок. Извлечены присутствие, общий мир, действия гостей, PvP, часы и погода. Статус `static_traced_runtime_pending`. [Сетевая прогулка](topics/network/walk.md) · [Машинный отчёт](research/extraction-network-walk.json) [SRC-219–225]

Прослежены три фичи и 37 диапазонов кода. Прошли 24 изолированные проверки. Извлечены места гостей, действия на общей карте, раздельный ввод Steam, выбор держав и счёт соперничества. Статус `static_traced_runtime_pending`. [Локальная кооперация и соперничество](topics/network/local-coop-rivalry.md) · [Машинный отчёт](research/extraction-local-multiplayer.json) [SRC-226–231]

Извлечены 13 встроенных сценариев с 45 целями, 32 достижения, 13 шагов обучения, 11 подсказок и расписание событий дополнений. Прослежены 68 диапазонов кода. Прошли 32 изолированные проверки. Статус `static_traced_runtime_pending`. [Сценарии](topics/menu/scenarios.md) · [Достижения](topics/menu/achievements.md) · [Обучение](topics/interface/onboarding.md) · [События](topics/menu/scripted-events.md) · [Машинный отчёт](research/extraction-scenarios-profile.json) [SRC-232–238]

## Основы игры

| Документ | Старые разделы | Содержание |
| --- | --- | --- |
| [Обзор игры и игровой цикл](topics/overview.md) | intro | Тематический текст |

## Меню и служебные экраны

| Документ | Старые разделы | Содержание |
| --- | --- | --- |
| [Главное меню и новости](topics/menu/lobby.md) | 1 | Пункты, пауза и лента |
| [Жизненный цикл меню](topics/menu/lifecycle.md) | — | Boot, Continue, запись, сброс и выход |
| [Создание мира: климат и история](topics/menu/new-game.md) | 1.1 | Тематический текст |
| [События сценариев и дополнений](topics/menu/scripted-events.md) | — | Расписание, эффекты и комплектный пример |
| [Сценарии: условия и цели](topics/menu/scenarios.md) | 1.2 | Тематический текст |
| [Сетевая игра](topics/menu/multiplayer.md) | 1.3 | Тематический текст |
| [Сохранение и загрузка](topics/menu/save-load.md) | 1.4, 1.5 | Тематический текст |
| [Достижения, статистика Steam и рейтинги](topics/menu/achievements.md) | 1.6 | Тематический текст |
| [Дополнения и мастерская Steam](topics/menu/mods-workshop.md) | 1.7 | Тематический текст |
| [Настройки игры](topics/menu/settings.md) | 1.8 | Тематический текст |
| [Авторы и сторонние компоненты](topics/menu/credits.md) | 1.9 | Тематический текст |

## Интерфейс карты

[Статистика, история карты и летопись](topics/interface/statistics-history.md) охватывает текущие метрики, 11 вкладок мира, страницы живых и исчезнувших держав, снимки владельцев и события. [SRC-139–143]

| Документ | Старые разделы | Содержание |
| --- | --- | --- |
| [Обучение, интерфейс и быстрые команды](topics/interface/onboarding.md) | 2 | Тематический текст |
| [Состояние мира, время и вид](topics/interface/world-status.md) | 2.1 | Тематический текст |
| [Инструменты изменения мира](topics/interface/tools.md) | 2.2 | Тематический текст |
| [Быстрая генерация и сброс общества](topics/interface/world-generation.md) | 2.2.1 | Тематический текст |
| [Наблюдение и карточка клетки](topics/interface/observation.md) | 2.3 | Тематический текст |
| [Слои карты и легенды](topics/interface/map-layers.md) | 2.4 | Тематический текст |

## Природа и симуляция

| Документ | Старые разделы | Содержание |
| --- | --- | --- |
| [WP-BASELINE: сборка, загрузка, данные и часы](topics/simulation/baseline.md) | — | Статическое извлечение и изолированные проверки |
| [WP-DEMOGRAPHY-CITIES: население, здоровье и города](topics/simulation/demography-cities.md) | — | Статическое извлечение и 45 изолированных проверок |
| [Шаги симуляции, ёмкость, ресурсы и расселение](topics/simulation/clock-population.md) | 2.2.1, 2.4 | Тематический текст |
| [Генерация мира, рельеф и недра](topics/simulation/world-terrain.md) | — | Шаблоны, шумы, сток и размещение ресурсов |
| [«Реальная Земля», климатические нормы и имена мест](topics/simulation/real-earth.md) | — | Данные, берега, калибровка и география |
| [Климат, биомы, экология и вода](topics/simulation/climate-ecology.md) | 2.4 | Численные правила, планетарные регуляторы и ограничения |
| [Катастрофы и силы творца](topics/simulation/disasters.md) | — | Природные броски, поля, сроки, сценарии и сохранение |
| [Животные и одомашнивание](topics/simulation/fauna.md) | — | Статическое извлечение и 35 изолированных проверок |

## Государства

| Документ | Старые разделы | Содержание |
| --- | --- | --- |
| [Меню государства и навигация](topics/states/navigation.md) | 2.5 | Тематический текст |
| [Показатели и обзор государства](topics/states/overview.md) | 2.5.1 | Тематический текст |
| [Исторические графики государства](topics/states/history.md) | 2.5.2 | Тематический текст |
| [Дипломатия и международные связи](topics/states/diplomacy.md) | 2.5.3 | Тематический текст |
| [Реестр городов государства](topics/states/cities.md) | 2.5.4 | Тематический текст |
| [Экономика, ВВП, казна и промышленность](topics/states/economy.md) | 2.5.5 | Тематический текст |
| [Товары, торговые пути и доставка](topics/states/trade.md) | 2.5.6 | Тематический текст |
| [Войны и военная история](topics/states/wars.md) | 2.5.7 | Интерфейс и переходы к правилам |
| [Военная симуляция](topics/states/war-mechanics.md) | — | Коалиции, фронт, флот и мир |
| [Ракеты и ядерные эффекты](topics/states/strategic-weapons.md) | — | Арсенал, воздействие и сохранение |
| [Правители, наследование и династии](topics/states/rulers.md) | 2.5.8 | Тематический текст |
| [Летопись государства](topics/states/chronicle.md) | 2.5.9 | Тематический текст |
| [Возникновение держав, политика и распады](topics/states/formation-politics.md) | — | Статическое извлечение и 59 изолированных проверок |
| [Территория: владение и отделение](topics/states/territory.md) | — | Политические, мирные и военные переходы |
| [Технологии, эпохи и открытия](topics/states/technology.md) | — | Статическое извлечение и изолированные проверки |

## Города и персонажи

[Народы, вера и общественный такт](topics/society/cultures-religions.md): статические правила, параметры и пределы.

| Документ | Старые разделы | Содержание |
| --- | --- | --- |
| [Карточка города и жители](topics/society/cities.md) | 2.6 | Тематический текст |
| [Жители, навыки и семейные связи](topics/society/people.md) | 2.7 | Тематический текст и границы модели |
| [Симулируемые персоны, семьи и власть](topics/society/dynasties.md) | — | Статическое извлечение и 63 проверки пакета |
| [Процедурные семьи простолюдинов](topics/society/commoner-families.md) | — | Детерминированные роды, профессии, кэш и память |

## Прогулка

| Документ | Старые разделы | Содержание |
| --- | --- | --- |
| [Режимы прогулки и персонажи игрока](topics/walk/modes-characters.md) | — | Снаряжение, опции и сохранение нескольких героев |
| [Передвижение, здоровье и возрождение](topics/walk/player-life.md) | — | Опоры, опасности, смерть и арест |
| [Процедурный мир прогулки и разрушения](topics/walk/world-generation.md) | — | Планы клеток, чанки, коллизии и журнал повреждений |
| [Жители и охота в прогулке](topics/walk/npc-life.md) | — | Роли, распорядок, персоны, стада и добыча |
| [Лавки, снаряжение и покупной транспорт](topics/walk/shops-equipment.md) | — | Ассортимент, цены, торговля и собственность |
| [Диалоги и взаимодействие с персонажами](topics/walk/dialogues.md) | 2.7.1 | Тематический текст |
| [Журнал прогулки](topics/walk/journal.md) | 2.8 | Тематический текст |
| [Задания и подработки](topics/walk/quests-jobs.md) | 2.8.1 | Тематический текст |
| [Кошельки, валюты и обмен](topics/walk/wallet.md) | 2.8.2 | Тематический текст |
| [Вещи, оружие и лечение](topics/walk/items-healing.md) | 2.8.3 | Тематический текст |
| [Слава, розыск, стража и помилование](topics/walk/reputation-law.md) | 2.8.4 | Свидетели, слава, награда за голову и арест |
| [Дворец, аудиенция и защита правителя](topics/walk/palace-audience.md) | — | Допуск, тревога и помилование |
| [Погоня, полиция и военные базы](topics/walk/pursuit-bases.md) | — | Поиск, наряды, размещение и допуск |
| [Управление, транспорт и время прогулки](topics/walk/controls-time.md) | 2.8.5 | Тематический текст |
| [Транспорт прогулки, каталог и общие переходы](topics/walk/transport.md) | — | 78 записей реестра, модели и подключение AIR/SEA |
| [Дорожное движение](topics/walk/road-traffic.md) | — | Генерация потока, приоритеты, движение и повреждения |
| [Поезда, работа машиниста и переезды](topics/walk/rail.md) | — | Пути, поездки, смены, диспетчер и аварии |
| [Авиация, билеты, работа пилота и аренда](topics/walk/air.md) | — | Аэродром, полёт, пассажир, пилот, дирижабль, угон и парашют |
| [Морской транспорт, порты, работа и экипажи](topics/walk/sea.md) | — | 15 корпусов, палубы, рейсы, груз, экипажи и преследование |
| [Личные действия, торговля и мировой ущерб](topics/walk/world-effects.md) | — | Настоящий груз, ограбление, ракеты, радиация и мировые последствия |
| [Бой, оружие и последствия личных действий](topics/walk/combat.md) | — | 24 оружия, боеприпасы, защита, тяжёлые орудия и смерти |

## Сеть и конкуренция

| Документ | Старые разделы | Содержание |
| --- | --- | --- |
| [Сетевые комнаты, синхронизация и восстановление](topics/network/rooms-sync.md) | — | Подключение, роли, команды, снимки и переподключение |
| [Сетевая прогулка, общий мир и PvP](topics/network/walk.md) | — | Общие акторы, действия гостей, PvP и часы комнаты |
| [Локальная кооперация, Remote Play и соперничество](topics/network/local-coop-rivalry.md) | — | Общий экран, приглашения Steam и состязание держав |
| [Конкуренция и сетевые прогулки](topics/network/competition-walk.md) | — | Связанные темы |

## Исследование и источники

| Документ | Старые разделы | Содержание |
| --- | --- | --- |
| [Машинный отчёт WP-SCENARIOS-PROFILE](research/extraction-scenarios-profile.json) | — | Сценарии, достижения, подсказки, события и проверки |
| [Машинный отчёт WP-LOCAL-MULTIPLAYER](research/extraction-local-multiplayer.json) | — | Диапазоны кода, параметры и изолированные проверки |
| [Машинный отчёт WP-NETWORK-WALK](research/extraction-network-walk.json) | — | Источники, диапазоны, правила и изолированные проверки |
| [Машинный отчёт WP-NETWORK](research/extraction-network.json) | — | Протокол, диапазоны, настройки и изолированные проверки |
| [Машинный отчёт WP-WALK-CORE](research/extraction-walk-core.json) | — | Диапазоны кода, результаты VM и хеши источников |
| [Машинный отчёт WP-WALK-SOCIETY-ECONOMY](research/extraction-walk-society-economy.json) | — | Каталог товаров, генераторы, диапазоны и проверки |
| [Машинный отчёт WP-WALK-LAW-BASES](research/extraction-walk-law-bases.json) | — | Правила закона, дворца и баз, диапазоны и проверки |
| [Машинный отчёт WP-WALK-GROUND-TRANSPORT](research/extraction-walk-ground-transport.json) | — | Каталог транспорта, диапазоны кода и проверки |
| [Машинный отчёт WP-WALK-WORLD-EFFECTS](research/extraction-walk-world-effects.json) | — | Оружие, груз, ракеты, исходные диапазоны и проверки |
| [Машинный отчёт WP-WALK-SEA](research/extraction-walk-sea.json) | — | Корпуса, настройки, исходные диапазоны и проверки |
| [Машинный отчёт WP-WALK-AIR](research/extraction-walk-air.json) | — | Авиационные свойства, настройки, диапазоны кода и проверки |
| [Исторические вопросы исходного документа](topics/research/legacy-questions.md) | 3 | Исторические вопросы |

## WP-MODDING. Data, code, editor and Workshop

Six features traced across 36 source ranges. Fifty isolated checks passed. Extracted data formats, code boot/patching, ModAPI, world sanitation, heightmaps, editor drafts and Workshop lifecycle. Status: `static_traced_runtime_pending`; `runtime_verified=false`. [Modding](topics/modding/data-code-editor.md) · [Evidence](research/extraction-modding.json) [SRC-243–249]

## WP-CUSTOMIZATION. Names, geography and flags

Three features traced across 20 source ranges; 53 isolated checks passed. Extracted seven rename targets, flag validation/editor behavior, player and cultural geography, persistence and editor-role command dispatch. Status: `static_traced_runtime_pending`; `runtime_verified=false`. [Customization](topics/interface/customization.md) · [Evidence](research/extraction-customization.json) [SRC-250–255]

## WP-STORAGE-EDITIONS. Saves and trial edition

Two features traced across 31 source ranges. 28 isolated checks passed. Disk and browser saves, partial writes, legacy migration, the trial clock and edition gates are documented. Full-game runtime remains pending. [Saves](topics/menu/save-load.md) · [Trial edition](topics/menu/demo-edition.md) · [Evidence](research/extraction-storage-editions.json) [SRC-256–261]

## WP-STEAM-PLATFORM. Steam, statistics and records

Two features traced across 40 source ranges. 27 isolated checks passed. The Steam helper lifecycle, local profile union, counters, records and platform callbacks are documented. Full-game runtime remains pending. [Steam integration](topics/platform/steam.md) · [Evidence](research/extraction-steam-platform.json) [SRC-262–266]
