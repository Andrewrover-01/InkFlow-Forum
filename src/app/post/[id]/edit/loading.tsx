export default function EditPostLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      {/* Page header */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-parchment-300 rounded-sm" />
        <div className="h-7 w-24 bg-parchment-300 rounded-sm" />
      </div>

      <div className="card p-6 space-y-5">
        {/* Category select */}
        <div className="space-y-1.5">
          <div className="h-4 w-12 bg-parchment-300 rounded-sm" />
          <div className="h-9 bg-parchment-200 rounded-sm" />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="h-4 w-10 bg-parchment-300 rounded-sm" />
          <div className="h-9 bg-parchment-200 rounded-sm" />
        </div>

        {/* Summary */}
        <div className="space-y-1.5">
          <div className="h-4 w-10 bg-parchment-300 rounded-sm" />
          <div className="h-9 bg-parchment-200 rounded-sm" />
        </div>

        {/* Content textarea */}
        <div className="space-y-1.5">
          <div className="h-4 w-10 bg-parchment-300 rounded-sm" />
          <div className="h-52 bg-parchment-200 rounded-sm" />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <div className="h-4 w-10 bg-parchment-300 rounded-sm" />
          <div className="h-9 bg-parchment-200 rounded-sm" />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-9 w-16 bg-parchment-200 rounded-sm" />
          <div className="h-9 w-24 bg-parchment-300 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
