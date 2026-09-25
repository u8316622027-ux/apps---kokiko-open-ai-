# Деплой kokiko-openai

## Как собирается образ

Push в `main` или `dev` запускает GitHub Actions (`.github/workflows/docker-image.yml`),
который собирает и пушит в Docker Hub:

- `topf3/kokiko-openai:latest`
- `topf3/kokiko-openai:<git sha>`

Тестов в CI нет — перед push прогоняйте quality gates из `AGENTS.md` локально.

Проверить, что образ обновился: https://hub.docker.com/r/topf3/kokiko-openai/tags
(тег с хешем коммита должен совпадать с `git log -1`).

## Сервер

Сервер **не обновляется автоматически** (Watchtower нет). После каждой сборки контейнер
нужно пересоздать вручную.

- Контейнер: `kokiko-openai`, запущен через `docker run` (без docker compose).
- Порт: `127.0.0.1:8002 -> 8000` (снаружи доступен через reverse proxy).
- Env-файл: `/root/kokiko-openai/.env` — **обязательно** передавать через `--env-file`.
  `.env` в образ не попадает (Dockerfile копирует только `app/`).

### Обновление

```bash
# резервная копия текущего образа для отката
docker tag $(docker inspect kokiko-openai --format '{{.Image}}') topf3/kokiko-openai:rollback

docker pull topf3/kokiko-openai:latest
docker stop kokiko-openai && docker rm kokiko-openai
docker run -d --name kokiko-openai --restart unless-stopped -p 127.0.0.1:8002:8000 \
  --env-file /root/kokiko-openai/.env topf3/kokiko-openai:latest
```

### Откат

```bash
docker stop kokiko-openai && docker rm kokiko-openai
docker run -d --name kokiko-openai --restart unless-stopped -p 127.0.0.1:8002:8000 \
  --env-file /root/kokiko-openai/.env topf3/kokiko-openai:rollback
```

## Переменные окружения

| Переменная | Назначение | Если не задана |
|---|---|---|
| `APTEKA_BASE_URL` | API корзины и поиска | `https://api.apteka.md` |
| `APTEKA_ORDER_BASE_URL` | API оформления заказа | `https://api.apteka.md` |
| `OPENAI_API_KEY` | эмбеддинги для FAQ-поиска | FAQ-поиск падает с ошибкой |
| `OPENAI_EMBEDDING_MODEL` | модель эмбеддингов | значение по умолчанию из кода |
| `SUPABASE_URL`, `SUPABASE_KEY` | FAQ-поиск и логирование MCP-запросов | FAQ не работает, логирование выключено |
| `FAQ_MATCH_COUNT_DEFAULT`, `FAQ_MATCH_THRESHOLD`, `FAQ_EMBEDDING_DIMENSIONS` | настройки FAQ | значения по умолчанию |
| `MCP_WIDGET_DOMAIN` | домен виджета в метаданных шаблона | ngrok-домен из `app/core/config.py` |

### ⚠️ MCP_WIDGET_DOMAIN

В серверном `.env` строка `MCP_WIDGET_DOMAIN=https://kokiko.idoctor.md` **закомментирована
специально**. Опубликованное приложение в ChatGPT ожидает домен по умолчанию из
`app/core/config.py`; при смене домена ChatGPT не находит шаблон виджета
(`Failed to fetch template`, 404 на `backend-api/ecosystem/widget`).

Менять домен можно только вместе с обновлением приложения в настройках OpenAI.

## Заказ

Заказ отправляется `POST {APTEKA_ORDER_BASE_URL}/api/v1/front/order/confirm-order-by-using-mobile`
с `orderType: "ai apps"` (`app/interfaces/mcp/tools/order_tools.py`).

## Проверка после обновления

```bash
# контейнер работает
docker ps --filter name=kokiko-openai --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.CreatedAt}}'
docker logs --tail 20 kokiko-openai

# в контейнере новый orderType, "online" не осталось
docker exec kokiko-openai grep -rn '"orderType"' /app/app
docker exec kokiko-openai grep -rn '"online"' /app/app || echo 'OK: "online" не найден'

# env подхватился (без вывода секретов)
docker exec kokiko-openai sh -c 'for k in APTEKA_BASE_URL OPENAI_API_KEY SUPABASE_URL SUPABASE_KEY MCP_WIDGET_DOMAIN; do eval v=\$$k; [ -n "$v" ] && echo "$k: SET" || echo "$k: EMPTY"; done'

# фактический домен виджета и адрес API, которые использует приложение
docker exec kokiko-openai python -c "from app.core.config import get_settings; from app.interfaces.mcp.tools.apteka_urls import get_apteka_base_url, get_apteka_order_base_url; print('widget domain:', get_settings().mcp_widget_domain); print('api:', get_apteka_base_url()); print('order api:', get_apteka_order_base_url())"
```

Ожидается: `MCP_WIDGET_DOMAIN: EMPTY`, widget domain — ngrok-домен из `config.py`,
api / order api — `https://api.apteka.md`.
