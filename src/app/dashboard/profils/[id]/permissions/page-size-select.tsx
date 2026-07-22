"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function PageSizeSelect({ pageSize }: { pageSize: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", event.target.value);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-text">Lignes par page</span>
      <div className="relative">
        <select
          value={pageSize}
          onChange={handleChange}
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
  );
}
