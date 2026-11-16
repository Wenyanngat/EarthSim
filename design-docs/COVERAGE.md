# Карта покрытия установленной версии 2.1.4

For 2.2.0 coverage, see the [release evidence](research/release-2.2.0.json). The first pass covers build identity, map sizes, frame scheduling and disk saves. The second covers world rules, the historical start, the calendar and climate pins. [SRC-284–287] The third covers politics, diplomacy, stability and development, with fourteen scoped offline observations. [SRC-288–292] The fourth covers regiments, fronts, supply, occupation, air support and Walk casualties, with thirteen scoped offline observations in build 26710925. Three more checks cover that build's map mode and rules indicator. [SRC-293–298] The fifth covers company formation, valuation, equity, nationalisation and vehicle models, with eleven offline observations. [SRC-299–302] The sixth covers terrain, rivers, sea ice, disasters, settlements, landmarks and outbreak state, with fifteen scoped offline observations. [SRC-303–307] The seventh covers Walk interiors, needs and gear, careers, military service, civic treatment and custody, with twelve scoped offline observations. [SRC-308–313] The eighth covers room recovery, shared vehicles and data add-ons, with twelve scoped checks. Its module and release-note routes identify the remaining regression work. [SRC-314–318] The 2.2.0 map-size follow-up covers in-game LAN creation, guest snapshot load, oversized host selections and near-limit solo generation and F5. [SRC-319, SRC-320] The coverage below applies to 2.1.4. [SRC-280–283]


[Анализ публичной дорожной карты](ROADMAP.md) описывает планы релизов отдельно от покрытия установленной версии. Статусы будущих версий приведены по сайту разработчика.

Приоритет извлечения задаётся очередью пользователя в [плане](EXTRACTION_PLAN.md): база, фауна, демография, экономика, политика, династии, торговля, войны и территории. В [JSON охвата](research/feature-scope.json) отмечены восемь главных этапов и 39 связанных фичей. Для зависимостей перед ними требуется только необходимое предчтение.

Статус относится к **исследованию реализации**, не к объёму старого текста. «Не исследовано» не означает отсутствия механики. Источники модулей в колонке поиска — точки входа, но не доказательство работы конкретной функции. Приоритет: сначала вопросы раздела 3 [исходника](Earth%20Simulator%20Дизайн%20Документ.md), затем обнаруженные неописанные системы.

План расширен на все обнаруженные системы: [144 фичи](FEATURE_INVENTORY.md), [29 этапов](EXTRACTION_PLAN.md), [связи фичей, модулей и этапов](research/feature-scope.json). Навигационно просмотрены все 58 собственных корневых JS-модулей [SRC-053–057]. Это полнота распределения по плану, а не завершение исследования поведения систем в таблице. Большинство новых фич остаются `not_researched`; пять фич WP-FAUNA после извлечения повышены до `partial`. Наблюдения остаются задачами этапов.

Тексты по этим системам: [тематический указатель](GAME_DESIGN.md). Машиночитаемые статусы и связи: [catalog.json](catalog.json). Номера в таблице — нумерация до разбиения; она сохранена в `legacy_sections` каталога. После разделения выполнен WP-BASELINE: статические цепочки и 26 изолированных проверок [SRC-058–061]; FEAT-GAME-LOOP теперь исследована частично. Наблюдений полной игры нет.

Baseline: [сборка, загрузка, данные и часы](topics/simulation/baseline.md), [машинный результат](research/extraction-baseline.json). Манифест, 59 внешних скриптов, 99 начальных полей W, boot-ветви, события и часы извлечены. Нужны проверки HUD/SaveStore/нагрузки/сети в копии полной игры [SRC-058–061].

WP-FAUNA использовал минимальное предчтение среды. Полный WP-WORLD-NATURE выполнен после основной очереди. [Фауна](topics/simulation/fauna.md) · [Рельеф](topics/simulation/world-terrain.md) · [Климат и экология](topics/simulation/climate-ecology.md) [SRC-062–066, SRC-118–126]

## WP-WORLD-NATURE

