const FILLERS = ["um", "uh", "like", "you know", "basically", "literally", "actually"];

export function analyzeUtterance(text: string, secondsSpoken: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const fillers = words.filter((w) =>
    FILLERS.includes(w.toLowerCase().replace(/[.,!?]/g, "")),
  ).length;
  const wpm = secondsSpoken > 0 ? (words.length / secondsSpoken) * 60 : 0;
  let sentiment: "calm" | "engaged" | "rushed" = "calm";
  if (wpm > 175) sentiment = "rushed";
  else if (wpm > 130) sentiment = "engaged";
  return { words: words.length, fillers, wpm, sentiment };
}
