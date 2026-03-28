export default function SearchLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Header */}
      <div className="space-y-1">
        <div className="h-7 w-24 bg-parchment-300 rounded-sm" />
        <div className="h-4 w-48 bg-parchment-200 rounded-sm" />
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 h-9 bg-parchment-200 rounded-sm" />
        <div className="h-9 w-16 bg-parchment-300 rounded-sm" />
      </div>

      {/* Result skeletons */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="flex gap-2">
              <div className="h-4 w-16 bg-parchment-300 rounded-full" />
              <div className="h-4 w-12 bg-parchment-200 rounded-full" />
            </div>
            <div className="h-5 w-2/3 bg-parchment-300 rounded-sm" />
            <div className="h-3 w-full bg-parchment-200 rounded-sm" />
            <div className="h-3 w-4/5 bg-parchment-200 rounded-sm" />
            <div className="flex gap-4">
              <div className="h-3 w-12 bg-parchment-200 rounded-sm" />
              <div className="h-3 w-16 bg-parchment-200 rounded-sm" />
              <div className="h-3 w-10 bg-parchment-200 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