| Область | Статически прослежено | Открытая проверка полной игры |
| --- | --- | --- |
| Генерация, рельеф, вода и ресурсы | Шаблоны, высоты, сток, береговая маска, живое море, залежи и их кэш | Редактор высот, последствия длительного затопления, масштабы сетки |
| Земля и имена | Растры, ресемплинг, калибровка, прорези, география, порядок имён, сохранение | Многолетняя ошибка норм, видимость и положение подписей |
| Климат и экология | Температура, осадки, ветра и течения, биомы, NPP, загрязнение, CO₂ | Скорость и точность длительного прогона на больших картах |
| Управление и сброс | Ползунки, берега при отпускании, ручные поля, природные последствия регенерации и сброса | Живые инструменты, сценарные ограничения и сетевое применение |

Итого 11 фичей, 53 диапазона, 12 файлов, 50/50 изолированных проверок. [Машинный отчёт](research/extraction-nature.json) [SRC-118–126]

## Тематическое покрытие

Катастрофы, силы творца и мутации кистей статически прослежены в WP-DISASTERS-DIVINE. 51 изолированная проверка покрывает десять видов, природные броски, эффекты на тактах, оба пути раздора и сохранение в памяти. Остаются длительные прогоны, настоящий ввод, аудио, визуальные метки и сетевой сеанс. [Катастрофы](topics/simulation/disasters.md) · [Машинный отчёт](research/extraction-disasters.json) [SRC-127–134]

WP-MAP-INTERFACE охватывает 16 фичей. Разобраны поля и цвета слоёв, ввод, инспектор, карточки, метрики и 11 вкладок мировой статистики, хранение истории, хроника и тосты. 59 изолированных проверок выполнены с тестовыми DOM, Canvas и командным адаптером. Остаются визуальные и сетевые наблюдения и измерение производительности. [Слои](topics/interface/map-layers.md) · [Статистика и история](topics/interface/statistics-history.md) · [Машинный отчёт](research/extraction-map.json) [SRC-135–143]

WP-WALK-CORE охватывает девять фичей. Прослежены режимы и персонажи, здоровье и возрождение, генерация и разрушения, переходы сцены, команды, диалоги и журнал. 56 изолированных проверок использовали заданные сцены, данные в памяти и заменители рендерера, DOM и комнаты. [Персонажи](topics/walk/modes-characters.md) · [Местный мир](topics/walk/world-generation.md) · [Машинный отчёт](research/extraction-walk-core.json) [SRC-144–151]

WP-WALK-SOCIETY-ECONOMY охватывает восемь фичей. Извлечены роли, охота, 72 товара, собственность, кошельки, 12 генераторов и расчёт коротких смен, порта, машиниста и пилота. 61 изолированная проверка использовала заданные места, акторов и профиль в памяти. [Жители](topics/walk/npc-life.md) · [Лавки](topics/walk/shops-equipment.md) · [Задания и работа](topics/walk/quests-jobs.md) · [Машинный отчёт](research/extraction-walk-society-economy.json) [SRC-152–160]

WP-WALK-LAW-BASES охватывает пять фичей. Извлечены свидетели, слава, розыск и арест, аудиенция, наряды и базы. 60 изолированных проверок использовали заданные сцены, время, кошельки и адаптеры движения. [Слава и закон](topics/walk/reputation-law.md) · [Дворец](topics/walk/palace-audience.md) · [Погоня и базы](topics/walk/pursuit-bases.md) · [Машинный отчёт](research/extraction-walk-law-bases.json) [SRC-161–168]

WP-WALK-GROUND-TRANSPORT охватывает шесть фичей, 78 записей транспорта и 80 диапазонов. Прошла 51 изолированная проверка. Полный `walkrail.js` исполнялся в VM с заменителями сцены, кошельков, акторов и событий. [Транспорт](topics/walk/transport.md) · [Дорожное движение](topics/walk/road-traffic.md) · [Поезда и переезды](topics/walk/rail.md) · [Машинный отчёт](research/extraction-walk-ground-transport.json) [SRC-169–177]

