export default function ForumLoading() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-7 w-24 bg-parchment-300 rounded-sm animate-pulse" />
          <div className="h-4 w-16 bg-parchment-200 rounded-sm animate-pulse" />
        </div>
        <div className="h-9 w-20 bg-parchment-300 rounded-sm animate-pulse" />
      </div>

      {/* Post card skeletons */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-3.5 h-3.5 bg-parchment-300 rounded-sm flex-shrink-0 mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="h-4 w-16 bg-parchment-300 rounded-full" />
                  <div className="h-4 w-12 bg-parchment-200 rounded-full" />
                </div>
                <div className="h-5 w-3/4 bg-parchment-300 rounded-sm" />
                <div className="h-3.5 w-1/2 bg-parchment-200 rounded-sm" />
                <div className="flex gap-4">
                  <div className="h-3 w-12 bg-parchment-200 rounded-sm" />
                  <div className="h-3 w-16 bg-parchment-200 rounded-sm" />
                  <div className="h-3 w-10 bg-parchment-200 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
