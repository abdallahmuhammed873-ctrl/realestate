export default function SearchLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-[290px,1fr]">
      <div className="h-[70vh] animate-pulse rounded-2xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
