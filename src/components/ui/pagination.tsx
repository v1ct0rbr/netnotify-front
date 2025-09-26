import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

type PaginationProps = React.ComponentProps<"nav"> & {
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  /** number of sibling pages to show on each side of the current page */
  siblingCount?: number
}

function range(start: number, end: number) {
  const out: number[] = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
}

function calculatePageItems(current: number, total: number, siblingCount: number) {
  // returns array of numbers and '...' strings
  const totalPageNumbers = siblingCount * 2 + 5

  if (total <= totalPageNumbers) {
    return range(1, total)
  }

  const leftSibling = Math.max(current - siblingCount, 2)
  const rightSibling = Math.min(current + siblingCount, total - 1)

  const showLeftEllipsis = leftSibling > 2
  const showRightEllipsis = rightSibling < total - 1

  const pages: (number | string)[] = [1]

  if (showLeftEllipsis) pages.push("...")

  pages.push(...range(leftSibling, rightSibling))

  if (showRightEllipsis) pages.push("...")

  pages.push(total)

  return pages
}

function Pagination({
  className,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  siblingCount = 1,
  ...props
}: PaginationProps) {
  const pages = calculatePageItems(currentPage, totalPages, siblingCount)

  function handleClick(e: React.MouseEvent, page: number | string) {
    e.preventDefault()
    if (typeof page === "number" && page !== currentPage) {
      onPageChange?.(page)
    }
  }

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    >
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={(e) => handleClick(e, Math.max(1, currentPage - 1))}
            aria-disabled={currentPage <= 1}
          />
        </PaginationItem>

        {pages.map((p, idx) => (
          <PaginationItem key={typeof p === "number" ? `p-${p}` : `e-${idx}`}>
            {typeof p === "string" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                isActive={p === currentPage}
                onClick={(e) => handleClick(e, p)}
              >
                {p}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            onClick={(e) => handleClick(e, Math.min(totalPages, currentPage + 1))}
            aria-disabled={currentPage >= totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </nav>
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? "outline" : "ghost",
          size,
        }),
        className
      )}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Ir para a página anterior"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span className="hidden sm:block">Anterior</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Ir para a próxima página"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:block">Próxima</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
