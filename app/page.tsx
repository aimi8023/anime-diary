import { storage } from "@/lib/storage-factory";
import SeasonSection from "@/components/season-section";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const animeList = await storage.getAll();

  // Group by season
  const grouped = animeList.reduce<Record<string, typeof animeList>>((acc, anime) => {
    if (!acc[anime.season]) acc[anime.season] = [];
    acc[anime.season].push(anime);
    return acc;
  }, {});

  // Sort seasons descending
  const sortedSeasons = Object.keys(grouped).sort((a, b) => {
    const extract = (s: string) => {
      const match = s.match(/^(\d{4})(春|夏|秋|冬)$/);
      if (!match) return 0;
      const seasonOrder: Record<string, number> = { 冬: 0, 春: 1, 夏: 2, 秋: 3 };
      return parseInt(match[1]) * 10 + seasonOrder[match[2]];
    };
    return extract(b) - extract(a);
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Hero — glass */}
      <div className="text-center mb-10 sm:mb-12 pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          📺 我的追番记录
        </h1>
        <p className="text-white/40 text-sm sm:text-base">
          记录每个季度追过的番剧，留下属于自己的回忆
        </p>
        {animeList.length > 0 && (
          <p className="text-sm text-white/25 mt-2">
            共 {animeList.length} 部 / {sortedSeasons.length} 个季度
          </p>
        )}
      </div>

      {/* Empty state */}
      {animeList.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🍃</div>
          <p className="text-white/50 text-lg mb-2">还没有记录任何番剧</p>
          <p className="text-white/30 text-sm">
            前往管理页添加你的第一部番剧吧
          </p>
        </div>
      )}

      {/* Season sections */}
      {sortedSeasons.map((season) => (
        <SeasonSection
          key={season}
          season={season}
          animeList={grouped[season]}
        />
      ))}

      {/* Bottom padding for mobile */}
      <div className="h-8 sm:hidden" />
    </div>
  );
}
