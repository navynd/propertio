import { Box, Button, IconButton, Typography } from "@mui/material";
import "../../assets/styles/components/Pagination.scss";

export type PaginationPage = number | "ellipsis";

export const getPaginationPages = (
  current: number,
  total: number
): PaginationPage[] => {
  const pages: PaginationPage[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  }

  pages.push(1);

  if (current <= 4) {
    for (let i = 2; i <= 3; i++) {
      pages.push(i);
    }
    pages.push("ellipsis");
    pages.push(total);
    return pages;
  }

  if (current >= total - 3) {
    pages.push("ellipsis");
    for (let i = total - 2; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  }

  pages.push("ellipsis");
  pages.push(current - 1);
  pages.push(current);
  pages.push(current + 1);
  pages.push("ellipsis");
  pages.push(total);

  return pages;
};

type PFPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

function PFPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PFPaginationProps) {
  const handlePageChange = (page: number) => {
    const nextPage = Math.min(Math.max(1, page), totalPages);
    onPageChange(nextPage);
  };

  const pages = getPaginationPages(currentPage, totalPages);

  return (
    <Box className={`pf-pagination${className ? ` ${className}` : ""}`}>
      <IconButton
        className="pf-pagination__arrow pf-pagination__arrow--prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </IconButton>

      <Box className="pf-pagination__numbers">
        {pages.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <Typography
                key={`ellipsis-${index}`}
                className="pf-pagination__ellipsis"
              >
                ...
              </Typography>
            );
          }

          const numericPage = page as number;
          const isActive = numericPage === currentPage;

          return (
            <Button
              key={numericPage}
              className={`pf-pagination__item${
                isActive ? " pf-pagination__item--active" : ""
              }`}
              onClick={() => handlePageChange(numericPage)}
            >
              {numericPage}
            </Button>
          );
        })}
      </Box>

      <IconButton
        className="pf-pagination__arrow pf-pagination__arrow--next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 4L10 8L6 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </IconButton>
    </Box>
  );
}

export default PFPagination;

