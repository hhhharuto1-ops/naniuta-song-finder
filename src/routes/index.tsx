import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "なにうた｜歌える曲から、今ちょうどいい1曲を選ぶ。" },
      {
        name: "description",
        content:
          "カラオケで何を歌うか迷ったら「なにうた」。場面・目的・声に合わせて、今歌うべき1曲を提案します。",
      },
      { property: "og:title", content: "なにうた" },
      {
        property: "og:description",
        content: "歌える曲から、今ちょうどいい1曲を選ぶ。",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen bg-[image:var(--gradient-warm)] px-5 pb-16 pt-14">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-[image:var(--gradient-primary)] text-3xl shadow-[var(--shadow-soft)]">
            🎤
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            なにうた
          </h1>
          <p className="mt-3 text-base font-medium text-secondary-foreground">
            歌える曲から、今ちょうどいい1曲を選ぶ。
          </p>
        </div>

        <div className="mt-8 rounded-3xl bg-card p-6 shadow-[var(--shadow-card)]">
          <p className="text-sm leading-relaxed text-muted-foreground">
            カラオケで「何歌おう…」となった時のためのサイトです。
            アーティスト名・アニメ・ドラマ・雰囲気などのヒントと、
            今いる場の状況から、<span className="font-semibold text-foreground">あなたが今歌うべき1曲</span>を提案します。
          </p>
          <ul className="mt-4 space-y-2 text-sm text-foreground">
            <li>🍊 人気曲ランキングではありません</li>
            <li>🍋 あなたの記憶にある曲を引き出します</li>
            <li>🍯 場の空気・声・歌唱力に合わせて提案</li>
          </ul>
        </div>

        <Link
          to="/diagnose"
          className="mt-8 block w-full rounded-2xl bg-[image:var(--gradient-primary)] px-6 py-5 text-center text-lg font-bold text-primary-foreground shadow-[var(--shadow-soft)] transition active:scale-[0.98]"
        >
          診断をはじめる →
        </Link>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          所要時間 約30秒
        </p>
      </div>
    </main>
  );
}
