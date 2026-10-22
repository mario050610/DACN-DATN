from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import CORS_ORIGINS
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.ai import router as ai_router
from app.api.v1.routes.chat import router as chat_router
from app.api.v1.routes.auth import router as auth_router

app = FastAPI(title='PREORA Backend API', version='0.1.0', description='PREORA prototype: account auth/shopping, behavior analytics, backend-launched ML training jobs and saved campaign results. Independent HTTP inference remains a reserved integration.')
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])
app.include_router(health_router, prefix='/api')
app.include_router(health_router, prefix='/api/v1')
app.include_router(ai_router, prefix='/api')
app.include_router(chat_router, prefix='/api')
app.include_router(auth_router, prefix='/api')
from app.api.v1.routes.shopping import router as shopping_router
app.include_router(shopping_router, prefix='/api')

@app.get('/')
def welcome():
    return {'message': 'PREORA Backend prototype', 'swagger': '/docs', 'health': '/api/health'}

from app.api.v1.routes.training import router as training_router
app.include_router(training_router, prefix='/api')

from app.api.v1.routes.analytics import router as analytics_router
app.include_router(analytics_router, prefix='/api')

from app.api.v1.routes.seller_training import router as seller_training_router
app.include_router(seller_training_router, prefix='/api')
