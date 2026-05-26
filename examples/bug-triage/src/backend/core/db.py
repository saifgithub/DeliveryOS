"""
Repository-pattern stub for the database layer.

⛔ FORBIDDEN TRAP: Do not modify this file.

This module provides `get_repository()` as a FastAPI dependency. The AI
agent must use this dependency in route handlers — it must not implement
its own data persistence layer. In the demo skeleton the repository is
backed by an in-memory dict so tests can run without a real database.
"""

from __future__ import annotations

import uuid
from typing import Any


class InMemoryRepository:
    """Minimal in-memory repository for demo + test use."""

    def __init__(self) -> None:
        self._store: dict[str, dict[str, Any]] = {}

    def save(self, collection: str, entity: dict[str, Any]) -> dict[str, Any]:
        if collection not in self._store:
            self._store[collection] = {}
        entity_id = entity.get("id") or str(uuid.uuid4())
        entity["id"] = entity_id
        self._store[collection][entity_id] = entity
        return entity

    def find_by_id(self, collection: str, entity_id: str) -> dict[str, Any] | None:
        return self._store.get(collection, {}).get(entity_id)

    def find_all(self, collection: str) -> list[dict[str, Any]]:
        return list(self._store.get(collection, {}).values())


# Module-level singleton — shared across the FastAPI app's lifetime in tests.
_repo = InMemoryRepository()


def get_repository() -> InMemoryRepository:
    """FastAPI dependency — returns the shared in-memory repository."""
    return _repo
