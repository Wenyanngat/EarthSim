# Возникновение держав, политика и распады

[Все темы](../../GAME_DESIGN.md) · [Каталог](../../catalog.json) · [Народы и вера](../society/cultures-religions.md) · [Территория](territory.md) · [Дипломатия](diplomacy.md) · [Машинный результат](../../research/extraction-politics.json) · [Источники](../../SOURCES.md)

> ID: DOC-STATE-FORMATION. Поставка 2.1.4, извлечение 2026-11-15. WP-POLITICS-SOCIETY статически прослежен: 41 исходный диапазон, 13 хешированных файлов, 59 изолированных проверок. Полная игра не наблюдалась; runtime_verified=false [SRC-079–085].

## Вызовы и порядок [SRC-079, SRC-084]

civTick сначала обновляет среду обитания/население/миграцию/адаптацию и освобождает обезлюдевшие клетки. Естественное основание идёт каждый третий civ-тик. Для каждой державы: агрегаты/наука/армия, городская аллокация, расширение каждый второй тик, стабильность. На тиках расширения checkSecession вызывается по условию `(((_ct>>1)+st.id)%6)===0`: раз в 12 civ-тиков на державу. После всех держав идут дипломатия и societyTick, далее поздние системы.

Годовой обработчик общества вызывается событием year, не делением _ct на календарный коэффициент. Он сначала рассчитывает среднюю площадь и число живых вер, затем для каждой державы выполняет реформу, возможное рождение веры, попытку восстания и этногенез; после обхода — возможный раскол веры. Единство берётся из прежнего полосного обхода, а не из мгновенной переписи.

## Естественное и ручное основание [SRC-079]

```text
stateCap = clamp(round(26*sqrt(sum(LANDMASS.n)/1900)),6,72)
```

Число суши кэшируется по W.terrainVer; при пустом суммарном счётчике используется 1. Это ориентир для числа держав, не общий запрет на создание. nucleateStates перед обходом проверяет aliveCount>=stateCap, затем делает до 500 случайных выборок клеток и создаёт не более MAX_NUCLEATE=1:

- stateId строго −1, клетка сухая;
- pop>1300, foodCap>0, pop/foodCap>.6;
- отдельная проверка Math.random()<.32.

Новая держава получает одну клетку, событие stateNew с how=tribe и запись found. pop/area объекта пока остаются начальными нулями; последующий агрегатор снимет данные клеток. Ручной foundStateAt проверяет только воду и уже занятую клетку, обходя естественные пороги/численный лимит. UI foundCity сначала поднимает pop до 14000, urban до 9000, devLevel до 200, hab минимум до .3; поэтому прямой вызов функции на пустой клетке не равен обычному нажатию инструмента [SRC-079, SRC-085].

## Идентичность и начальные поля [SRC-079, SRC-084]

newStateObj переиспользует первый мёртвый слот: id может повториться, gen растёт на 1. У всех держав из relations/truce/_foes удаляется этот id. Сквозной uid берётся из растущего _stateSeq и не переиспользуется. Цвет зависит от последовательности; имя даёт genName; born равен текущему дробному simYear. Полная форма stateBlank сохранена в JSON: техноуровень/эпоха/казна/армия/площадь/население 0, стабильность 1, gdpPc 250, literacy 0, lifeExp 25, happiness .6, rm={tech:1,stab:0,war:1,dip:0,growth:1}, новые Set/Map и нулевые ресурсные счётчики.

announceState записывает origin, parent=id и parentGen, затем синхронно испускает stateNew. Порядок обычных скриптов — society перед people перед stats. Общество назначает культуру/веру/строй; people выбирает выборного лидера либо восстановление дома/младшую ветвь/нового основателя; stats создаёт историческую запись. Эти соседние обработчики прочитаны статически, полный двор и династии остаются следующему пакету. Ошибка подписчика перехватывается шиной; наши проверки отдельно падают при такой записи ошибки [SRC-082, SRC-084, SRC-085].