WP-WALK-AIR охватывает четыре фичи, 73 диапазона и 71 изолированную проверку. Каждый сценарий исполнял полный walkair.js в свежей VM с заданными сценой, кошельком, эпохами и переходами игрока. [Авиация](topics/walk/air.md) · [Транспортный каталог](topics/walk/transport.md) · [Машинный отчёт](research/extraction-walk-air.json) [SRC-178–186]

| Система или экран                               | Раздел до разбиения / тематические документы | Что уже описано                                                                                                              | Чего не хватает                                                                          | Где искать подтверждение                                | Состояние исследования    | Что мешает завершению                                |
| ----------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------- | ---------------------------------------------------- |
| Быстрая генерация и сброс | world-generation.md / lifecycle.md / world-terrain.md | Подтверждения, параметры, сценарий и судьба имён [SRC-114, SRC-117, SRC-120, SRC-125, SRC-126] | Полная игра и активные моды | ui/core/goals/fauna/custom | статически прослежено | runtime ожидается |
| Создание мира, стартовые параметры | 1.1 / world-terrain.md / real-earth.md | Пределы формы, предустановки, boot, типы генерации, прогрев, карты высот [SRC-112, SRC-118, SRC-119, SRC-125] | Фактический старт на крупных сетках и вход из редактора высот | `menu.js`, `core.js`, `main.js`, `mods.js` | статически прослежено | runtime ожидается |
| Климат, вода, рельеф, биомы, экология, ресурсы | 1.1, 2.2, 2.3, 2.4 / climate-ecology.md | Климатическая калибровка, осадки, биомы, плодородие, русла, море и недра [SRC-119, SRC-121–126] | Калибровка на длинном прогоне, последствия затопления, отображение полей | `climate.js`, `ecology.js`, `core.js`, `earthdata.js` | статически прослежено | runtime ожидается |
| Животные | fauna.md | 35 видов, все FAU, плотности/ареалы/расселение, охрана/вымирание, приручение/API/save/load; 35 проверок [SRC-062–066] | Наблюдения длинных траекторий, интерфейса, модовых/сетевых сценариев | `fauna.js` и локальные потребители | статически прослежено, runtime ожидается | Полная игра не наблюдалась |
| Население, поселения, города | demography-cities.md | Ёмкость/адаптация, рост/болезнь/миграция, затопление, городские бюджеты/паспорта и границы NPC; 45 проверок [SRC-067–072] | Длительные сценарии, интерфейс, нагрузка и сеть | civ/people/panels/stats и локальные потребители | статически прослежено, runtime ожидается | Полная игра не наблюдалась |
| Державы, политика и территория | formation-politics.md / territory.md | Основание/реформы/стабильность/decline/распады/вассалы/федерации/блоки; 59 проверок [SRC-079–085] | Полные династии, военные исходы, наблюдения игры | civ/society и локальные people/stats | политика статически прослежена; runtime ожидается | Полная игра не наблюдалась |
| Технологии и открытия | technology.md | Местная наука, 8 эпох/58 открытий, первенство/диффузия/save/backfill; 41 проверка [SRC-074, SRC-076–078] | Длинная гонка в игре, действующие моды, настоящие старые сейвы и сеть | civ/trade/people/stats и локальные потребители | статически прослежено, runtime ожидается | Полная игра не наблюдалась |
| Армия, боевая мощь, дипломатическая сила        | 2.5.1, 2.5.3                                 | Формулы и направление сравнения [SRC-014–016]                                                                                | Частота пересчёта и источники коэффициентов                                              | `civ.js`, `stats.js`, `people.js`                       | исследовано частично      | Нет полного цикла обновления                         |
| Экономика, производство, торговля, маршруты | economy-technology.md / trade-mechanics.md / trade-navigation.md | Макроэкономика:41, товарная цепочка/носители/город/потоки/save/локальная навигация:71 проверка [SRC-073–078, SRC-093–100] | Полная игра/окна/долгая динамика/старые сейвы/диск/сеть; полный военный исход | trade/civ/walkeco/walktrade | статически прослежено, runtime ожидается | Профиль не склад; судовые выплаты не val; точный адаптер отдельно |
| Дипломатия, союзы, вассалы, перемирия           | 2.5.3                                        | Сила, граница и видимые связи [SRC-016]                                                                                      | Условия договоров, источник длины границы                                                | `civ.js`, `stats.js`                                    | исследовано частично      | Нет цепочки расчёта соседей                          |
| Войны, армии, сражения | war-mechanics.md / territory.md / strategic-weapons.md | Сухопутный фронт, флот, мир, ракеты, 16 групп владения и 91 проверка [SRC-101–109] | Полная игра, ход долгих войн, окно, диск и сеть | civ/people/society/climate/ecology/menu | статически прослежено | runtime ожидается |
| Правители, дома, наследование и родословные | dynasties.md / rulers.md | Семьи/3 закона/регентство/выборы/кризисы/реставрации/унии/память; 63 проверки [SRC-086–092] | Долгая динамика, canvas/UI, настоящие старые сейвы, диск/сеть и полные военные исходы | people/civ/society/menu/net | статически прослежено, runtime ожидается | Полная игра не наблюдалась |
| Персонажи, навыки, черты, семья | people.md / commoner-families.md | Все 20 черт/навыки, процедурные роды/профессии/кэш/биография/геометрия; 63 проверки пакета [SRC-086–092] | Полные диалоги/работа/бой прогулки и отрисовка остаются своими пакетами | people/walkact | модель статически прослежена, runtime ожидается | W.pop/PEOPLE/NPC — разные структуры |
| Прогулка, взаимодействие и бой                  | 2.7–2.8.5                                    | Вход/выход, два времени, E/F и приоритет окон, модулей и транспорта [SRC-039–041, SRC-045]                                   | Урон, разные виды транспорта и сетевые часы в деле                                       | `walk.js`, `walkact.js`, `walkmil.js`, `walkair.js`     | исследовано частично      | Нет наблюдения в игре                                |
| Диалоги, задания, труд, вещи, деньги, обмен     | 2.7.1–2.8.3                                  | Отбор цели, варианты диалога, генераторы поручений, смены, курс/комиссия, лечение; рис. 42 [SRC-041–045]                     | Проверить живые ветви задач, экипировку, торговый груз в прогулке                        | `walkact.js`, `walkeco.js`, `walksea.js`                | исследовано частично      | Варианты случайны, нет тестового сеанса              |
| Слава, закон, дворец, полиция и базы | reputation-law.md / palace-audience.md / pursuit-bases.md | 74 диапазона и 60 проверок для свидетелей, наказаний, награды за голову, двора и баз [SRC-161–168] | Полная погоня, сохранение и загрузка, двор и база в сцене, синхронизация комнаты | walkact/law/eco/gen/mil/air/sea | статически прослежено | полное наблюдение ожидается |
| Статистика, графики, хроника                    | 2.1, 2.5.1–2.5.2, 2.5.9                      | Нормирование двух рядов обзора [SRC-017]                                                                                     | Интервалы, логарифм, события                                                             | `stats.js`, `panels.js`, `render.js`                    | исследовано частично      | Не разобрано накопление истории                      |
| Слои карты и легенды                            | 2.4                                          | Список слоёв                                                                                                                 | Шкалы, порядок, 2D/3D                                                                    | `render.js`, `world3d.js`, `ui.js`                      | не исследовано            | Не открыты состояния легенд                          |
| Сценарии, цели, достижения, обучение            | 1.2, 1.6, 2                                  | Карточки и подсказки                                                                                                         | Условия победы/поражения, прогресс                                                       | `goals.js`, `achievements.js`, `tutorial.js`, `menu.js` | не исследовано            | Моды учитывать отдельно                              |
| Сохранение, загрузка, настройки | save-load.md / lifecycle.md | Boot, Continue, импорт, отмена и ошибки записи [SRC-110–113, SRC-117] | Дисковый транспорт, графический интерфейс, старые сейвы | menu/main/savestore | статически прослежено на границе меню | runtime ожидается |
| Сетевая игра                                    | 1.3                                          | Новости по тексту 2.1.4                                                                                                      | Права, синхронизация, подключение                                                        | `net.js`, `netui.js`, `coop.js`                         | не исследовано            | Нет сетевого сеанса                                  |
| Add-ons and extension points | data-code-editor.md | Data, code, editor, worlds and Workshop; 50 isolated checks [SRC-243–249] | Full game, real disk, image decoding and Steam | mods/modboot/modedit/steam | Static trace complete | Runtime pending |
| Воздушный, морской и рельсовый транспорт        | 2.8.5                                        | Команды прогулки                                                                                                             | Доступность и взаимодействие                                                             | `walkair.js`, `walksea.js`, `walkrail.js`               | не исследовано            | Нет сквозных цепочек                                 |
| Конкуренция и сетевые прогулки                  | Отдельный документ network/competition-walk  | Найдены UI соперничества, команды, годовые/сохраняемые состояния и регистрации общих акторов прогулки [SRC-055, SRC-056]     | Полные правила, права, результат и согласованность сетевого сеанса                       | `rival.js`, `coop.js`, `netwalk.js`                     | не исследовано полностью  | Нет наблюдения режимов в сеансе                      |

