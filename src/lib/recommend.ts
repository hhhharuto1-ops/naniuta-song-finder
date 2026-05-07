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

// ヒント自由入力に含まれるキーワードからの暗黙ヒント
function hintHeuristics(hint: string, song: Song): { delta: number; reasons: string[] } {
  const h = hint.toLowerCase();
  const reasons: string[] = [];
  let delta = 0;

  const has = (kw: string | string[]) =>
    (Array.isArray(kw) ? kw : [kw]).some((k) => h.includes(k.toLowerCase()));

  // 高音きつい / 男性 / 低めキー
  if (has(["高音きつ", "高音無理", "高音ない", "低め", "低音", "男性でも", "出ない"])) {
    if (song.vocalRange === "low" || song.vocalRange === "mid" || song.vocalRange === "any") {
      delta += 18;
      reasons.push("低〜中音域で歌いやすい");
    } else if (song.vocalRange === "high") {
      delta -= 20;
    }
  }
  // 会社・上司・職場
  if (has(["会社", "上司", "職場", "取引先", "接待", "オフィス"])) {
    delta -= song.risk * 6;
    delta += song.popularity * 3;
    if (song.scenes.includes("work")) {
      delta += 12;
      reasons.push("職場の場で安全");
    }
  }
  // TikTok / 流行 / 若者
  if (has(["tiktok", "ティックトック", "流行", "バズ", "若者", "最近"])) {
    if (song.tags.some((t) => /TikTok|最近|若者/i.test(t))) {
      delta += 20;
      reasons.push("TikTok・最近の流行");
    }
  }
  // しっとり / 落ち着き
  if (has(["しっとり", "落ち着", "バラード", "聴かせ"])) {
    if (song.tags.some((t) => /バラード|アコースティック/i.test(t))) {
      delta += 15;
      reasons.push("しっとり系");
    }
  }
  // 盛り上げ
  if (has(["盛り上", "もりあが", "アゲ", "ノリ", "テンション"])) {
    delta += song.hype * 4;
  }
  // 初対面・初心者
  if (has(["初対面", "知らない", "初めて"])) {
    delta -= song.risk * 5;
    delta += song.popularity * 3;
  }
  // 自信ない / 音痴
  if (has(["自信ない", "音痴", "下手", "歌えない"])) {
    delta += (song.singability - 3) * 8;
  }
  return { delta, reasons };
}

export function recommend(input: DiagnosisInput): Recommendation[] {
  const rawHint = input.hint.trim().toLowerCase();
  const hintTokens = rawHint
    .split(/[\s,、。・/]+/)
    .filter((t) => t.length >= 1);

  return songs
    .map((song) => {
      let score = 50;
      const reasons: string[] = [];

      // Hint match - 部分一致 (双方向)
      const haystackArr = [
        song.title,
        song.artist,
        song.genre,
        ...song.tags,
        ...song.tieUp,
        ...song.searchWords,
      ].map((s) => s.toLowerCase());
      const haystack = haystackArr.join(" ");

      let hintHits = 0;
      const matched = new Set<string>();
      for (const t of hintTokens) {
        if (!t) continue;
        // forward: haystack に token が含まれる
        if (haystack.includes(t)) {
          hintHits++;
          matched.add(t);
          continue;
        }
        // reverse: haystack のいずれかの語が token に含まれる（略称等）
        if (t.length >= 2 && haystackArr.some((w) => w.length >= 2 && t.includes(w))) {
          hintHits++;
          matched.add(t);
        }
      }
      if (hintHits > 0) {
        score += hintHits * 18;
        reasons.push(`「${[...matched].join("・")}」と一致`);
      }

      // ヒューリスティック
      if (rawHint) {
        const h = hintHeuristics(rawHint, song);
        score += h.delta;
        reasons.push(...h.reasons);
      }

      // Scene
      if (song.scenes.includes(input.who)) {
        score += 10;
      } else {
        score -= 4;
      }

      // Timing
      if (song.timings.includes(input.timing)) score += 10;

      // Purpose
      if (song.purposes.includes(input.purpose)) score += 12;

      // Voice
      if (input.voice === "high" && song.vocalRange === "high") score += 8;
      if (input.voice === "lowHigh" && song.vocalRange === "high") score -= 14;
      if (input.voice === "lowHigh" && (song.vocalRange === "low" || song.vocalRange === "mid")) score += 8;
      if (input.voice === "low" && (song.vocalRange === "low" || song.vocalRange === "mid")) score += 6;
      if (input.voice === "low" && song.vocalRange === "high") score -= 8;

      // Skill
      if (input.skill === "low") {
        score += (song.singability - 3) * 8;
      }
      if (input.skill === "high") {
        score += (5 - song.singability) * 3;
      }

      // Risk penalty for sensitive scenes
      if (["work", "firstMeet"].includes(input.who) || input.timing === "first") {
        score -= song.risk * 5;
      }

      // Hype timing
      if (input.timing === "hot") score += song.hype * 2;
      if (input.timing === "cold") score += (5 - song.risk) * 2;

      // Purpose tweaks
      if (input.purpose === "safe") score -= song.risk * 4;
      if (input.purpose === "hype") score += song.hype * 3;
      if (input.purpose === "skill") score += (5 - song.singability) * 2;
      if (input.purpose === "peace") score += (5 - song.hype) * 2;

      // tie-breaker: popularity
      score += song.popularity * 0.5;

      return { song, score, reasons: [...new Set(reasons)] };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
