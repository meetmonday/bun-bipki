# bun-bipki

Telegram-бот с виртуальной экономикой на Bun + SQLite.

### Стек
- **Telegram Bot API** — [GramIO](https://gramio.dev/)
- **База данных** — SQLite через `bun:sqlite` + [Drizzle ORM](https://orm.drizzle.team/)
- **Linter** — [Biome](https://biomejs.dev/)
- **I18n** — `@gramio/i18n` (двуязычный: en/ru)
- **Плагины GramIO** — Scenes, Auto answer callback query, Auto-retry, I18n
- **Другое** — Docker, Husky

### Экономика

Две валюты:
- 🪙 **Бипки** — основная валюта
- 💎 **Мегабипки** — премиум-валюта

| Команда | Описание |
|---------|----------|
| `/balance` | Показать баланс |
| `/transfer <id> <n>` | Перевести бипки пользователю |
| `/transfer_mega <id> <n>` | Перевести мегабипки пользователю |
| `/daily` | Ежедневный бонус (100 бипок + 1 мегабипка) |
| `/history` | История транзакций |
| `/give <id> <n> [bipki\|megabipki]` | Админ: начислить |
| `/take <id> <n> [bipki\|megabipki]` | Админ: снять |

## Разработка

```bash
bun dev
```

Схема БД обновляется автоматически через `migrate()` при запуске. Для генерации новой миграции после изменения схемы:

```bash
bun run generate
```

## Продакшн

```bash
docker compose up -d
```

## Переменные окружения

| Переменная | Описание |
|-----------|----------|
| `BOT_TOKEN` | Токен Telegram бота |
| `DATABASE_URL` | Путь к файлу SQLite (по умолч. `data/bot.db`) |
| `ADMIN_IDS` | ID админов через запятую |
