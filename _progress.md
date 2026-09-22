# Пересборка песочницы под формат билдера

Цель: агент пишет сразу экраны-HTML по спеке импорта, а не Next-проект.
Перенос в прод — две команды: check (проверка) → push (отправка в билдер).

## Шаги
- [x] dry-режим в /api/screens/import-html (репо alter-miniapp, коммит f1a4f97)
- [ ] template-screens/ — новый шаблон: screens/*.html + meta.json
- [ ] scripts/lab.mjs: new / check / preview / push под новый формат
- [ ] AGENTS.md — агент пишет HTML по спеке
- [ ] README — новый цикл работы
- [ ] Прогон живьём: собрать экран → check → push в тестовый проект

## Не трогаем
- projects/* старые (proba, probe2-5, realty) — остаются как есть
- template/ (Next) — оставляем для случаев, где нужна своя логика
