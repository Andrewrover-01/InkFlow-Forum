export default function SettingsLoading() {
  return (
    <div className="max-w-lg mx-auto space-y-4 animate-pulse">
      {/* Page header */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-parchment-300 rounded-sm" />
        <div className="h-7 w-24 bg-parchment-300 rounded-sm" />
      </div>

      <div className="card p-6 space-y-5">
        {/* Avatar preview */}
        <div className="flex items-center gap-4 pb-5 border-b border-parchment-200">
          <div className="w-14 h-14 rounded-full bg-parchment-300 flex-shrink-0" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 bg-parchment-300 rounded-sm" />
            <div className="h-3 w-36 bg-parchment-200 rounded-sm" />
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <div className="h-4 w-12 bg-parchment-300 rounded-sm" />
            <div className="h-9 bg-parchment-200 rounded-sm" />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="h-4 w-16 bg-parchment-300 rounded-sm" />
            <div className="h-20 bg-parchment-200 rounded-sm" />
          </div>

          {/* Avatar URL */}
          <div className="space-y-1.5">
            <div className="h-4 w-20 bg-parchment-300 rounded-sm" />
            <div className="h-9 bg-parchment-200 rounded-sm" />
            <div className="h-3 w-48 bg-parchment-100 rounded-sm" />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="h-9 w-20 bg-parchment-200 rounded-sm" />
            <div className="h-9 w-24 bg-parchment-300 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