## WP-ECONOMY-TECH, 2026-11-15

[Экономика](topics/states/economy.md), [технологии](topics/states/technology.md), [JSON](research/extraction-economy.json): ресурсы/шельф, ВВП/казна, промышленность, восемь эпох/58 открытий, армия/мощь, передача знаний/save/backfill; 41 изолированная проверка [SRC-073–078]. Статически прослежено, runtime ожидается. Полные товары/маршруты/политика/войны/история/UI/диск/сеть остаются отдельными пакетами. Следующий — WP-POLITICS-SOCIETY.

## Культуры и веры: WP-POLITICS-SOCIETY

[Тема](topics/society/cultures-religions.md), [JSON](research/extraction-politics.json): все SOC, ассимиляция/этногенез/восстания, полосное единство, рождение/обращение/раскол/смерть/возвращение веры [SRC-081, SRC-085]. 59 изолированных проверок пакета; длинная динамика/рендер/сеть не наблюдались. Следующий — WP-PEOPLE-DYNASTIES.

## WP-PEOPLE-DYNASTIES, 2026-11-15

[Династии](topics/society/dynasties.md), [простолюдины](topics/society/commoner-families.md), [JSON](research/extraction-dynasties.json): 63 изолированные проверки, SRC-086–092. Обычная упаковка и точный people-адаптер разделены; сеть/диск не наблюдались. Следующий — WP-TRADE-NAVIGATION.

