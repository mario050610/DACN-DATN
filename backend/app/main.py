from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import CORS_ORIGINS
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.ai import router as ai_router

app = FastAPI(title='PREORA Backend API', version='0.1.0', description='Backend scaffold: business APIs and persistence are next steps.')
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
app.include_router(health_router, prefix='/api')
app.include_router(health_router, prefix='/api/v1')
app.include_router(ai_router, prefix='/api')

@app.get('/')
def welcome():
    return {'message': 'PREORA Backend starter', 'swagger': '/docs', 'health': '/api/health'}
