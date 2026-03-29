export default function CategoriesLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Page header */}
      <div className="space-y-1">
        <div className="h-7 w-28 bg-parchment-300 rounded-sm" />
        <div className="h-4 w-40 bg-parchment-200 rounded-sm" />
      </div>

      {/* Category cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-parchment-300" />
              <div className="space-y-1">
                <div className="h-5 w-24 bg-parchment-300 rounded-sm" />
                <div className="h-3 w-32 bg-parchment-200 rounded-sm" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-3 w-16 bg-parchment-200 rounded-sm" />
              <div className="h-3 w-20 bg-parchment-200 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
