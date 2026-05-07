import { songs, type Song } from "@/data/songs";

export type DiagnosisInput = {
  hint: string;
  who: string;
  timing: string;
  purpose: string;
  voice: string;
  skill: string;
};

export type Recommendation = {
  song: Song;
  score: number;
  reasons: string[];
};

function hintHeuristics(hint: string, song: Song): { delta: number; reasons: string[] } {
  const h = hint.toLowerCase();
  const reasons: string[] = [];
  let delta = 0;
  const has = (kw: string[]) => kw.some((k) => h.includes(k.toLowerCase()));
  const isHigh = song.vocalRange === "high" || song.vocalRange === "very_high";

  if (has(["高音きつ", "高音無理", "高音ない", "低め", "低音", "男性でも", "出ない", "高音苦手"])) {
    if (!isHigh) { delta += 18; reasons.push("低〜中音域で歌いやすい"); }
    else { delta -= 22; }
  }
  if (has(["会社", "上司", "職場", "取引先", "接待", "オフィス"])) {
    delta -= song.risk * 6;
    delta += song.popularity * 3;
    if (song.scenes.includes("work")) { delta += 12; reasons.push("職場の場で安全"); }
  }
  if (has(["tiktok", "ティックトック", "流行", "バズ", "若者", "最近"])) {
    if (song.tags.some((t) => /TikTok|最近|若者/i.test(t))) {
      delta += 22; reasons.push("TikTok・最近の流行");
    }
  }
  if (has(["しっとり", "落ち着", "バラード", "聴かせ"])) {
    if (song.tags.some((t) => /バラード|アコースティック/i.test(t))) {
      delta += 15; reasons.push("しっとり系");
    }
  }
  if (has(["盛り上", "もりあが", "アゲ", "ノリ", "テンション"])) delta += song.hype * 4;
  if (has(["初対面", "知らない", "初めて"])) {
    delta -= song.risk * 5; delta += song.popularity * 3;
  }
  if (has(["自信ない", "音痴", "下手", "歌えない"])) delta += (song.singability - 3) * 8;
  return { delta, reasons };
}

export function recommend(input: DiagnosisInput): Recommendation[] {
  const rawHint = input.hint.trim().toLowerCase();
  const hintTokens = rawHint.split(/[\s,、。・/]+/).filter((t) => t.length >= 1);

  return songs
    .map((song) => {
      let score = 50;
      const reasons: string[] = [];

      const haystackArr: string[] = [
        song.title, song.artist, ...song.genre,
        ...song.tags, ...song.tieUp, ...song.searchWords,
      ].map((s) => s.toLowerCase());
      const haystack = haystackArr.join(" ");

      let hintHits = 0;
      const matched = new Set<string>();
      for (const t of hintTokens) {
        if (!t) continue;
        if (haystack.includes(t)) { hintHits++; matched.add(t); continue; }
        if (t.length >= 2 && haystackArr.some((w) => w.length >= 2 && t.includes(w))) {
          hintHits++; matched.add(t);
        }
      }
      if (hintHits > 0) {
        const weight = input.purpose === "self" ? 24 : 18;
        score += hintHits * weight;
        reasons.push(`「${[...matched].join("・")}」と一致`);
      }

      if (rawHint) {
        const h = hintHeuristics(rawHint, song);
        score += h.delta;
        reasons.push(...h.reasons);
      }

      if (song.scenes.includes(input.who)) score += 10;
      else score -= 4;
      if (song.timings.includes(input.timing)) score += 10;
      if (song.purposes.includes(input.purpose)) score += 12;

      const isHigh = song.vocalRange === "high" || song.vocalRange === "very_high";
      const isVeryHigh = song.vocalRange === "very_high";
      if (input.voice === "high" && isHigh) score += 8;
      if (input.voice === "lowHigh" && isHigh) score -= 14 + (isVeryHigh ? 4 : 0);
      if (input.voice === "lowHigh" && (song.vocalRange === "low" || song.vocalRange === "mid")) score += 8;
      if (input.voice === "low" && (song.vocalRange === "low" || song.vocalRange === "mid")) score += 6;
      if (input.voice === "low" && isHigh) score -= 8;

      if (input.skill === "low") score += (song.singability - 3) * 8;
      if (input.skill === "high") score += (5 - song.singability) * 3;

      if (["work", "firstMeet"].includes(input.who) || input.timing === "first") {
        score -= song.risk * 5;
      }

      if (input.timing === "hot") score += song.hype * 2;
      if (input.timing === "cold") score += (5 - song.risk) * 2;

      if (input.purpose === "safe") { score -= song.risk * 4; score += song.popularity * 2; }
      if (input.purpose === "hype") score += song.hype * 3;
      if (input.purpose === "skill") score += (5 - song.singability) * 2;
      if (input.purpose === "peace") score += (5 - song.hype) * 2;

      score += song.popularity * 0.5;

      return { song, score, reasons: [...new Set(reasons)] };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
