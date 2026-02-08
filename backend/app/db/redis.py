import redis.asyncio as redis
from app.core.config import settings
from typing import Any
import json
from fastapi.encoders import jsonable_encoder

redis_client: redis.Redis | None = None


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
    global redis_client
    if redis_client:
        await redis_client.close()


async def cache_get(key: str) -> Any | None:
    """Get cached value"""
    client = await get_redis()
    value = await client.get(key)
    if value:
        return json.loads(value)
    return None


async def cache_set(key: str, value: Any, ttl: int = settings.REDIS_CACHE_TTL):
    """Set cached value with TTL"""
    client = await get_redis()
    payload = json.dumps(jsonable_encoder(value), ensure_ascii=False, default=str)
    await client.setex(key, ttl, payload)


async def cache_delete(key: str):
    """Delete cached value"""
    client = await get_redis()
    await client.delete(key)


async def cache_delete_pattern(pattern: str):
    """Delete all keys matching pattern"""
    client = await get_redis()
    keys = await client.keys(pattern)
    if keys:
        await client.delete(*keys)
