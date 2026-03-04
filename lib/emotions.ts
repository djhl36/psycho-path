export type EmotionId = "impulse" | "anger" | "pleasure" | "hurt" | "anxiety" | "void";

export const EMOTIONS: { id: EmotionId; label: string; emoji: string }[] = [
  { id: "impulse", label: "충동", emoji: "🔥" },
  { id: "anger", label: "분노", emoji: "😡" },
  { id: "pleasure", label: "쾌락", emoji: "😈" },
  { id: "hurt", label: "상처", emoji: "💔" },
  { id: "anxiety", label: "불안", emoji: "🌪" },
  { id: "void", label: "허무", emoji: "🫠" },
];