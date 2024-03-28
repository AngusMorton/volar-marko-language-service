import { extractStyle, parse } from "@marko/language-tools";
import type { Extracted } from "@marko/language-tools";
import type { CodeMapping, VirtualCode } from "@volar/language-core";

export function parseStyles(
  fileId: string,
  parsed: ReturnType<typeof parse>,
  taglib: any
): VirtualCode[] {
  const styles = extractStyle({ parsed, lookup: taglib });

  let styleCount = 0;
  const result = [];
  for (const [key, style] of styles.entries()) {
    console.log(key, style);
    const styleText = style.toString();
    result.push({
      id: `style_${styleCount++}`,
      languageId: "css",
      snapshot: {
        getText: (start, end) => styleText.substring(start, end),
        getLength: () => styleText.length,
        getChangeRange: () => undefined,
      },
      mappings: generateMappingsFromExtracted(style),
      embeddedCodes: [],
    } satisfies VirtualCode);
  }

  return result;
}

function generateMappingsFromExtracted(extracted: Extracted): CodeMapping[] {
  return extracted.tokens.map((it) => {
    return {
      sourceOffsets: [it.sourceStart],
      generatedOffsets: [it.generatedStart],
      lengths: [it.length],
      data: {
        completion: true,
        format: true,
        navigation: true,
        semantic: true,
        structure: true,
        verification: true,
      },
    };
  });
}
