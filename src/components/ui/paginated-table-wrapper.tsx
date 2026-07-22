"use client";

import * as React from "react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  ChevronDown,
} from "lucide-react";

type TablePaginationProps = {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function paginationBtnClass(disabled: boolean) {
  return (
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-sm transition-colors " +
    (disabled ? "cursor-not-allowed text-text-2/40" : "text-text hover:bg-surface-2")
  );
}

export function TablePagination({
  currentPage,
  totalPages,
  totalResults,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: TablePaginationProps) {
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      {/* Page Size Select */}
      {pageSize !== undefined && onPageSizeChange !== undefined ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">Lignes par page</span>
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="appearance-none rounded-lg border border-border bg-surface py-1.5 pl-3 pr-8 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-2" />
          </div>
        </div>
      ) : (
        <div />
      )}

      {/* Page Navigation */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text">
          Page {currentPage} sur {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isFirstPage}
            onClick={() => onPageChange(1)}
            aria-label="Première page"
            className={paginationBtnClass(isFirstPage)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isFirstPage}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Page précédente"
            className={paginationBtnClass(isFirstPage)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isLastPage}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Page suivante"
            className={paginationBtnClass(isLastPage)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={isLastPage}
            onClick={() => onPageChange(totalPages)}
            aria-label="Dernière page"
            className={paginationBtnClass(isLastPage)}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="w-full text-sm text-text-2 sm:w-auto">
        {totalResults} résultat{totalResults > 1 ? "s" : ""} affiché{totalResults > 1 ? "s" : ""}
      </p>
    </div>
  );
}
