"""pytest fixtures shared across all test suites."""

import pytest
from httpx import ASGITransport, AsyncClient

from src.backend.app import create_app
from src.backend.core.db import InMemoryRepository, get_repository

AUTH_HEADER = {"Authorization": "Bearer demo-token"}


@pytest.fixture()
def fresh_repo() -> InMemoryRepository:
    """Return a fresh in-memory repository and override the app dependency."""
    repo = InMemoryRepository()
    return repo


@pytest.fixture()
async def client(fresh_repo: InMemoryRepository) -> AsyncClient:
    """Return an AsyncClient backed by a fresh app instance with a fresh repo."""
    app = create_app()
    app.dependency_overrides[get_repository] = lambda: fresh_repo

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
