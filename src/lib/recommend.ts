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

// =====================================================================
// ヒント文字列のフィーリング判定(高音きつい・会社・TikTokなど)
// 既存ロジックを残しつつ、加減点を強化
// =====================================================================
function hintHeuristics(
  hint: string,
  song: Song
): { delta: number; reasons: string[] } {
  const h = hint.toLowerCase();
  const reasons: string[] = [];
  let delta = 0;
  const has = (kw: string[]) => kw.some((k) => h.includes(k.toLowerCase()));
  const isHigh = song.vocalRange === "high" || song.vocalRange === "very_high";
  const isVeryHigh = song.vocalRange === "very_high";

  if (
    has([
      "高音きつ",
      "高音無理",
      "高音ない",
      "低め",
      "低音",
      "男性でも",
      "出ない",
      "高音苦手",
    ])
  ) {
    if (!isHigh) {
      delta += 220;
      reasons.push("低〜中音域で歌いやすい");
    } else if (isVeryHigh) {
      delta -= 320;
    } else {
      delta -= 200;
    }
  }
  if (has(["会社", "上司", "職場", "取引先", "接待", "オフィス"])) {
    delta -= song.risk * 60;
    delta += song.popularity * 30;
    if (song.scenes.includes("work")) {
      delta += 180;
      reasons.push("職場の場で安全");
    }
  }
  if (has(["tiktok", "ティックトック", "流行", "バズ", "若者", "最近"])) {
    if (song.tags.some((t) => /TikTok|最近|若者/i.test(t))) {
      delta += 280;
      reasons.push("TikTok・最近の流行");
    }
  }
  if (has(["しっとり", "落ち着", "バラード", "聴かせ"])) {
    if (song.tags.some((t) => /バラード|アコースティック/i.test(t))) {
      delta += 200;
      reasons.push("しっとり系");
    }
  }
  if (has(["盛り上", "もりあが", "アゲ", "ノリ", "テンション"])) {
    delta += song.hype * 40;
  }
  if (has(["初対面", "知らない", "初めて"])) {
    delta -= song.risk * 50;
    delta += song.popularity * 30;
  }
  if (has(["自信ない", "音痴", "下手", "歌えない"])) {
    delta += (song.singability - 3) * 80;
  }
  if (has(["締め", "しめ", "ラスト", "最後"])) {
    if (song.timings.includes("last")) {
      delta += 200;
      reasons.push("締めの定番");
    }
    if (song.hype <= 3 && song.popularity >= 4) delta += 60;
  }
  return { delta, reasons };
}

