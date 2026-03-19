# AGENTS.md

## Prompt-0 (always active)
Эти правила применяются всегда, без исключений, для любых изменений.

### TDD - обязательный цикл
Для любых изменений (фичи, улучшения, рефакторинг, багфиксы):
1. Написать/обновить тест и убедиться, что он падает (Red).
2. Реализовать минимальный код, чтобы тест проходил (Green).
3. Выполнить рефакторинг без изменения поведения (Refactor).

### Quality Gates - обязательно перед завершением задачи
Запускать последовательно:
```bash
npx biome check --apply .
python -m ruff format .
python -m ruff check .
python -m pytest
npx playwright test
```

Все этапы должны пройти без ошибок. Если хотя бы один этап не пройден, задача считается незавершенной: исправить и повторить проверки.

Если конкретная команда (`biome`/`ruff`/`pytest`/`playwright`) еще не настроена в репозитории, сначала добавить настройку и только затем завершать задачу.

### Reporting
Указывать в каждом ответе:
- Какие тесты добавлены/изменены и зачем.
- Какие команды проверок запущены.
- Результат: `biome` / `ruff` / `pytest` / `playwright` (`pass`/`fail` и причина при `fail`).

### Frontend guardrails (кратко)
- Для обычного web UI не держать большие inline `<style>/<script>` в HTML; выносить в `app/widgets/styles/*`.
- Для Apps SDK `ui://widget/*.html` разрешен self-contained inline bundle, если это нужно для стабильной загрузки в sandbox.
- Для bugfix UI обязателен TDD; для новых экранов тесты обязательны до merge.
- Проверять адаптив на `320px`, `768px`, `1280px`.
- Обеспечивать `Accessibility minimum`: `aria-label`, `:focus`, контраст, семантика, клавиатурная навигация.
- Новые frontend-зависимости фиксировать решением в `docs/frontend/decisions/`.

## Git workflow (always)

### Ветки
- Новая задача = новая ветка от `dev`: `feat/`, `fix/`, `refactor/`.
- Формат: `feat/короткое-описание` (пример: `feat/cart-domain-split`).
- Никогда не коммитить напрямую в `main`.

### Коммиты - Conventional Commits
Формат: `<type>(<scope>): <описание>`.

Типы:
- `feat` - новая функциональность.
- `fix` - исправление бага.
- `refactor` - рефакторинг без изменения поведения.
- `test` - добавление/изменение тестов.
- `chore` - настройка инструментов, конфиги.

Примеры:
- `feat(cart): add domain service layer`
- `test(checkout): add unit tests for validators`
- `refactor(tools): split tools.py into domain modules`
- `chore: add biome.json config`

### Порядок действий агента
1. Создать ветку от `dev`.
2. TDD цикл (`Red -> Green -> Refactor`).
3. Пройти quality gates.
4. Коммит с корректным Conventional Commit сообщением.
5. Push ветки на `origin`: `git push origin <branch-name>`.
6. Merge в `dev` + push `dev`: `git push origin dev`.
