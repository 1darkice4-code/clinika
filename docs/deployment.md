# Деплой

## Production-сценарий

Рекомендуемый базовый вариант:

- VPS с Docker;
- PostgreSQL как отдельный сервис или managed database;
- reverse proxy Caddy, Nginx или Traefik;
- HTTPS через Let's Encrypt;
- регулярные backup базы и медиа;
- отдельные production-секреты.

## Шаги

1. Подготовить сервер и домен.
2. Установить Docker и Docker Compose.
3. Создать `.env` на основе `.env.example`.
4. Задать production `DATABASE_URL`, `APP_URL`, `AUTH_SECRET`.
5. Выполнить:

```bash
docker compose build
docker compose run --rm app npx prisma migrate deploy
docker compose up -d
```

6. Проверить:

```bash
curl https://example.com/api/health
```

## Reverse proxy

Для Caddy:

```caddyfile
example.com {
  encode gzip zstd
  reverse_proxy app:3000
}
```

## Rollback

1. Остановить новый контейнер.
2. Вернуть предыдущий image/tag.
3. Если миграция необратима, восстановить БД из backup.
4. Проверить `/api/health`.

Миграции для production должны проходить ревью до запуска.
