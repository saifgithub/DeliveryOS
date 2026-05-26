"""FastAPI app factory for Bug Triage Assistant."""

from fastapi import FastAPI

from src.backend.api.users import router as users_router
from src.backend.core.auth import AuthMiddleware


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Bug Triage Assistant",
        version="0.1.0",
        description="A minimal bug triage API — demo target for DeliveryOS.",
    )

    app.add_middleware(AuthMiddleware)

    # Registered routers
    app.include_router(users_router, prefix="/users", tags=["users"])

    # NOTE: /bugs router is not registered here yet.
    # The AI agent will add it when implementing REQ-001.

    return app


app = create_app()
