export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="h-7 w-28 bg-parchment-300 rounded-sm" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5 text-center space-y-2">
            <div className="w-6 h-6 bg-parchment-300 rounded-sm mx-auto" />
            <div className="h-7 w-12 bg-parchment-400 rounded-sm mx-auto" />
            <div className="h-3 w-16 bg-parchment-200 rounded-sm mx-auto" />
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-5 w-20 bg-parchment-300 rounded-sm" />
            <div className="h-3 w-32 bg-parchment-200 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Recent posts */}
      <div className="space-y-2">
        <div className="h-5 w-20 bg-parchment-300 rounded-sm" />
        <div className="card divide-y divide-parchment-200">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <div className="h-4 w-2/3 bg-parchment-300 rounded-sm" />
                <div className="h-3 w-1/3 bg-parchment-200 rounded-sm" />
              </div>
              <div className="h-3 w-8 bg-parchment-200 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
