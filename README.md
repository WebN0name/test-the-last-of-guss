# The Last of Guss

## Запуск

Нужны Node 22 и Docker. Команды выполняются из корня репозитория.

Postgres:

```bash
docker compose up -d postgres
```

Бэкенд:

```bash
cd backend
cp .env.example .env
cp .env.test.example .env.test
npm ci
npm run migration:run
npm run start:dev
```

Вместо `npm run start:dev` можно собрать и запустить продовую сборку (из `backend/`):

```bash
npm run build
node dist/index.js
```

API: http://localhost:3000, Swagger: http://localhost:3000/api/docs

Фронтенд (в другом терминале):

```bash
cd frontend
cp .env.example .env
cp .env.test.example .env.test
npm ci
npm run dev
```

Игра: http://localhost:5173

Как попробовать: войти под `admin` (пользователь создаётся при первом входе, пароль от 6 символов), создать раунд, во втором браузере или в окне инкогнито войти под другим именем и тапать.

## Схема БД

```mermaid
erDiagram
    users ||--o{ rounds : "создаёт"
    rounds ||--o{ scores : "содержит"
    users ||--o{ scores : "играет"

    users {
        uuid id PK
        text login UK "уникален с учётом регистра"
        text password_hash
        user_role role "admin | survivor | nikita"
        timestamptz created_at
        timestamptz updated_at
    }

    rounds {
        uuid id PK
        uuid creator_id FK "→ users.id"
        timestamptz start_at "created_at + COOLDOWN"
        timestamptz end_at "start_at + ROUND_DURATION"
        integer total_score "счётчик, растёт в транзакции тапа"
        timestamptz created_at
    }

    scores {
        uuid round_id PK, FK "→ rounds.id"
        uuid user_id PK, FK "→ users.id"
        integer taps
        integer score
        timestamptz created_at
        timestamptz updated_at "момент достижения текущего score"
    }
```
