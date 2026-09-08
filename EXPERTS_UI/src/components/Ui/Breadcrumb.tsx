import React from "react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
};

export function Breadcrumb({
  items,
  className,
  separator = "/",
}: BreadcrumbProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const content = item.href ? (
            <a href={item.href} onClick={item.onClick}>
              {item.label}
            </a>
          ) : (
            <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
          );

          return (
            <li key={item.label}>
              {content}
              {!isLast && <span aria-hidden="true"> {separator} </span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

