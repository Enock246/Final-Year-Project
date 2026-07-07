export default function DashboardLoading() {
  return (
    <main className="flex-1 p-6 md:p-8 bg-background max-w-7xl mx-auto w-full animate-pulse">
      <div className="mb-10 space-y-4">
        <div className="h-10 w-64 bg-muted/50 rounded-[8px]"></div>
        <div className="h-6 w-96 bg-muted/50 rounded-md"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i}
            className="bg-[var(--canvas-soft)] p-6 rounded-[8px] border border-[var(--hairline)] flex flex-col h-[280px]"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-muted/50 rounded-md"></div>
              <div className="w-24 h-8 bg-muted/50 rounded-full"></div>
            </div>
            
            <div className="h-6 w-3/4 bg-muted/50 rounded-xl mb-6"></div>
            
            <div className="space-y-3 mb-6 flex-1">
              <div className="h-4 w-1/2 bg-muted/50 rounded-lg"></div>
              <div className="h-4 w-2/3 bg-muted/50 rounded-lg"></div>
            </div>

            <div className="w-full h-12 bg-muted/50 rounded-xl mt-auto"></div>
          </div>
        ))}
      </div>
    </main>
  );
}
