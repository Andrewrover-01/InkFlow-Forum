export default function CategoryLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between animate-pulse">
        <div className="space-y-1">
          <div className="h-7 w-32 bg-parchment-300 rounded-sm" />
          <div className="h-4 w-20 bg-parchment-200 rounded-sm" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-parchment-300 rounded-sm" />
          <div className="h-8 w-16 bg-parchment-200 rounded-sm" />
        </div>
      </div>

      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <div className="h-4 w-16 bg-parchment-300 rounded-full" />
                </div>
                <div className="h-5 w-2/3 bg-parchment-300 rounded-sm" />
                <div className="flex gap-4">
                  <div className="h-3 w-12 bg-parchment-200 rounded-sm" />
                  <div className="h-3 w-16 bg-parchment-200 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
