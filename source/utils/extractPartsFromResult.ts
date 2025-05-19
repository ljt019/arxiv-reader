export interface TextPart {
  type: "text";
  content: string;
}

export interface ImagePart {
  type: "image";
  data: string;
}

export type ExtractedPart = TextPart | ImagePart;

export const extractPartsFromResult = (result: string): ExtractedPart[] => {
  const parts: ExtractedPart[] = [];
  const regex = /!\[.*?\]\((data:image\/[^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(result))) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: result.slice(lastIndex, match.index) });
    }
    if (match[1]) {
      parts.push({ type: "image", data: match[1] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < result.length) {
    parts.push({ type: "text", content: result.slice(lastIndex) });
  }
  return parts;
};