## WP-TRADE-NAVIGATION, 2026-11-15

[Модель](topics/states/trade-mechanics.md), [навигация](topics/states/trade-navigation.md), [JSON](research/extraction-trade.json): 71 изолированная проверка, 45 диапазонов/11 файлов [SRC-093–100]. Полная игра/рендер не наблюдались. Следующий — WP-WORLD-WARS-TERRITORY.

## WP-WORLD-WARS-TERRITORY, 2026-11-15

Извлечены армия, объявление войны, коалиции, сухопутные и морские бои, мир, стратегические удары и смена владельца. 64 исходных диапазона, 17 файлов, 16 групп переходов и 91 проверка. Статус `static_traced_runtime_pending`. Восемь основных этапов статически извлечены. Следующий по `deferred_queue` — WP-MENU-LIFECYCLE. [Военная симуляция](topics/states/war-mechanics.md) · [Территория](topics/states/territory.md) · [Машинный отчёт](research/extraction-wars.json) [SRC-101–109]

## WP-MENU-LIFECYCLE, 2026-11-15

Прослежены меню, пауза, «Продолжить», наборы, boot, запись и загрузка, выход, регенерация, сброс, новости и авторы. 58 изолированных проверок, 49 диапазонов и 20 файлов. Статус `static_traced_runtime_pending`. Следующий этап — WP-WORLD-NATURE. [Жизненный цикл меню](topics/menu/lifecycle.md) · [Машинный отчёт](research/extraction-menu.json) [SRC-110–117]

