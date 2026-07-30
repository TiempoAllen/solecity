/**
 * AmbientBackground — slow drifting glow orbs layered over the fixed
 * radial gradient painted in globals.css. Pure CSS animation, no JS.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden">
      <div
        className="absolute -left-32 top-10 h-[38rem] w-[38rem] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.28), transparent 65%)",
          animation: "float-slow 16s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-24 top-1/3 h-[32rem] w-[32rem] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.22), transparent 65%)",
          animation: "float-slow 20s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgba(240,171,252,0.18), transparent 65%)",
          animation: "float-slow 24s ease-in-out infinite",
        }}
      />
    </div>
  );
}
