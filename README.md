# Сервер для тестового задания

## Запуск сервера

Для запуска сервера, необходимо в каталоге с исходниками сервера:
1) вызвать команду для установки необходимых зависимостей:
```shell
    npm install
```

2) запустить сервер командой
```shell
    node server.js
```

HTTP сервер поднимается на порту 8080. 

Внутри сервера настроен следующий роутинг:

|       URL       | Описание           |
|-----------------|-------------------|
|/assets/*        | Возвращает файл из папки ./assets |
|/login           | AJAX запрос для формы логина  |
|/websocket?token=| WebSocket для авторизованного пользователя  |
|/**| Все остальные запросы возвращают index.html  |

Клиент должен собираться в index.html и каталог assets. Меня настройки в setting.js можно изменять интервалы между раундами.

## POST /login

Вход по логину и паролю.

**Запрос**:
```
Method: POST
Content-type: application/json
Body: {"username": "user1", "password": "123456"}
```

Пароль всегда - 123456. Username - любой уникальный nickname. 

**Успешный ответ**:
```
Status: 200
Body: {"token": "..."} - token для открытия веб-сокета.
```

**Ответ в случае неверного пароля**:
```
Status: 500
Body: {"error":true,"errorMessage":"Password mismatch"}
```

# /websocket

Веб-сокет используется для получения текущего состояния авторизованной сессии выполнению запросов к серверу.

Для открытия веб-сокета необходимо использовать URL:
ws://localhost:8080/websocket?token=<token>

При закрытии веб-сокета сервером, должна отображаться форма логина.

## Сообщение о текущем статусе

Данное сообщение приходят при открытии веб-сокета и при изменении текущего статуса игры.

Вначале приходит статус **init**. В данном статусе необходимо отобразить: количество игроков в очереди и кнопку "Начать игру". После нажатия кнопки должен отправляться запрос **action=join** и состояние сменится на **wait**.

В состоянии **wait** необходимо отображать кнопку отмены ожидания и количество игроков в очереди. При нажатии на кнопку отмены ожидания, должен отправлять запрос **action=undo_join** и состояние меняется на **init**. Если ожидание завершено и начата игра, то состояние смениться на **game**. 

В состоянии game необходимо отображать
1) экран выбора блок и удара, если **roundCompleted=false**. Выбор отправляется через запрос с **action=game_set_block** и **action=game_set_kick**. Раунд автоматически завершается спустя заданное в timeout количество времени и приходит статус с **roundCompleted=true**.
2) экран отображения результатов предыдущего раунда, если **roundCompleted=true** и **gameCompleted=false**. Следующий раунд автоматически начинается на сервере спустя **game.timeout**. В результате будет отправлено сообщение с новым состоянием **roundCompleted=false**.
3) экран отображения результатов игры, если **roundCompleted=true** и **gameCompleted=true**. Данное состояние автоматически меняется на сервер на **init**.

Формат сообщения:
|       Поле       | Тип | Описание           |
|-----------------|------|-------------|
|**type**        | string | Тип сообщения: **state**
|**state**        | string | Может принимать значения: **init, wait, game**.
|**username**     |  string | Логин текущего пользователя |
|**waitingCount** | int    | Количество пользователей очереди ожидания игры. Поле доступно только для **state=init** и **state=wait**.  |
|**game** | Object | Текущее состояние игры, заполняется только для **state=game** |
|**game.round** | int | Текущий раунд игры (от 1 до 3) |
|**game.completed** | bool| true - если игра завершена и ожидает закрытия. В данном случае необходимо отображать экран результатов игры. |
|**game.roundCompleted** | bool| true - если раунд завершен. В данном случае необходимо отображать экран результатов раунда. Иначе должен отображать экран выбора блока и удара. |
|**game.mine.kick** | int| выбранный удар текущего пользователя (0 не задан, 1-3 верх/середина/низ) |
|**game.mine.block** | int| выбранный блок текущего пользователя (0 не задан, 1-3 верх/середина/низ) |
|**game.mine.score** | int| количество очков текущего пользователя |
|**game.mine.username** | int| nickname текущего пользователя |
|**game.mine.hit** | int| true, если удар текущего пользователя НЕ попал в блок противника (*заполняется только если roundCompleted=true*)  |
|**game.mine.winner** | int| true, если текущий пользователь победил (*заполняется только если gameCompleted=true*)  |
|**game.enemy.kick** | int| выбранный удар противника (*заполняется только если roundCompleted=true*)  |
|**game.enemy.block** | int| выбранный блок противника (*заполняется только если roundCompleted=true*) |
|**game.enemy.score** | int| количество очков противника |
|**game.enemy.username** | int| nickname противника |
|**game.enemy.hit** | int| true, если удар противника НЕ попал в блок текущего пользователя (*заполняется только если roundCompleted=true*)  |
|**game.enemy.winner** | int| true, если противник победил (*заполняется только если gameCompleted=true*)  |
|**game.timeout** | long| timeout в ms до завершения раунда (если roundCompleted=false), до завершения отображения результатов раунда или игры (если roundCompleted=false).  |
|**game.timeoutPassed** | long| сколько времени прошло из заданных в game.timeout. Данное поле необходимо, что бы корректно восстановить progress bar при повторном входе в игру.  |

## Запрос action=join

Данный запрос должен отправляться в статусе **init** для начала ожидания игры и перехода в статус **wait**.

Сообщение отправляемое в веб-сокет:
```json
{"id": 123, "action": "join"}
```

где id - уникальный номер запроса в рамках одной сессий веб-сокета. Данное поле используется для сопоставления запроса и ответа.

Успешный ответ:
```json
{"type": "response", "requestId": 123, "data": "OK"}
```

Ошибка:
```json
{"type": "response", "requestId": 123, "error": true, "errorMessage": "..."}
```

## Запрос action=undo_join

Данный запрос должен отправляться в статусе **wait** для окончания ожидания игры и перехода в статус **init**.

Сообщение отправляемое в веб-сокет:
```json
{"id": 123, "action": "undo_join"}
```

Успешный ответ:
```json
{"type": "response", "requestId": 123, "data": "OK"}
```

Ошибка:
```json
{"type": "response", "requestId": 123, "error": true, "errorMessage": "..."}
```

## Запрос action=game_set_block

Данный запрос должен отправляться в статусе **game** и **roundCompleted=false** для установки зоны блока.

Сообщение отправляемое в веб-сокет:
```json
{"id": 123, "action": "game_set_block", "block": 0-3}
```

Успешный ответ:
```json
{"type": "response", "requestId": 123, "data": "OK"}
```

Ошибка:
```json
{"type": "response", "requestId": 123, "error": true, "errorMessage": "..."}
```

## Запрос action=game_set_kick

Данный запрос должен отправляться в статусе **game** и **roundCompleted=false** для установки зоны удара.

Сообщение отправляемое в веб-сокет:
```json
{"id": 123, "action": "game_set_kick", "kick": 0-3}
```

Успешный ответ:
```json
{"type": "response", "requestId": 123, "data": "OK"}
```

Ошибка:

```json
{"type": "response", "requestId": 123, "error": true, "errorMessage": "..."}
```