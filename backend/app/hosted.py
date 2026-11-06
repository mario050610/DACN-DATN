"""Single-origin hosting entry point for the existing UI, API and ML worker."""
import os
from pathlib import Path

from fastapi.staticfiles import StaticFiles
from app.main import app


def attach_frontend(application, directory):
    directory = Path(directory)
    if not (directory / 'index.html').is_file():
        raise RuntimeError('Frontend build missing. Run npm ci && npm run build in frontend first.')
    # The development API welcome route owns /. Replace it only in this entry point.
    application.router.routes[:] = [
        route for route in application.router.routes
        if not (getattr(route, 'path', None) == '/' and getattr(route, 'name', None) == 'welcome')
    ]
    # API routes stay first; hash routing needs no catch-all that could mask API 404s.
    application.mount('/', StaticFiles(directory=str(directory), html=True), name='frontend')


attach_frontend(app, os.getenv('FRONTEND_DIST', str(Path(__file__).resolve().parents[2] / 'frontend' / 'dist')))
