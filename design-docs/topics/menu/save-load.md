# Сохранение и загрузка

[Все темы](../../GAME_DESIGN.md) · [JSON-каталог](../../catalog.json) · [Источники](../../SOURCES.md)

> ID: `DOC-SAVE-LOAD`. Разделы до разбиения: 1.4, 1.5. Версия файлов: 2.1.4.
> Абзацы без SRC-ссылок — утверждения прежнего документа [SRC-012], а не проверка реализации. Кодовые дополнения имеют SRC-идентификаторы; наблюдений в запущенной игре нет.

## 1.4. Сохранить игру

Экран сохраняет текущее состояние мира в новый слот, перезаписывает существующий слот или позволяет выгрузить сохранение в файл.

![][image6]

Рис. 5\. Создание и перезапись сохранений.

### Новое сохранение

В верхнем блоке игрок вводит название карты. Подсказка «пусто — по году» обозначает автоматическое именование, если поле оставлено пустым. Кнопка «Сохранить» находится внизу окна; действие «В файл» размещено справа от поля названия.

### Существующие сохранения

Ниже показаны записи с миниатюрой мира, названием, игровым годом и датой/временем сохранения. На примере присутствует «Автосохранение». У записи есть кнопка «Перезаписать». Текст окна дополнительно сообщает, что клик по существующему сохранению заменяет его текущей игрой.

### Выход из окна

«Отмена» и крестик закрывают окно. Наличие подтверждения перезаписи на изображении не показано; его следует проверить перед окончательным описанием этого действия.