При рождении культура берётся с клетки столицы, а при secede/revolt — взвешенное большинство клеток либо культура родителя; если нет — создаётся новая. Ненулевые старые культуры клеток сохраняются. С родителем вера берётся по большинству либо от родителя; без него — со столицы. Мятеж современной индустриальной державы получает республику; имперский родитель передаёт монархию, федерация — республику, прочие строи копируются. Без родителя ручное основание получает вождество, естественное — племя. Восстание чужой культуры может с вероятностью .6 вернуть её историческое home-имя, если оно свободно [SRC-079, SRC-081].

## Стабильность, истощение и упадок [SRC-080]

```text
reach = 8+.8*tech+2.5*eraLin(era)
hold = reach*(gov==='empire'?11:6)
oversize = clamp01((area-hold)/hold)
unrest = среднее W.unrest по клеткам
share = area/_landCells
если share>.10:
  decline = min(1,decline+.003/23.2*civPace()/.34*(share/.10)*(golden>0?.3:1))
иначе decline = max(0,decline-.0004)
faithW = era<6 ? .10 : .03
target = clamp01(1-.6*unrest-.5*oversize+gov.stab+rm.stab
                 -.30*(1-cultUnity)-faithW*(1-relUnity)-.25*exhaust-.62*decline)
stability += (target-stability)*.1
```

civPace=(W.pace||1)*.34. Делитель 23.2 — встроенная численная нормировка, не новый календарный таймер. Упадок зависит от доли всей суши, не только от строя «империя»; золотой век уменьшает накопление до .3. Стабильность использует уже новый decline и прежний exhaust. В мирное время при exhaust>0 он затем умножается на .985 и обнуляется ниже .004; в войне эта ветвь восстановления отключена.

Если после сглаживания stability<.25 и area>4, по геометрическому расстоянию от столицы отбираются самые дальние ceil(.35*число клеток). _breakaway с how=revolt создаёт жизнеспособные осколки либо освобождает землю. Стабильность метрополии становится .5, положительный decline умножается на .85. Это детерминированный порог, не отдельная случайная проверка; число .35, а не ровно треть. Дальняя досягаемость и культурное восстание — другие механизмы, см. [территорию](territory.md) [SRC-080, SRC-085].

## Смена строя [SRC-082]

setGov отвергает прежний/неизвестный строй и мёртвую державу. Пишет gov и _govY=simYear. Революция даёт stability−.10, переворот +.10, с clamp 0…1; обычная реформа напрямую стабильность не меняет. silent подавляет событие хроники, но сохраняет govChange и его последствия у people/stats.

_govYear использует since=simYear−(_govY||−1e9). При since<12 выход; calm означает since>=40. Нулевой _govY трактуется как отсутствующий, что обходит блокировку. Ранние переходы племя/вождество после смены отодвигают _govY на 30 лет назад: следующий переход возможен уже на следующем годовом событии, если остальные условия выполнены [SRC-082, SRC-085].

Все вероятности ниже — сравнения Math.random()/SOC.GOV_P<p, при базовом GOV_P=1. Ветви одного исходного строя проверяются в указанном порядке. После неуспешного броска следующая подходящая ветвь может сделать собственный бросок; успешная смена завершает выбор для этого строя.

| Из | В | Условия | p | Тип |
| --- | --- | --- | --- | --- |
| Племя | Вождество | area>=6 или era>=1 | .15 | реформа, дата −30 |
| Вождество | Монархия | era>=1, cityCount>=1 | .10 | реформа, дата −30 |
| Монархия | Империя | calm и ((area>avgArea*2.2 и area>=25) либо (вассал>=1 и area>=18)) | .08 | реформа |
| Монархия | Теократия | calm, 1<=era<4, вера есть, relUnity>.85 | .0015 | реформа |
| Монархия | Республика | era>=2, urbanPct>.3, stability<.45 | .03 | революция |
| Монархия | Республика | calm, era>=4, literacy>.6 | .004 | реформа |
| Империя | Монархия | calm и (area<14 или area<avgArea*1.1) | .10 | реформа |
| Империя | Республика | era>=4, stability<.4 | .04 | революция |
| Теократия | Республика | calm, era>=4, literacy>.4 | .04 | реформа |
| Теократия | Монархия | stability<.35 | .04 | переворот |
| Республика | Демократия | calm, era>=4, literacy>.6, stability>.55 | .012 | реформа |
| Республика | Диктатура / монархия | stability<.4; диктатура при era>=4 | .06 | переворот |
| Демократия | Диктатура | stability<.38 | .06 | переворот |
| Демократия | Технократия | calm, era>=7, tech>18 | .03 | реформа |
| Диктатура | Демократия | stability>.65, literacy>.5 | .025 | революция |
| Диктатура | Республика | stability<.22 | .08 | революция |
| Технократия / федерация | Диктатура | stability<.25 | .05 | переворот |

