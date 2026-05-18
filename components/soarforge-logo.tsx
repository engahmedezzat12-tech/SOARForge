export function SOARForgeLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-12 w-12 shrink-0">
        <div className="absolute inset-0 rounded-2xl border border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_35px_rgba(34,211,238,0.18)]" />
        <div className="absolute left-3 top-3 h-6 w-6 rounded-xl border border-cyan-300/70 bg-background rotate-45" />
        <div className="absolute left-[19px] top-[19px] h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
        <div className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-4 ring-background shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
        <div className="absolute -bottom-1 left-2 h-1 w-8 rounded-full bg-cyan-400/40 blur-sm" />
      </div>

      {!compact ? (
        <div className="leading-none">
          <div className="text-xl font-black tracking-[-0.04em] text-foreground">
            SOAR<span className="text-cyan-300">Forge</span>
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.34em] text-cyan-300/90">
            Automation Trust Layer
          </div>
        </div>
      ) : null}
    </div>
  );
}