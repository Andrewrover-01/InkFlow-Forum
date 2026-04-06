from __future__ import annotations

import time
from dataclasses import dataclass

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


@app.get("/top10")
def get_top10(force_refresh: bool = Query(default=False, description="是否忽略缓存强制刷新")):
    global _cache

    now = time.time()
    if not force_refresh and _cache and _cache.expires_at > now:
        return {
            "source": "cache",
            "cached": True,
            "count": len(_cache.data),
            "fetchedAt": _cache.fetched_at,
            "data": _cache.data,
        }

    try:
        data = top10_as_dict()
        _cache = CacheEntry(
            data=data,
            fetched_at=now,
            expires_at=now + CACHE_TTL_SECONDS,
        )
        return {
            "source": "live",
            "cached": False,
            "count": len(data),
            "fetchedAt": now,
            "data": data,
        }
    except ParseError as exc:
        if _cache:
            return {
                "source": "stale-cache",
                "cached": True,
                "stale": True,
                "warning": "排行榜页面结构可能已变化，已返回最近一次缓存结果。",
                "count": len(_cache.data),
                "fetchedAt": _cache.fetched_at,
                "data": _cache.data,
            }
        raise HTTPException(
            status_code=502,
            detail="排行榜页面解析失败，请稍后重试或联系维护人员。",
        ) from exc
    except FetchError as exc:
        if _cache:
            return {
                "source": "stale-cache",
                "cached": True,
                "stale": True,
                "warning": "目标网站暂时不可用，已返回最近一次缓存结果。",
                "count": len(_cache.data),
                "fetchedAt": _cache.fetched_at,
                "data": _cache.data,
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