**Проверено по реализации [SRC-018]:** структура сохраняемой партии имеет номер формата `v: 3`, версию приложения, размер карты, текущее зерно, скалярные поля, типизированные массивы состояния карты, державы, войны, историю событий и метаданные городов. Событие `save` даёт подключённым подсистемам записать свои данные в `ext`. Если сохранение открыто поверх главного меню, в запись попадает состояние паузы **до открытия меню**, а не пауза меню. Сама запись в хранилище возвращает имя при успехе и `null` при ошибке. [Порядок записи и частичные ошибки](#write-order-partial-errors-and-migration) описаны ниже. [SRC-256, SRC-261]

### Что важно для игрока

Миниатюра и игровой год помогают распознать нужный мир. Следует различать создание новой записи, замену существующей и экспорт в файл: эти действия представлены отдельными элементами интерфейса.

## 1.5. Загрузить игру

Экран разделяет личные сохранения и стартовые миры из установленных дополнений. Дополнительно доступна загрузка из внешнего файла.

![][image7]

Рис. 6\. Сохранение партии и миры из дополнений.

### Записи сохранений

В верхней части показано автосохранение. Строка включает миниатюру, название, размер карты, игровой год, население, число держав и дату/время. Справа расположены «Загрузить» и кнопка удаления с пиктограммой корзины. Исходное описание указывает, что последнее сохранение располагается сверху; на изображении представлена одна запись.

### Миры из дополнений

Блок «Миры из дополнений» содержит самостоятельные карточки миров. У каждой есть миниатюра, название, название дополнения, размер карты и игровой год. Вместо «Загрузить» показана кнопка «Начать», подчёркивающая запуск мира дополнения. На примере установлены две версии карты Европы: с увеличенными реками и без рек.

### Дополнительные действия

«Из файла…» открывает выбор внешнего сохранения. «Закрыть» и крестик закрывают окно. Диалоги удаления, ошибки несовместимого файла и предупреждения о замене текущей партии в предоставленном материале не раскрыты.

**Проверено по реализации [SRC-018]:** перед применением сохранения проверяются наличие массивов и совпадение размеров сетки с текущей. При загрузке восстанавливаются поля мира и державы, события, войны и метаданные городов; после пересчёта производных полей вызываются обработчики `load` подписанных подсистем. Отсутствующие поля старых сохранений получают резервные значения. Это описание пути загрузки из хранилища, не гарантия полной обратной совместимости любого внешнего файла.

[image6]: ../../assets/image06.png
[image7]: ../../assets/image07.png

## Люди: обычная загрузка и точный адаптер [SRC-091, SRC-092]

[Династии](../society/dynasties.md) описывают компактный ext.people и восстановление связей/живого порядка. peopleNetGet/Set отдельно возвращает точный порядок/_y и исключения навыков. Обе ветви проверены в памяти; диск/комната этим не подтверждаются.

## Товары и морская память [SRC-099–100]

[Товарная модель](../states/trade-mechanics.md) разделяет ext.trade/ext.lanes и точный _trade.netGet/netSet: обычная загрузка округляет/отцепляет суда/теряет скан, RNG и накопители караванов. Точный адаптер возвращает их в общем графе. Проверен в памяти; реальная комната/диск не наблюдались.

## Состояние войны и ракеты

Обычная загрузка восстанавливает войны и арсеналы, удаляет летящие ракеты и оставляет уже существующую очередь ответа в памяти. Точный сетевой снимок передаёт очередь и снаряды. Сценарий W90 проверяет JSON-цикл в памяти. [Ракеты и сохранение](../states/strategic-weapons.md) [SRC-108–109]

## Точки входа из меню

Успех записи нужен для продолжения импорта и для «Сохранить и создать» внутри карты. «Новая игра» из меню может перезагрузиться после неудачной попытки автосохранения. Изолированные проверки покрывают браузерное хранилище в памяти. [Жизненный цикл меню](lifecycle.md) [SRC-110, SRC-113–114, SRC-117]

## Storage backends and slot discovery

`SaveStore` selects disk storage when Node modules and a usable data directory are available. The directory is `saves` under the location two levels above the NW.js profile. The Windows fallback uses `%LOCALAPPDATA%/earth-simulator/saves` or the corresponding `earth-simulator-demo` directory. An unavailable backend falls back to browser storage. The APIs are synchronous: list, read, write, remove, migrate, exists and dir. The `kind` field identifies the selected backend. [SRC-256]

Disk slots use a gzip JSON payload in `.esave` and a separate `.meta.json` sidecar. Discovery requires parseable metadata and a matching payload file. The logical name is stored in the sidecar. File stems replace Windows-invalid characters, trim trailing dots or spaces, cap the base at 80 characters and handle reserved device names. Case-insensitive collisions between discovered stems use numeric suffixes starting at `_2`. Overwriting the same logical slot reuses its discovered stem. [SRC-256]

Browser saves use `earthsim.save.<name>` for JSON and `earthsim.savemeta.<name>` for metadata. The list includes browser slots with readable or absent metadata. It combines both backends, gives disk precedence on a duplicate logical name, and sorts by descending metadata timestamp. The reader detects gzip using its header and accepts old plain JSON payloads. If the selected disk payload fails to decode or parse, the read returns null and stops there. [SRC-256, SRC-261]

## Write order, partial errors and migration

| Operation | Result |
| --- | --- |
| Disk write | gzip at level 6, write temporary payload, rename over the slot payload, then write the sidecar. |
| New disk slot, sidecar failure | The write reports failure. The payload can already be on disk and missing from slot discovery. |
| Disk overwrite, sidecar failure | The write reports failure. The replacement payload can coexist with the prior sidecar if the original metadata survives. |
| Browser payload failure | The write reports `quota` for a storage exception. The game applies no fixed byte quota. |
| Browser sidecar failure | The payload has been saved and the write reports success. The sidecar update can be missing. |
| Remove a discovered slot | The code attempts to remove the disk pair and the browser keys, ignoring individual cleanup errors. |

Rename applies to the payload only. Metadata uses a separate write. The reported `bytes` value is the uncompressed JSON string length in JavaScript. [SRC-256, SRC-261]

Migration runs when disk storage is available. A discovered disk slot takes precedence over a same-name legacy browser slot, so the duplicate browser keys are removed. A valid legacy JSON payload with no discovered disk duplicate is written through the disk backend. A successful write clears the source browser keys and increments the migration count. Invalid payloads and failed disk writes are skipped. A sidecar failure can therefore leave both a disk payload and the retained browser entry. [SRC-257, SRC-261]

## World format and continuation

The world serializer emits `v:3`, application version, dimensions, timestamp, seed, scalar fields, encoded typed arrays, states, chronicle, wars and city metadata. Subscribers store their own data under `ext` through the save event. The loader checks for arrays and matching grid dimensions, permits known typed-array constructors and matching lengths, and restores older structures before emitting load. Compatibility branches include 1.x collection conversions, defaults for missing map arrays and sea baseline, and fauna defaults for older saves. [SRC-018, SRC-258]

Save metadata includes timestamp, dimensions, simulation year, population, living states, era, thumbnail and scenario. Continue selects the newest slot with dimension metadata that is absent from the bad-save list. A failed boot load falls back to generation and records the failed name in a list capped at 20. Ordinary file export downloads world JSON with dimensions and year in its filename. The menu and import paths are documented in [the lifecycle trace](lifecycle.md). [SRC-113, SRC-258]

The disk cases above ran against an isolated filesystem adapter with real gzip. Operating-system interruption, actual old profiles and Steam Cloud synchronization remain unobserved. The [trial edition](demo-edition.md) describes the separate timer record and edition gates. [SRC-259–261]

## 2.2.0 saves and quick load

Save format remains 3 and the app field records 2.2.0. Saving finishes a pending simulation step and records the map pause state from before Walk when the player saves there. Loading calls the migration registry before restoring world fields, then dispatches load handlers after rebuilding derived state. No stock root module registers a transform. Subsystems retain their own initialization when a save lacks their section. [SRC-281]

Quick save and autosave put a stable slot type in metadata. Quick load and replacement of a prior slot also recognize legacy names in Russian, English and the current language. With the default large-map setting, disk F5 and autosave can compress and write in the background above 48,400 cells. Manual save remains synchronous. F9 flushes a deferred F5 action and waits for any pending write before selecting the slot. A disk payload over 16 MiB after unpacking can parse map arrays separately. Disk reads and decompression are synchronous. [SRC-281, SRC-282]

The isolated disk check decoded, wrote and reread one 2.0.0 save and two 2.1.4 saves. The queue check read the newer payload from a German quick slot after commit. An isolated Windows client loaded, rewrote and reopened all three saves. The 2.0.0 world also advanced a year and entered and left Walk. Calling quick save then quick load on a 221×220 map in German reopened the fresh slot. [SRC-283]