// =====================================================================
// メイン推薦ロジック
// =====================================================================
export function recommend(input: DiagnosisInput): Recommendation[] {
  const rawHint = input.hint.trim().toLowerCase();
  const hintTokens = rawHint
    .split(/[\s,、。・/]+/)
    .filter((t) => t.length >= 1);

  // ---------------------------------------------------------------
  // ステップ1: 全曲をスコアリング
  // ---------------------------------------------------------------
  const scored = songs.map((song) => {
    let score = 1000;
    const reasons: string[] = [];

    // -----------------------------------------------------------
    // (a) ヒント一致を5段階で重みづけ
    // -----------------------------------------------------------
    if (hintTokens.length > 0) {
      const titleLower = song.title.toLowerCase();
      const artistLower = song.artist.toLowerCase();
      const tieUpLowers = song.tieUp.map((s) => s.toLowerCase());
      const tagLowers = song.tags.map((s) => s.toLowerCase());
      const swLowers = song.searchWords.map((s) => s.toLowerCase());
      const genreLowers = song.genre.map((s) => s.toLowerCase());

      const matched = new Set<string>();
      let topTier:
        | "title"
        | "artist"
        | "tieUp"
        | "tag"
        | "searchWord"
        | "partial"
        | null = null;
      const upTier = (t: NonNullable<typeof topTier>) => {
        const order = ["partial", "searchWord", "tag", "tieUp", "artist", "title"];
        if (!topTier || order.indexOf(t) > order.indexOf(topTier)) topTier = t;
      };

      for (const t of hintTokens) {
        if (!t) continue;

        if (titleLower === t || titleLower.includes(t)) {
          score += 500;
          matched.add(t);
          upTier("title");
          continue;
        }
        if (artistLower === t || artistLower.includes(t)) {
          score += 400;
          matched.add(t);
          upTier("artist");
          continue;
        }
        if (tieUpLowers.some((tu) => tu === t || tu.includes(t))) {
          score += 350;
          matched.add(t);
          upTier("tieUp");
          continue;
        }
        if (tagLowers.some((tg) => tg === t || tg.includes(t))) {
          score += 200;
          matched.add(t);
          upTier("tag");
          continue;
        }
        if (swLowers.some((sw) => sw === t || sw.includes(t))) {
          score += 120;
          matched.add(t);
          upTier("searchWord");
          continue;
        }
        if (genreLowers.some((g) => g.includes(t))) {
          score += 80;
          matched.add(t);
          continue;
        }
        if (t.length >= 2) {
          const all = [
            titleLower,
            artistLower,
            ...tieUpLowers,
            ...tagLowers,
            ...swLowers,
          ];
          if (
            all.some((w) => w.length >= 2 && (t.includes(w) || w.includes(t)))
          ) {
            score += 60;
            matched.add(t);
            upTier("partial");
          }
        }
      }

      if (matched.size > 0) {
        const tierLabel: Record<string, string> = {
          title: "曲名一致",
          artist: "アーティスト一致",
          tieUp: "作品一致",
          tag: "タグ一致",
          searchWord: "ワード一致",
          partial: "部分一致",
        };
        const label = topTier ? tierLabel[topTier] : "ワード一致";
        reasons.push(`「${[...matched].join("・")}」に${label}`);
      }
    }

    // -----------------------------------------------------------
    // (b) ヒント文字列の意味判定
    // -----------------------------------------------------------
    if (rawHint) {
      const h = hintHeuristics(rawHint, song);
      score += h.delta;
      reasons.push(...h.reasons);
    }

    // -----------------------------------------------------------
    // (c) 設問: 誰と (scenes)
    // -----------------------------------------------------------
    if (song.scenes.includes(input.who)) {
      score += 120;
    } else {
      score -= 80;
    }

    if (input.who === "firstMeet" && !song.scenes.includes("firstMeet")) {
      if (
        song.scenes.includes("mixed") &&
        song.popularity >= 4 &&
        song.risk <= 2
      ) {
        score += 80;
        reasons.push("誰でも知ってる安全枠");
      }
    }

    // -----------------------------------------------------------
    // (d) 設問: 何曲目 (timings)
    // -----------------------------------------------------------
    if (song.timings.includes(input.timing)) {
      score += 150;
    } else {
      score -= 60;
    }

    if (input.timing === "first" && !song.timings.includes("first")) {
      if (
        song.timings.includes("mid") &&
        song.risk <= 2 &&
        song.popularity >= 4
      ) {
        score += 80;
        reasons.push("1曲目代替の安全曲");
      }
    }

    if (input.timing === "last" && !song.timings.includes("last")) {
      if (
        song.timings.includes("mid") &&
        song.popularity >= 4 &&
        song.hype <= 3
      ) {
        score += 60;
      }
    }

    // -----------------------------------------------------------
    // (e) 設問: 目的 (purposes)
    // -----------------------------------------------------------
    if (song.purposes.includes(input.purpose)) {
      score += 180;
    } else {
      score -= 50;
    }

    if (input.purpose === "safe") {
      score -= song.risk * 50;
      score += song.popularity * 25;
    }
    if (input.purpose === "hype") {
      score += song.hype * 50;
      score -= (5 - song.hype) * 20;
    }
    if (input.purpose === "skill") {
      score += (5 - song.singability) * 30;
      if (song.vocalRange === "very_high") score += 60;
    }
    if (input.purpose === "favorite") {
      if (rawHint) score += 40;
    }
    if (input.purpose === "peace") {
      score += (5 - song.hype) * 25;
      score += (5 - song.risk) * 30;
    }
    if (input.purpose === "self") {
      if (song.tags.some((t) => /個性|攻め|ロック|ボカロ|ラップ/i.test(t))) {
        score += 80;
      }
    }

    // -----------------------------------------------------------
    // (f) 設問: 声 (voice)
    // -----------------------------------------------------------
    const isHigh =
      song.vocalRange === "high" || song.vocalRange === "very_high";
    const isVeryHigh = song.vocalRange === "very_high";
    const isLowMid = song.vocalRange === "low" || song.vocalRange === "mid";

    if (input.voice === "high") {
      if (isHigh) score += 80;
      if (isVeryHigh) score += 40;
    }
    if (input.voice === "lowHigh") {
      if (isVeryHigh) score -= 300;
      else if (isHigh) score -= 180;
      if (isLowMid) score += 100;
    }
    if (input.voice === "low") {
      if (isLowMid) score += 80;
      if (isHigh) score -= 80;
      if (isVeryHigh) score -= 150;
    }

    // -----------------------------------------------------------
    // (g) 設問: 自信 (skill)
    // -----------------------------------------------------------
    if (input.skill === "low") {
      score += (song.singability - 3) * 80;
      if (song.singability >= 4) score += 50;
      if (song.singability <= 2) score -= 100;
    }
    if (input.skill === "high") {
      score += (5 - song.singability) * 30;
    }

    // -----------------------------------------------------------
    // (h) 場面・タイミングの安全要件
    // -----------------------------------------------------------
    if (
      ["work", "firstMeet"].includes(input.who) ||
      input.timing === "first"
    ) {
      score -= song.risk * 50;
    }

    if (input.timing === "hot") score += song.hype * 30;
    if (input.timing === "cold") score += (5 - song.risk) * 25;

    // -----------------------------------------------------------
    // (i) 微小なランダム (-3〜+3)
    // -----------------------------------------------------------
    score += (Math.random() - 0.5) * 6;

    return {
      song,
      score,
      reasons: [...new Set(reasons)],
    };
  });

  // ---------------------------------------------------------------
  // ステップ2: 同アーティストペナルティ
  //   スコア順に並べて各アーティストの出現回数を数え、2曲目以降に減点
  // ---------------------------------------------------------------
  scored.sort((a, b) => b.score - a.score);

  const artistCount = new Map<string, number>();
  for (const r of scored) {
    const count = artistCount.get(r.song.artist) ?? 0;
    if (count === 1) r.score -= 200;
    else if (count === 2) r.score -= 500;
    else if (count >= 3) r.score -= 1000;
    artistCount.set(r.song.artist, count + 1);
  }

  // ---------------------------------------------------------------
  // ステップ3: 再ソート、上位10曲を返す(必ず10曲)
  // ---------------------------------------------------------------
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 10);
}
