Автоматична перевірка сценаріїв (Playwright, Chromium).
1) У папці сайту: python -m http.server 8800
2) pip install playwright && playwright install chromium
3) python check/scenarios.py   (необов'язковий аргумент: адреса сайту, за замовчуванням http://localhost:8800/)
У кінці виводиться кількість пройдених перевірок. Скрипт змінює лише localStorage власного тимчасового профілю браузера.
