"use client";

import { DebouncedSearch } from "@/components/ui/search-input";
import { MemberSelect } from "../shared/FilterSelect";

/** Search box + member filter shown at the top of every Manager View "View All" sheet. */
export function SheetFilters({
  member,
  setMember,
  onSearch,
}: {
  member: { user_id: string; name: string } | null;
  setMember: (m: { user_id: string; full_name: string } | null) => void;
  onSearch: () => void;
}) {
  return (
    <>
      <DebouncedSearch updateQueryParam onChange={onSearch} />
      <MemberSelect selected={member ?? undefined} setSelected={setMember} triggerClassName="w-full sm:w-48" />
    </>
  );
}
