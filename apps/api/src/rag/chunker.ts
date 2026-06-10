export interface Chunk {
  content: string;
  index: number;
}

export interface ChunkOptions {
  maxChars: number;
  overlapChars: number;
}

export function chunkText(text: string, options: ChunkOptions, startIndex = 0): Chunk[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const chunks: Chunk[] = [];
  let cursor = 0;
  let index = startIndex;

  while (cursor < normalized.length) {
    const hardEnd = Math.min(cursor + options.maxChars, normalized.length);
    const softEnd = findSoftBoundary(normalized, cursor, hardEnd);
    const content = normalized.slice(cursor, softEnd).trim();

    if (content) {
      chunks.push({ content, index });
      index += 1;
    }

    if (softEnd >= normalized.length) {
      break;
    }

    cursor = Math.max(softEnd - options.overlapChars, cursor + 1);
  }

  return chunks;
}

function findSoftBoundary(text: string, start: number, hardEnd: number): number {
  if (hardEnd >= text.length) {
    return text.length;
  }

  const window = text.slice(start, hardEnd);
  const boundaries = [". ", "? ", "! ", "\n\n", "\n", "; ", ", "];
  let best = -1;

  for (const boundary of boundaries) {
    const found = window.lastIndexOf(boundary);
    if (found > best && found > window.length * 0.55) {
      best = found + boundary.length;
    }
  }

  return best > 0 ? start + best : hardEnd;
}
