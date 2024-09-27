import type { CodeMapping, VirtualCode } from "@volar/language-core";
import type { parse } from "@marko/language-tools";
import { extractHTML } from "./internal/extractHtml";
import type { Extracted } from "./internal/Extractor";

export function parseHtml(
  parsed: ReturnType<typeof parse>
): [VirtualCode[], Extracted] {
  const extractedHtml = extractHTML(parsed);
  const scriptText = extractedHtml.extracted.toString();
  const mappings: CodeMapping[] = generateMappingsFromExtracted(
    extractedHtml.extracted
  );

  if (mappings.length > 0) {
    return [
      [
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
      ],
      extractedHtml.extracted,
    ];
  }

  return [[], extractedHtml.extracted];
}

function generateMappingsFromExtracted(extracted: Extracted): CodeMapping[] {
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
