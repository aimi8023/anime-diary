import ArchiveBrowser from "@/components/archive/archive-browser";
import ArchiveLoadError from "@/components/archive/archive-load-error";
import {
  getArchiveStats,
  parseArchiveFilters,
} from "@/lib/archive/filter";
import type { ArchiveSearchParams } from "@/lib/archive/types";
import { storage } from "@/lib/storage-factory";

interface HomePageProps {
  searchParams: Promise<ArchiveSearchParams>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const initialFilters = parseArchiveFilters(await searchParams);

  try {
    const records = await storage.getAll();
    return (
      <ArchiveBrowser
        records={records}
        initialFilters={initialFilters}
        stats={getArchiveStats(records)}
      />
    );
  } catch (error) {
    console.error("Failed to render public archive:", error);
    return <ArchiveLoadError />;
  }
}
