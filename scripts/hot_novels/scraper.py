from __future__ import annotations

import random
import re
import time
from dataclasses import asdict, dataclass
from threading import Lock
from typing import Iterable

import httpx
from bs4 import BeautifulSoup, Tag

RANKING_URL = "https://m.qidian.com/rank/yuepiao"
REQUEST_TIMEOUT = 12.0
MIN_REQUEST_INTERVAL_SECONDS = 1.5
RETRY_TIMES = 2
RETRY_DELAY_SECONDS = 1.2

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
]


class ScraperError(Exception):
    """Base error for scraper failures."""


class FetchError(ScraperError):
    """Raised when network fetching fails."""


class ParseError(ScraperError):
    """Raised when HTML parsing fails."""


@dataclass
class TopNovel:
    rank: int
    title: str
    author: str


class _RequestThrottler:
    def __init__(self, min_interval_seconds: float) -> None:
        self.min_interval_seconds = min_interval_seconds
        self._lock = Lock()
        self._last_request_monotonic = 0.0

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_request_monotonic
            if elapsed < self.min_interval_seconds:
                time.sleep(self.min_interval_seconds - elapsed)
            self._last_request_monotonic = time.monotonic()


_THROTTLER = _RequestThrottler(MIN_REQUEST_INTERVAL_SECONDS)


def _clean_text(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def _pick_first_text(scope: Tag, selectors: Iterable[str]) -> str:
    for selector in selectors:
        node = scope.select_one(selector)
        if node:
            text = _clean_text(node.get_text(" ", strip=True))
            if text:
                return text
    return ""


def _parse_rank(scope: Tag, fallback_rank: int) -> int:
    rank_text = _pick_first_text(scope, [".num", ".rank-num", "em", "i"])
    if rank_text:
        m = re.search(r"\d+", rank_text)
        if m:
            return int(m.group(0))
    return fallback_rank


def _candidate_items(soup: BeautifulSoup) -> list[Tag]:
    mobile_nodes = [
        n
        for n in soup.select("a[href*='/book/']")
        if isinstance(n, Tag) and n.select_one("h2")
    ]
    if mobile_nodes:
        return mobile_nodes

    selectors = [
        ".rank-book-list li",
        ".book-list-wrap li",
        ".rank-list li",
        "ul.all-img-list li",
    ]
    for selector in selectors:
        nodes = [n for n in soup.select(selector) if isinstance(n, Tag)]
        if nodes:
            return nodes

    # Fallback: find li nodes that look like book rows.
    fallback = []
    for li in soup.find_all("li"):
        if not isinstance(li, Tag):
            continue
        title = _pick_first_text(li, ["h2 a", "h4 a", ".book-mid-info h2 a", "a[data-eid*='book']"])
        if title:
            fallback.append(li)
    return fallback


def parse_top10(html: str) -> list[TopNovel]:
    soup = BeautifulSoup(html, "html.parser")
    items = _candidate_items(soup)
    if not items:
        raise ParseError("未找到排行榜列表节点，页面结构可能已变化。")

    results: list[TopNovel] = []
    seen_titles: set[str] = set()

    for index, item in enumerate(items, start=1):
        title = _pick_first_text(
            item,
            [
                "h2 a",
                "h2",
                "h4 a",
                ".book-mid-info h2 a",
                ".bookname a",
                "a[data-eid*='qd_bookname']",
                "a[data-eid*='book']",
            ],
        )
        if not title or title in seen_titles:
            continue

        author = _pick_first_text(
            item,
            [
                "p[class*='subTitle']",
                ".author a.name",
                ".book-mid-info .author a.name",
                "p.author a.name",
                "p.author a:last-child",
                ".author",
                "a[data-eid*='qd_author']",
            ],
        )
        if "·" in author:
            author = author.split("·", 1)[0].strip()
        author = author.lstrip("|").strip() or "未知作者"

        rank = _parse_rank(item, fallback_rank=len(results) + 1)

        results.append(TopNovel(rank=rank, title=title, author=author))
        seen_titles.add(title)

        if len(results) == 10:
            break

    if len(results) < 10:
        raise ParseError(f"仅解析到 {len(results)} 条榜单数据，少于预期 10 条。")

    # Normalize rank order to 1..10 in case source rank text is missing/irregular.
    for idx, novel in enumerate(results, start=1):
        novel.rank = idx

    return results


def fetch_top10(url: str = RANKING_URL) -> list[TopNovel]:
    last_error: Exception | None = None

    total_attempts = RETRY_TIMES + 1
    for attempt in range(total_attempts):
        try:
            _THROTTLER.wait()
            headers = {
                "User-Agent": random.choice(USER_AGENTS),
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            }
            with httpx.Client(timeout=REQUEST_TIMEOUT, follow_redirects=True, headers=headers) as client:
                response = client.get(url)
                response.raise_for_status()
                return parse_top10(response.text)
        except (httpx.HTTPError, ParseError) as exc:
            last_error = exc
            if attempt < total_attempts - 1:
                time.sleep(RETRY_DELAY_SECONDS)

    if isinstance(last_error, ParseError):
        raise last_error
    raise FetchError("目标网站当前不可访问，请稍后再试。") from last_error


def top10_as_dict(url: str = RANKING_URL) -> list[dict[str, str | int]]:
    return [asdict(item) for item in fetch_top10(url)]
