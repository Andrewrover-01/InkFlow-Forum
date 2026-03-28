export default function UserProfileLoading() {
  return (
    <div className="space-y-5">
      {/* Profile card skeleton */}
      <div className="card p-6 animate-pulse">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-parchment-300 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-6 w-32 bg-parchment-400 rounded-sm" />
              <div className="h-5 w-12 bg-parchment-300 rounded-full" />
            </div>
            <div className="h-4 w-2/3 bg-parchment-200 rounded-sm" />
            <div className="flex gap-4">
              <div className="h-3 w-24 bg-parchment-200 rounded-sm" />
              <div className="h-3 w-12 bg-parchment-200 rounded-sm" />
              <div className="h-3 w-16 bg-parchment-200 rounded-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Posts skeleton */}
      <div className="space-y-2">
        <div className="h-5 w-28 bg-parchment-300 rounded-sm animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-4 animate-pulse space-y-2">
            <div className="h-5 w-3/4 bg-parchment-300 rounded-sm" />
            <div className="flex gap-4">
              <div className="h-3 w-16 bg-parchment-200 rounded-sm" />
              <div className="h-3 w-10 bg-parchment-200 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
