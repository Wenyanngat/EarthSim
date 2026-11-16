# Передвижение, здоровье и возрождение

[Все темы](../../GAME_DESIGN.md) · [JSON-каталог](../../catalog.json) · [Источники](../../SOURCES.md) · [Управление и время](controls-time.md)

> ID `DOC-WALK-PLAYER-LIFE`. Код поставки 2.1.4 и изолированные проверки с заданным рельефом, водой и обработчиками.

## Движение пешком и в воде

`wkPlayerStep` пропускает погибшего игрока и делегирует управление транспорту при посадке. Открытое окно без паузы отключает управление направлением, прыжком и приседанием. Уже начатое падение и прочие физические обновления продолжаются. Диагональный вектор ограничивается единичной длиной. Стик контроллера при ненулевом вводе заменяет дискретные оси. [SRC-147]

| Параметр | Значение по умолчанию |
| --- | --- |
| Ходьба, бег вперёд, приседание | 4,3 / 7,8 / 1,9 м/с |
| Переноска тяжёлой ноши | До 2,4 м/с, бег и прыжок отключены |
| Плавание | 2,4 м/с, при беге ×1,4 |
| Высота глаз и радиус игрока | 1,68 м стоя, 1,02 м присев, радиус 0,38 м |
| Прыжок и падение | Начальная вертикальная скорость 5,6 м/с, ускорение 16 м/с² |

Вброд скорость снижается при глубине более 0,25 м. Прицеливание умножает пешую скорость на 0,6. Подъём замедляет ход выше уклона 0,55, выше 1,35 движение вверх останавливается и появляется снос вниз. Координаты удерживаются в 6 м от границ карты. Контакт рассчитывается с сеткой готового чанка или аналитической поверхностью. Мосты, настилы и препятствия добавляются по высоте ног. `wkCollide` выталкивает из круга или повёрнутого прямоугольника, возвращает высоту опоры и учитывает подвижные препятствия. [SRC-147, SRC-148]

Плавание начинается при глубине более 1,35 м и ногах ниже уровня воды на 0,85 м. Пружинное приближение держит ноги примерно на 1,28 м ниже поверхности. При нырянии цель опускается до уровня воды минус 3,2 м с ограничением по дну. [SRC-147]

## Урон и восстановление

| Событие | Правило кода |
| --- | --- |
| Падение | При скорости приземления выше 10 м/с урон равен `7 × (скорость − 10)`. |
| Долгое ныряние | Более 14 с в приседе с ногами глубже 1,9 м дают 8 урона и устанавливают счётчик в 12 с. Вне этого условия счётчик убывает на 4 с за секунду. |
| Радиация | При `W.fallout[cell] > 0,3` накапливается местное время. После превышения 1 с наносится `1 + 3 × fallout`, счётчик обнуляется. Чистая клетка приостанавливает накопление. |
| Огонь | `walkstrike.js` проверяет контакт пешего персонажа с локальным источником огня и наносит периодический урон. `W.fire` влияет на местный вид и дым. Пешеходный цикл читает `W.fallout` для урона. |
| Восстановление | Максимум 100 HP. Через 6 с без полученного урона регенерация даёт 2 HP/с; `wkHeal` лечит только живого, с ограничением сверху. |

`wkHurt` сначала проверяет `god`, затем прогоняет урон через `hurt`-обработчики, например броню. При нуле HP ставит `dead` и причину, высаживает из транспорта и вызывает `death`. Если ни один обработчик не взял событие, открывается окно смерти с выбором поселения либо выхода на карту. [SRC-147]

`lawDeath` обрабатывает смерть при розыске, если арест ещё не идёт. Падение, утопление, радиация и звери исключены. Для гибели в машине и причин вне `guard`/`battle` нужен живой стражник или патруль поблизости. Арест может снять деньги и изъять вещи, а награда за голову зависит от тяжести розыска. Освобождение передаёт выбранную клетку в `wkRespawn`. [SRC-147]

`wkRespawn` принимает явную сухую клетку. Иначе ищет первое кольцо до 14 клеток с сухим селом или более крупным поселением. Внутри кольца выбирает наименьший квадрат расстояния. Без кандидата использует прежнюю клетку. Он сбрасывает локальных акторов, создаёт игрока с полным HP и вызывает `arrive('respawn')`. Изменения, уже внесённые в профиль при аресте, сохраняются. Обычный перенос между клетками сохраняет текущее HP, ограничивая его диапазоном 1–100. [SRC-146, SRC-147]

## Survival needs in 2.2.0

Base needs run in Survival while the needs setting is on and the Survival add-on leaves control to the base game. Food and water start at 85. At ordinary walking speed, full bars last 1,800 and 1,200 Walk seconds under neutral conditions. Running multiplies food use by 1.5 and water use by 1.6. Cold and sickness increase food use. Heat increases water use. Apparent temperature uses climate, hour, sun, wind, wetness, clothes, nearby fire and shelter. Sheltered interiors and eligible cabins shield the character from weather and add 7 °C of warmth. [SRC-309]

Food or water below 30, severe thermal strain and sickness suppress health regeneration. Food or water below 8 and body heat outside the −85 to +85 range add periodic damage. The comfort band for apparent temperature is 8 to 30 °C. The body heat bar recovers toward zero inside that band. On entering Survival, food and water each rise to at least 50. Respawn and completed custody raise them to at least 60 and clear thermal strain and sickness. [SRC-309]

Using food or a drink from the bag consumes a unit when the character needs it. The controlled fixture recovered 40 food from roast meat and 40 water from a bottle. A hot character also cooled by 10 points after the drink. Clothes stay in inventory when equipped. [SRC-309, SRC-313]

## Civic treatment in 2.2.0

Hospital eligibility starts at world era 2 and requires Medicine. Fire stations start at era 3. Eligible capitals bypass the population-based sampling used elsewhere. The Walk planner reserves fitting blocks in city tiers for both facilities, and the hospital places a medic and pharmacy near its entrance. [SRC-311]

Treatment is free in standard Walk. Survival treatment charges 0.6 local daily wages, rounded to at least one currency unit, for full health and removal of eligible outbreak infections. A player who cannot pay receives up to 30 HP of first aid. A respawn moved to an eligible city hospital can charge one daily wage in Survival. The fixture observed full recovery from 35 HP for six currency units and recovery from 35 to 65 HP with an empty wallet. [SRC-311, SRC-313]
