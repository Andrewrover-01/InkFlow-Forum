from __future__ import annotations

import time
from dataclasses import dataclass
from threading import Lock

from fastapi import FastAPI, HTTPException, Query

from scraper import FetchError, ParseError, top10_as_dict

CACHE_TTL_SECONDS = 600


@dataclass
class CacheEntry:
    data: list[dict[str, str | int]]
    fetched_at: float
    expires_at: float


app = FastAPI(title="InkFlow Hot Novels API", version="1.0.0")
_cache: CacheEntry | None = None
_cache_lock = Lock()


@app.get("/top10")
def get_top10(force_refresh: bool = Query(default=False, description="是否忽略缓存强制刷新")):
    global _cache

    now = time.time()
    with _cache_lock:
        cache_snapshot = _cache

    if not force_refresh and cache_snapshot and cache_snapshot.expires_at > now:
        return {
            "source": "cache",
            "cached": True,
            "count": len(cache_snapshot.data),
            "fetchedAt": cache_snapshot.fetched_at,
            "data": cache_snapshot.data,
        }

    try:
        data = top10_as_dict()
        new_cache = CacheEntry(
            data=data,
            fetched_at=now,
            expires_at=now + CACHE_TTL_SECONDS,
        )
        with _cache_lock:
            _cache = new_cache
        return {
            "source": "live",
            "cached": False,
            "count": len(data),
            "fetchedAt": now,
            "data": data,
        }
    except ParseError as exc:
        with _cache_lock:
            cache_snapshot = _cache
        if cache_snapshot:
            return {
                "source": "stale-cache",
                "cached": True,
                "stale": True,
                "warning": "排行榜页面结构可能已变化，已返回最近一次缓存结果。",
                "count": len(cache_snapshot.data),
                "fetchedAt": cache_snapshot.fetched_at,
                "data": cache_snapshot.data,
            }
        raise HTTPException(
            status_code=502,
            detail="排行榜页面解析失败，请稍后重试或联系维护人员。",
        ) from exc
    except FetchError as exc:
        with _cache_lock:
            cache_snapshot = _cache
        if cache_snapshot:
            return {
                "source": "stale-cache",
                "cached": True,
                "stale": True,
                "warning": "目标网站暂时不可用，已返回最近一次缓存结果。",
                "count": len(cache_snapshot.data),
                "fetchedAt": cache_snapshot.fetched_at,
                "data": cache_snapshot.data,
            }
        raise HTTPException(
            status_code=503,
            detail="目标网站暂时不可访问，请稍后再试。",
        ) from exc
    except Exception as exc:  # defensive fallback
        raise HTTPException(
            status_code=500,
            detail="服务暂时异常，请稍后重试。",
        ) from exc