GOV задаёт отдельные hered/free, stab/tech/war и титулы; полная таблица находится в JSON. Реформа наследственного строя обычно сохраняет человека с новым титулом; ненаследственные переворот/революция могут заменить лидера, обычная реформа продлевает/обновляет срок. Переход через границу наследственности идёт через отречение/выборы либо реставрацию/новый дом. Редкая федерация из дипломатии отличается от династической унии people.js; полный разбор последней — WP-PEOPLE-DYNASTIES [SRC-082].

## Проверки и пределы [SRC-085]

59 изолированных проверок настоящих core/climate/ecology/civ/society, включая граничные сравнения, события, смену владельца, распады, реформы, полосные счётчики, веры, восстания, блоки и память. Первые два расхождения исправлены в фикстурах: terrainVer надо инициализировать числом, расширению нужен накопленный целый бюджет. Игровые файлы не менялись.

Не наблюдались полная игра, длинные случайные траектории, настоящий двор/летопись, производительность, диск/сеть и действующие моды. Результат static_traced_runtime_pending. Затем извлечён [WP-PEOPLE-DYNASTIES](../society/dynasties.md); следующий — WP-TRADE-NAVIGATION [SRC-086–092].

## Government, ideology and stability in 2.2.0

The shipped government table has 19 forms. The nine additions are duchy, emirate, sultanate, khanate, caliphate, constitutional monarchy, merchant republic, military junta and workers' republic. The annual society pass checks the elapsed time since the last change, then runs the new transitions before the older branches. An automatic change has a 12-year minimum. Branches marked calm require 40 years, with backdated government years accelerating the tribe and chiefdom transitions. Player commands select any recognized form, set a 20-year automatic reform hold and respect the rivalry lock. Revolutions subtract 0.10 stability and coups add 0.10 before the government-change event reaches the ruler and political systems. [SRC-288]

The reform checks run in source order. Small vassal monarchies can become duchies. Horses and a 40% steppe share open the khanate path. Arid monarchies can become emirates, and prosperous small coastal monarchies can become merchant republics. Calm industrial monarchies and empires with literacy and stability above 0.6 can become constitutional monarchies. Low stability opens coup or revolution branches, while faith, territorial growth, contraction, technology and era determine the paths out of the new forms. The exact ordered conditions and chances are in the [source anchors](../../research/release-2.2.0.json). [SRC-288]

There are eight ideologies plus an empty course. The annual course draw weighs permitted candidates by era, government, domestic conditions and friendly neighbours. The current course gets triple weight. After eight years, free forms have a 5% annual chance to redraw and non-free forms a 2% court chance. A sufficiently advanced nation can also acquire its first course, and an incompatible course is reconsidered when the form or era changes. A player choice holds for 20 years. Severe instability with low happiness, recent defeat or high exhaustion can still produce a radical takeover if revolts are enabled. The political course draw is independent of the ruler's term. [SRC-288]

Stability moves 10% of the distance to its clamped target each simulation update. The target starts at 1 and includes unrest, land beyond administrative reach, decline, cultural and religious disunity, exhaustion, government, ruler, temporary calm, political modifiers and the ordinary stability burden. Decline pressure grows with excess share of habitable land, oversize territory, cultural disunity, exhaustion and stability below 0.5. Recovery above the good-order threshold doubles during a golden age or temporary calm and halves during war. The collapse rule scales pressure and the collapse threshold by 1, 0.35 or 0. [SRC-291]

In the offline fixture, the monarchy-to-empire command retained the ruler and the empire-to-republic command installed an elective leader. A measured stability update followed the displayed target formula. [Desktop observations](../../research/release-2.2.0.json) [SRC-292]
