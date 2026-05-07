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

export function recommend(input: DiagnosisInput): Recommendation[] {
  const hintTokens = input.hint
    .toLowerCase()
    .split(/[\s,、。・/]+/)
    .filter(Boolean);

  return songs
    .map((song) => {
      let score = 50;
      const reasons: string[] = [];

      // Hint match
      const haystack = [
        song.title,
        song.artist,
        song.genre,
        ...song.tags,
        ...song.tieUp,
        ...song.searchWords,
      ]
        .join(" ")
        .toLowerCase();

      let hintHits = 0;
      for (const t of hintTokens) {
        if (haystack.includes(t)) hintHits++;
      }
      if (hintHits > 0) {
        score += hintHits * 15;
        reasons.push(`ヒント「${input.hint}」と一致`);
      }

      // Scene
      if (song.scenes.includes(input.who)) {
        score += 10;
      } else {
        score -= 4;
      }

      // Timing
      if (song.timings.includes(input.timing)) {
        score += 10;
      }

      // Purpose
      if (song.purposes.includes(input.purpose)) {
        score += 12;
      }

      // Voice
      if (input.voice === "high" && song.vocalRange === "high") score += 8;
      if (input.voice === "lowHigh" && song.vocalRange === "high") score -= 12;
      if (input.voice === "low" && (song.vocalRange === "low" || song.vocalRange === "mid")) score += 6;
      if (input.voice === "low" && song.vocalRange === "high") score -= 8;

      // Skill
      if (input.skill === "low") {
        score += (song.singability - 3) * 6;
        if (song.singability <= 2) reasons.push("難易度高め");
      }
      if (input.skill === "high") {
        score += (5 - song.singability) * 3; // 難曲も多少加点
      }

      // Risk penalty for sensitive scenes
      if (["work", "firstMeet"].includes(input.who) || input.timing === "first") {
        score -= song.risk * 5;
      }

      // Hype timing
      if (input.timing === "hot") score += song.hype * 2;
      if (input.timing === "cold") score += (5 - song.risk) * 2;

      // Safe purpose
      if (input.purpose === "safe") score -= song.risk * 4;
      if (input.purpose === "hype") score += song.hype * 3;
      if (input.purpose === "skill") score += (5 - song.singability) * 2;

      return { song, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
