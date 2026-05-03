import json
import logging
from typing import Any

import redis.asyncio as redis
from fastapi.encoders import jsonable_encoder

from app.core.config import settings

redis_client: redis.Redis | None = None
logger = logging.getLogger(__name__)


async def _reset_redis_client() -> None:
    global redis_client
    if redis_client is not None:
        try:
            await redis_client.close()
        except Exception:
            pass
    redis_client = None


async def _run_redis_operation(operation: str, func):
    try:
        return await func()
    except (redis.RedisError, OSError) as exc:
        logger.warning(
            "Redis unavailable during %s. Falling back without cache. Error: %s",
            operation,
            exc,
        )
        await _reset_redis_client()
        return None


async def get_redis() -> redis.Redis:
    """Get Redis client instance"""
    global redis_client
    if redis_client is None:
        redis_client = await redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return redis_client


async def close_redis():
    """Close Redis connection"""
    await _reset_redis_client()


async def cache_get(key: str) -> Any | None:
    """Get cached value"""
    client = await get_redis()
    value = await _run_redis_operation("cache_get", lambda: client.get(key))
    if value:
        return json.loads(value)
    return None


async def cache_set(key: str, value: Any, ttl: int = settings.REDIS_CACHE_TTL):
    """Set cached value with TTL"""
    client = await get_redis()
    payload = json.dumps(jsonable_encoder(value), ensure_ascii=False, default=str)
    await _run_redis_operation("cache_set", lambda: client.setex(key, ttl, payload))


async def cache_delete(key: str):
    """Delete cached value"""
    client = await get_redis()
    await _run_redis_operation("cache_delete", lambda: client.delete(key))


async def cache_delete_pattern(pattern: str):
    """Delete all keys matching pattern"""
    client = await get_redis()
    keys = await _run_redis_operation("cache_delete_pattern.keys", lambda: client.keys(pattern))
    if keys:
        await _run_redis_operation("cache_delete_pattern.delete", lambda: client.delete(*keys))
