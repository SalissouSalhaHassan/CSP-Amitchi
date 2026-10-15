export default function ReportsLoading() {
  return (
    <div className="p-8 space-y-8 animate-pulse bg-slate-50/60 dark:bg-[#0A0C10] min-h-screen">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>
        <div className="h-9 w-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>

      {/* Main Content Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Sidebar Skeleton */}
        <div className="bg-white/80 dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4 space-y-3">
          <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="h-10 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          ))}
        </div>

        {/* Report Preview Skeleton */}
        <div className="space-y-8">
          <div className="bg-white/80 dark:bg-[#131622] rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 space-y-4">
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#131622] rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 space-y-6">
            <div className="h-20 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
              ))}
            </div>
            <div className="h-64 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
