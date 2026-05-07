import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/diagnose")({
  head: () => ({
    meta: [
      { title: "診断｜なにうた" },
      { name: "description", content: "あなたが今歌うべき曲を診断します。" },
    ],
  }),
  component: Diagnose,
});

type Option = { value: string; label: string };

const whoOptions: Option[] = [
  { value: "friends", label: "友達" },
  { value: "work", label: "会社・バイト先" },
  { value: "firstMeet", label: "初対面" },
  { value: "lover", label: "恋人・気になる人" },
  { value: "family", label: "家族" },
  { value: "otaku", label: "オタク友達" },
  { value: "mixed", label: "非オタ混合" },
];

const timingOptions: Option[] = [
  { value: "first", label: "1曲目" },
  { value: "mid", label: "中盤" },
  { value: "last", label: "締め" },
  { value: "cold", label: "場がまだ温まっていない" },
  { value: "hot", label: "かなり盛り上がっている" },
];

const purposeOptions: Option[] = [
  { value: "safe", label: "無難に乗り切りたい" },
  { value: "hype", label: "盛り上げたい" },
  { value: "skill", label: "少し上手く見せたい" },
  { value: "favorite", label: "好きな曲を歌いたい" },
  { value: "peace", label: "空気を壊したくない" },
  { value: "self", label: "自分らしさを出したい" },
];

const voiceOptions: Option[] = [
  { value: "high", label: "高音が出る" },
  { value: "lowHigh", label: "高音がきつい" },
  { value: "low", label: "低め" },
  { value: "any", label: "分からない" },
];

const skillOptions: Option[] = [
  { value: "low", label: "ない" },
  { value: "mid", label: "普通" },
  { value: "high", label: "ある" },
];

function Diagnose() {
  const navigate = useNavigate();
  const [hint, setHint] = useState("");
  const [who, setWho] = useState("friends");
  const [timing, setTiming] = useState("mid");
  const [purpose, setPurpose] = useState("safe");
  const [voice, setVoice] = useState("any");
  const [skill, setSkill] = useState("mid");

  const submit = () => {
    const params = new URLSearchParams({ hint, who, timing, purpose, voice, skill });
    navigate({ to: "/result", search: Object.fromEntries(params) as never });
  };

  return (
    <main className="min-h-screen bg-[var(--gradient-warm)] px-5 pb-24 pt-10">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold text-foreground">診断</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ざっくりでOK。30秒で終わります。
        </p>

        <Section title="① 曲を思い出すヒント" hint="アーティスト・作品・雰囲気・歌詞の一部など">
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="例：エヴァ、ミセス、月9、TikTok、バラード"
            className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </Section>

        <Section title="② 誰と行く？">
          <ChipGroup options={whoOptions} value={who} onChange={setWho} />
        </Section>

        <Section title="③ 何曲目？">
          <ChipGroup options={timingOptions} value={timing} onChange={setTiming} />
        </Section>

        <Section title="④ 目的">
          <ChipGroup options={purposeOptions} value={purpose} onChange={setPurpose} />
        </Section>

        <Section title="⑤ 声のタイプ">
          <ChipGroup options={voiceOptions} value={voice} onChange={setVoice} />
        </Section>

        <Section title="⑥ 歌に自信は？">
          <ChipGroup options={skillOptions} value={skill} onChange={setSkill} />
        </Section>

        <button
          onClick={submit}
          className="mt-8 block w-full rounded-2xl bg-[var(--gradient-primary)] px-6 py-5 text-center text-lg font-bold text-primary-foreground shadow-[var(--shadow-soft)] transition active:scale-[0.98]"
        >
          結果を見る →
        </button>
      </div>
    </main>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              "rounded-full border px-4 py-2.5 text-sm font-medium transition " +
              (active
                ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                : "border-border bg-card text-foreground hover:border-primary/50")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
