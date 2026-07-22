import type { NextRequest } from "next/server";

export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
  search: string;
};

export function parsePaginationParams(req: NextRequest): PaginationParams {
  const url = new URL(req.url);
  
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10));
  const skip = (page - 1) * limit;
  const search = url.searchParams.get("q") || url.searchParams.get("search") || "";
  
  return { page, limit, skip, search };
}

export function formatPaginatedResponse<T>(
  data: T[],
  total: number,
  params: { page: number; limit: number }
) {
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  return {
    data,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
    },
  };
}
