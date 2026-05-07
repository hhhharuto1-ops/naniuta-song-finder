import { createFileRoute, Link } from "@tanstack/react-router";
import { recommend, type DiagnosisInput } from "@/lib/recommend";

export const Route = createFileRoute("/result")({
  validateSearch: (search: Record<string, unknown>): DiagnosisInput => ({
    hint: String(search.hint ?? ""),
    who: String(search.who ?? "friends"),
    timing: String(search.timing ?? "mid"),
    purpose: String(search.purpose ?? "safe"),
    voice: String(search.voice ?? "any"),
    skill: String(search.skill ?? "mid"),
  }),
  head: () => ({
    meta: [
      { title: "診断結果｜なにうた" },
      { name: "description", content: "あなたに今おすすめの1曲。" },
    ],
  }),
  component: Result,
});

function Stars({ n, max = 5, color = "text-primary" }: { n: number; max?: number; color?: string }) {
  return (
    <span className={color + " text-xs font-bold"}>
      {"★".repeat(n)}
      <span className="text-muted-foreground/40">{"★".repeat(max - n)}</span>
    </span>
  );
}

function Result() {
  const input = Route.useSearch();
  const recs = recommend(input);

  return (
    <main className="min-h-screen bg-[image:var(--gradient-warm)] px-5 pb-24 pt-10">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">あなたへのおすすめ</h1>
          <Link
            to="/diagnose"
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground"
          >
            やり直す
          </Link>
        </div>
        {input.hint && (
          <p className="mt-1 text-xs text-muted-foreground">
            ヒント:「{input.hint}」を含めて選曲
          </p>
        )}

        <div className="mt-6 space-y-4">
          {recs.map((r, i) => {
            const { song, score, reasons } = r;
            return (
              <article
                key={song.title + song.artist}
                className="overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center gap-3 bg-[image:var(--gradient-primary)] px-4 py-3 text-primary-foreground">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="truncate text-lg font-bold leading-tight">{song.title}</h2>
                    <p className="truncate text-xs opacity-90">{song.artist}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] opacity-80">おすすめ度</div>
                    <div className="text-lg font-bold">{Math.min(100, Math.max(0, Math.round(score)))}</div>
                  </div>
                </div>

                <div className="px-4 py-4">
                  <div className="rounded-2xl bg-secondary px-3 py-3 text-sm font-medium text-secondary-foreground">
                    💡 {song.reason}
                    {reasons.length > 0 && (
                      <span className="block mt-1 text-xs text-muted-foreground">
                        ({reasons.join(" / ")})
                      </span>
                    )}
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <Row label="歌いやすさ"><Stars n={song.singability} /></Row>
                    <Row label="知名度"><Stars n={song.popularity} /></Row>
                    <Row label="盛り上がり"><Stars n={song.hype} /></Row>
                    <Row label="地雷度"><Stars n={song.risk} color="text-destructive" /></Row>
                  </dl>

                  <div className="mt-4 space-y-2 text-xs">
                    <Detail label="おすすめタイミング" value={song.timings.map(jpTiming).join("・")} />
                    <Detail label="向いている場面" value={song.goodFor} />
                    <Detail label="注意点" value={song.caution} tone="warn" />
                  </div>

                  {song.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {song.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <Link
          to="/"
          className="mt-8 block text-center text-sm font-medium text-muted-foreground"
        >
          トップに戻る
        </Link>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Detail({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div>
      <span className="font-semibold text-foreground">{label}：</span>
      <span className={tone === "warn" ? "text-destructive" : "text-muted-foreground"}>
        {value}
      </span>
    </div>
  );
}

function jpTiming(t: string) {
  return (
    {
      first: "1曲目",
      mid: "中盤",
      last: "締め",
      cold: "場が冷えている時",
      hot: "盛り上がり中",
    }[t] ?? t
  );
}
