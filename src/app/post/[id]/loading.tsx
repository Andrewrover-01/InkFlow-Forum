export default function PostLoading() {
  return (
    <div className="space-y-4">
      {/* Post header skeleton */}
      <div className="card p-6 animate-pulse space-y-4">
        {/* Breadcrumb */}
        <div className="flex gap-2">
          <div className="h-3 w-14 bg-parchment-300 rounded-sm" />
          <div className="h-3 w-2 bg-parchment-200 rounded-sm" />
          <div className="h-3 w-20 bg-parchment-300 rounded-sm" />
        </div>

        {/* Title */}
        <div className="h-7 w-2/3 bg-parchment-400 rounded-sm" />

        {/* Tags */}
        <div className="flex gap-2">
          <div className="h-5 w-14 bg-parchment-300 rounded-full" />
          <div className="h-5 w-10 bg-parchment-200 rounded-full" />
        </div>

        {/* Author row */}
        <div className="flex items-center gap-3 pb-4 border-b border-parchment-200">
          <div className="w-9 h-9 rounded-full bg-parchment-300" />
          <div className="space-y-1">
            <div className="h-4 w-20 bg-parchment-300 rounded-sm" />
            <div className="h-3 w-24 bg-parchment-200 rounded-sm" />
          </div>
          <div className="ml-auto flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 w-10 bg-parchment-200 rounded-sm" />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          {[1, 1, 0.75, 1, 0.5].map((w, i) => (
            <div
              key={i}
              className="h-4 bg-parchment-200 rounded-sm"
              style={{ width: `${w * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* Reply skeletons */}
      <div className="space-y-3">
        <div className="h-5 w-28 bg-parchment-300 rounded-sm animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4 animate-pulse space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-parchment-200">
              <div className="w-8 h-8 rounded-full bg-parchment-300" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-24 bg-parchment-300 rounded-sm" />
                <div className="h-3 w-16 bg-parchment-200 rounded-sm" />
              </div>
              <div className="h-5 w-16 bg-parchment-200 rounded-full" />
            </div>
            <div className="space-y-1.5">
              {[1, 0.8, 0.6].map((w, j) => (
                <div
                  key={j}
                  className="h-3.5 bg-parchment-200 rounded-sm"
                  style={{ width: `${w * 100}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