## WP-WALK-GROUND-TRANSPORT, 2026-11-15

Извлечены транспортный реестр, дорожный поток, обычная и военная наземная модель, билеты, кабина и рельсовый маршрут, смена машиниста, занятость пути, аварии и переезды. AIR и SEA имеют каталог записей и проверенные точки подключения. Полное движение и услуги этих модулей продолжаются в очереди. Полная сцена, синхронизация комнаты, диск, визуальная проверка и производительность остаются открытыми. [Транспорт](topics/walk/transport.md) · [Дорожное движение](topics/walk/road-traffic.md) · [Поезда и переезды](topics/walk/rail.md) · [Машинный отчёт](research/extraction-walk-ground-transport.json) [SRC-169–177]

## WP-WALK-AIR, 2026-11-15

Прослежены аэропорты и воздухоплавательные станции, поколения борта, очередь полосы и рулёжки, модели самолёта, вертолёта и дирижабля, пассажирское обслуживание, пилотская работа, аренда, угон и парашют. Изолированные проверки покрывают численные границы и выбранные исходы. Полная сцена, движущаяся палуба, перехват, визуальные переходы, звук, диск и сеть остаются для наблюдения. [Авиация](topics/walk/air.md) · [Транспортный каталог](topics/walk/transport.md) · [Машинный отчёт](research/extraction-walk-air.json) [SRC-178–186]

## WP-WALK-SEA, 2026-11-15

Прослежены четыре фичи, 15 корпусов, 87 диапазонов в девяти файлах. Прошла 91 изолированная проверка полного walksea.js. Извлечены порты, палубы, смены, билеты, экипажи, захват, преследование, паника и затопление. Статус `static_traced_runtime_pending`. Модели карты, баланса, ввода и создания транспорта заданы стендом. Рендер, полный бой и погоня, диск и сеть остаются для наблюдения. [Морской транспорт](topics/walk/sea.md) · [Транспортный каталог](topics/walk/transport.md) · [Машинный отчёт](research/extraction-walk-sea.json) [SRC-187–195]

## WP-WALK-WORLD-EFFECTS, 2026-11-15

Прослежены три фичи, 105 диапазонов в 13 файлах. Прошли 129 изолированных проверок: 33 торговых, 48 ракетных и 48 боевых. Проверены 21 исходный файл и тестовые копии. Статус `static_traced_runtime_pending`. Торговля и STRIKE исполнялись с моделью и адаптерами; боевые проверки использовали точные выбранные функции. Полная сцена, AI, визуальные эффекты, диск и комната остаются открытыми. [Влияние на мир](topics/walk/world-effects.md) · [Бой и оружие](topics/walk/combat.md) · [Машинный отчёт](research/extraction-walk-world-effects.json) [SRC-196–210]

## WP-NETWORK, 2026-11-15

Прослежены шесть фичей и 68 диапазонов кода. Прошли 65 изолированных проверок. Извлечены комнаты, права, присутствие, порядок ходов, снимки и восстановление. Статус `static_traced_runtime_pending`. [Сетевые комнаты](topics/network/rooms-sync.md) · [Машинный отчёт](research/extraction-network.json) [SRC-211–218]
Диспетчер сервера и клиентские модули проверены в памяти. Настоящие сокеты, Steam, полная карта и интерфейс остаются для наблюдения. [SRC-218]

## WP-NETWORK-WALK. Сетевая прогулка, общий мир и PvP

Прослежены две фичи и 45 диапазонов кода. Прошли 29 изолированных проверок. Извлечены присутствие, общий мир, действия гостей, PvP, часы и погода. Статус `static_traced_runtime_pending`. [Сетевая прогулка](topics/network/walk.md) · [Машинный отчёт](research/extraction-network-walk.json) [SRC-219–225]

