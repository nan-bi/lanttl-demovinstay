from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router
from src.config import get_settings
from src.agents.graph import build_graph
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print(f"Starting {settings.app_name} at Vinhomes Ocean Park in {settings.app_env} mode")
    
    db_url = settings.database_url
    if db_url and db_url.startswith("postgres"):
        from psycopg_pool import AsyncConnectionPool
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
        
        # Remove prisma-specific query params
        clean_db_url = db_url.split("?")[0]
        
        # Supabase transaction pooler requires pgbouncer/etc., but psycopg can connect simply.
        pool = AsyncConnectionPool(
            conninfo=clean_db_url,
            min_size=1,
            max_size=2,
            kwargs={
                "autocommit": True,
                "prepare_threshold": 0,
            }
        )
        await pool.open()
        
        checkpointer = AsyncPostgresSaver(pool)
        await checkpointer.setup()
        
        app.state.agent = build_graph(checkpointer=checkpointer)
        app.state.db_pool = pool
        yield
        
        print("Shutting down database pool...")
        await pool.close()
    else:
        app.state.agent = build_graph()
        yield

    print("Shutting down VinStay AI Agent...")


app = FastAPI(
    title="VinStay AI Matchmaker Copilot",
    description="Hệ điều hành Cho thuê & Vận hành Căn hộ tại Vinhomes Ocean Park (LangGraph Engine)",
    version="2.0.0",
    lifespan=lifespan,
)

settings = get_settings()
cors_origins = [orig.strip() for orig in settings.cors_origins.split(",") if orig.strip()]
if "http://localhost:3001" not in cors_origins:
    cors_origins.append("http://localhost:3001")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "app": "VinStay AI Matchmaker Copilot",
        "env": settings.app_env,
        "pilot_area": "Vinhomes Ocean Park (The Sapphire 1 & 2)",
    }
