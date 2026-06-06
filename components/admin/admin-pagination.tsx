"use client";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/lib/pagination";

interface AdminPaginationProps {
  pagination: PaginationMeta | null | undefined;
  page: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function AdminPagination({
  pagination,
  page,
  onPageChange,
  className,
}: AdminPaginationProps) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const start = (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${className ?? ""}`}
    >
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {pagination.total.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground min-w-[7rem] text-center">
          Page {page} of {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pagination.totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
