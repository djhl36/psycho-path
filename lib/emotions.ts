export type EmotionId = "joy" | "sadness" | "anger" | "fear" | "disgust" | "surprise";

export const EMOTIONS: { id: EmotionId; label: string; emoji: string }[] = [
  { id: "joy", label: "기쁨", emoji: "😊" },
  { id: "sadness", label: "슬픔", emoji: "😢" },
  { id: "anger", label: "분노", emoji: "😡" },
  { id: "fear", label: "두려움", emoji: "😱" },
  { id: "disgust", label: "혐오", emoji: "🤢" },
  { id: "surprise", label: "놀람", emoji: "😲" },
];