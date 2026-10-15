export default function Loading() {
  return (
    <div className="p-8 space-y-8 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-slate-100 rounded-lg"></div>
        </div>
        <div className="h-12 w-48 bg-slate-200 rounded-2xl"></div>
      </div>
      
      <div className="h-24 w-full bg-slate-900/5 rounded-[2.5rem]"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-3xl"></div>
        ))}
      </div>
      
      <div className="h-96 w-full bg-white rounded-[3rem] border border-slate-100"></div>
    </div>
  );
}
