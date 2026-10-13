"""Simple local endpoint check; standard library only."""
from urllib.request import urlopen
from urllib.error import URLError

for service, url in [
    ('Frontend', 'http://127.0.0.1:5173'),
    ('Backend', 'http://127.0.0.1:8000/api/health'),
    ('AI service', 'http://127.0.0.1:8001/health'),
]:
    try:
        with urlopen(url, timeout=3) as response:
            print(f'{service}: HTTP {response.status}, OK')
    except (URLError, TimeoutError) as exc:
        print(f'{service}: NOT RUNNING ({exc})')
