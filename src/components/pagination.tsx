import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  /** Extra query params to preserve (e.g. sort, category) */
  extraParams?: Record<string, string>;
}

function buildUrl(
  basePath: string,
  page: number,
  extra: Record<string, string>
) {
  const params = new URLSearchParams({ ...extra, page: String(page) });
  return `${basePath}?${params.toString()}`;
}

function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | null)[] = [1];
  if (current > 3) pages.push(null);
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push(null);
  pages.push(total);
  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  extraParams = {},
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      aria-label="分页导航"
      className="flex items-center justify-center gap-1 py-4"
    >
      {currentPage > 1 && (
        <Link
          href={buildUrl(basePath, currentPage - 1, extraParams)}
          aria-label="上一页"
          className="p-1.5 rounded-sm text-ink-500 hover:text-cinnabar-600 hover:bg-parchment-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
      )}

      {pages.map((page, i) =>
        page === null ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 text-ink-400 text-sm font-sans"
          >
            …
          </span>
        ) : (
          <Link
            key={page}
            href={buildUrl(basePath, page, extraParams)}
            aria-current={page === currentPage ? "page" : undefined}
            className={`px-3 py-1 text-sm font-sans rounded-sm transition-colors ${
              page === currentPage
                ? "bg-cinnabar-600 text-white"
                : "text-ink-600 hover:bg-parchment-200 hover:text-cinnabar-600"
            }`}
          >
            {page}
          </Link>
        )
      )}

      {currentPage < totalPages && (
        <Link
          href={buildUrl(basePath, currentPage + 1, extraParams)}
          aria-label="下一页"
          className="p-1.5 rounded-sm text-ink-500 hover:text-cinnabar-600 hover:bg-parchment-200 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </nav>
  );
}