Участники группируются по расстоянию. Ведущий прогулки ведёт общих акторов, получатель PvP ведёт собственное здоровье. Для охоты удалённого игрока обработчик ведущего комнаты требует роль редактора. [SRC-220, SRC-222, SRC-223]

## WP-LOCAL-MULTIPLAYER. Общий экран, Remote Play и соперничество

Прослежены три фичи и 37 диапазонов кода. Прошли 24 изолированные проверки. Извлечены места гостей, действия на общей карте, раздельный ввод Steam, выбор держав и счёт соперничества. Статус `static_traced_runtime_pending`. [Локальная кооперация и соперничество](topics/network/local-coop-rivalry.md) · [Машинный отчёт](research/extraction-local-multiplayer.json) [SRC-226–231]

Гости общего экрана пользуются своим указателем и кистью на общей карте. Соперничество сохраняется как часть мира и получает новый счёт на годовом шаге. [SRC-226, SRC-227, SRC-230]

## WP-SCENARIOS-PROFILE. Сценарии, обучение и профиль

Извлечены 13 встроенных сценариев с 45 целями, 32 достижения, 13 шагов обучения, 11 подсказок и расписание событий дополнений. Прослежены 68 диапазонов кода. Прошли 32 изолированные проверки. Статус `static_traced_runtime_pending`. [Сценарии](topics/menu/scenarios.md) · [Достижения](topics/menu/achievements.md) · [Обучение](topics/interface/onboarding.md) · [События](topics/menu/scripted-events.md) · [Машинный отчёт](research/extraction-scenarios-profile.json) [SRC-232–238]

Текущий сценарий и расписание лежат в сохранении мира. Отметки завершения, достижения и настройки обучения принадлежат локальному профилю. [SRC-233, SRC-235–237]

## WP-MODDING. Data, code, editor and Workshop

Six features traced across 36 source ranges. Fifty isolated checks passed. Extracted data formats, code boot/patching, ModAPI, world sanitation, heightmaps, editor drafts and Workshop lifecycle. Status: `static_traced_runtime_pending`; `runtime_verified=false`. [Modding](topics/modding/data-code-editor.md) · [Evidence](research/extraction-modding.json) [SRC-243–249]

## WP-CUSTOMIZATION. Names, geography and flags

Three features traced across 20 source ranges; 53 isolated checks passed. Extracted seven rename targets, flag validation/editor behavior, player and cultural geography, persistence and editor-role command dispatch. Status: `static_traced_runtime_pending`; `runtime_verified=false`. [Customization](topics/interface/customization.md) · [Evidence](research/extraction-customization.json) [SRC-250–255]

## WP-STORAGE-EDITIONS. Saves and trial edition

Two features traced across 31 source ranges. 28 isolated checks passed. Disk and browser saves, partial writes, legacy migration, the trial clock and edition gates are documented. Full-game runtime remains pending. [Saves](topics/menu/save-load.md) · [Trial edition](topics/menu/demo-edition.md) · [Evidence](research/extraction-storage-editions.json) [SRC-256–261]

## WP-STEAM-PLATFORM. Steam, statistics and records

Two features traced across 40 source ranges. 27 isolated checks passed. The Steam helper lifecycle, local profile union, counters, records and platform callbacks are documented. Full-game runtime remains pending. [Steam integration](topics/platform/steam.md) · [Evidence](research/extraction-steam-platform.json) [SRC-262–266]

## WP-INPUT-ACCESS. Input, language and units

Six features traced across 41 source ranges. 32 isolated checks passed. Keyboard, controller, on-screen text input, dictionaries and units are documented. Full-game runtime remains pending. [Input and localization](topics/interface/input-localization.md) · [Evidence](research/extraction-input-access.json) [SRC-267–273]

## WP-PRESENTATION. Graphics, sound and music

Six features traced across 64 source ranges. 22 isolated checks passed. The 2D and 3D maps, walk rendering, quality and settings, sound effects, ambience and procedural music are documented. Full-game runtime remains pending. [Graphics, sound and music](topics/interface/graphics-audio.md) · [Evidence](research/extraction-presentation.json) [SRC-274–279]
