import type { CodeMapping, VirtualCode } from "@volar/language-core";
import { parse, extractScript, extractHTML } from "@marko/language-tools";

export function parseHtml(parsed: ReturnType<typeof parse>): VirtualCode[] {
  const script = extractHTML(parsed);
  const scriptText = script.extracted.toString();
  const mappings: CodeMapping[] = generateMappingsFromExtracted(
    script.extracted
  );

  if (mappings.length > 0) {
    return [
      {
        id: "html",
        languageId: "html",
        snapshot: {
          getText: (start, end) => scriptText.substring(start, end),
          getLength: () => scriptText.length,
          getChangeRange: () => undefined,
        },
        mappings: mappings,
        embeddedCodes: [],
      },
    ];
  }

  return [];
}

function generateMappingsFromExtracted(
  extracted: ReturnType<typeof extractScript>
): CodeMapping[] {
  return extracted.tokens.map((it) => {
    return {
      sourceOffsets: [it.sourceStart],
      generatedOffsets: [it.generatedStart],
      lengths: [it.length],
      data: {
        completion: true,
        format: false,
        navigation: true,
        semantic: true,
        structure: true,
        verification: true,
      },
    };
  });
}
