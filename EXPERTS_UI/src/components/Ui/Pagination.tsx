import React from "react";

export type PaginationItem = {
  page: number;
  label?: string;
  disabled?: boolean;
};

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  renderItem?: (item: PaginationItem, isActive: boolean) => React.ReactNode;
};

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, idx) => start + idx);

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  renderItem,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const items: PaginationItem[] = range(1, totalPages).map((page) => ({
    page,
    label: page.toString(),
  }));

  return (
    <nav className={className} aria-label="Pagination">
      <ul>
        <li>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Prev
          </button>
        </li>
        {items.map((item) => {
          const isActive = item.page === currentPage;
          return (
            <li key={item.page}>
              <button
                type="button"
                onClick={() => onPageChange(item.page)}
                aria-current={isActive ? "page" : undefined}
                disabled={item.disabled}
              >
                {renderItem ? renderItem(item, isActive) : item.label}
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}

