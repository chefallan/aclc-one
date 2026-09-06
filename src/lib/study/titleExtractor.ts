/**
 * Smart automatic title generator and extractor based on parsed notes, CSV, or documents.
 */
export function extractSmartTitle(text: string, fallback?: string): string {
  if (!text || !text.trim()) {
    if (fallback) return cleanFallbackTitle(fallback);
    return "Study Flashcards";
  }

  const clean = text.trim();

  // 1. Check for 15-column CSV deck_title in rows
  const lines = clean.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length >= 2 && lines[0].toLowerCase().includes("deck_title")) {
    const headers = lines[0].split(",").map(h => h.toLowerCase().trim().replace(/["']/g, ""));
    const titleIdx = headers.indexOf("deck_title");
    if (titleIdx !== -1 && lines.length > 1) {
      // Extract from first data row
      const firstRow = lines[1].split(",");
      if (firstRow[titleIdx]) {
        const found = firstRow[titleIdx].replace(/["']/g, "").trim();
        if (found && found.length > 2 && !found.toLowerCase().includes("deck_title")) {
          return formatTitle(found);
        }
      }
    }
  }

  // 2. Check for explicit Markdown headers: # Topic / ## Chapter
  for (const line of lines.slice(0, 10)) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headerMatch && headerMatch[1].trim().length > 3) {
      return formatTitle(headerMatch[1].trim());
    }

    // Check for "Topic:", "Subject:", "Chapter:", "Title:", "Lesson:"
    const labeledMatch = line.match(/^(?:Topic|Subject|Chapter|Title|Lesson|Course|Module)\s*[:\-–—]\s*(.+)$/i);
    if (labeledMatch && labeledMatch[1].trim().length > 3) {
      return formatTitle(labeledMatch[1].trim());
    }
  }

  // 3. Check for first strong headline line before paragraphs
  if (lines.length > 0) {
    const firstLine = lines[0].replace(/^[*_#\->•\d.]+\s*/, "").replace(/[*_#]+/g, "").trim();
    if (firstLine.length >= 4 && firstLine.length <= 65 && !firstLine.includes(",") && !firstLine.endsWith(".")) {
      return formatTitle(firstLine);
    }
  }

  // 4. Fallback to clean filename or default
  if (fallback) {
    return cleanFallbackTitle(fallback);
  }

  return "Lesson Flashcards";
}

function cleanFallbackTitle(name: string): string {
  const noExt = name.replace(/\.[^/.]+$/, "");
  const spaced = noExt.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return formatTitle(spaced);
}

function formatTitle(title: string): string {
  // Truncate if too long
  const cleaned = title.replace(/[^\w\s\-:&()]/g, "").trim();
  if (cleaned.length > 60) {
    return cleaned.slice(0, 57).trim() + "...";
  }
  // Title case conversion
  return cleaned
    .split(" ")
    .map(word => {
      if (word.length <= 2 && ["in", "on", "of", "to", "at", "by", "for", "or", "an", "a"].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
