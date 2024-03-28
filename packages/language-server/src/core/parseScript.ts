import type { CodeMapping, VirtualCode } from "@volar/language-core";
import {
  parse,
  extractScript,
  ScriptLang,
  Project,
  NodeType,
  Node,
  Range,
} from "@marko/language-tools";
import path from "path";

export function parseScripts(
  fileId: string,
  parsed: ReturnType<typeof parse>,
  ts: typeof import("typescript"),
  tagLookup: any
): VirtualCode {
  const script = extractScript({
    parsed,
    scriptLang: ScriptLang.ts,
    lookup: tagLookup,
    ts: ts,
  });
  const scriptText = script.toString();
  const mappings: CodeMapping[] = generateMappingsFromExtracted(script);

  return {
    id: "script",
    languageId: "typescript",
    snapshot: {
      getText: (start, end) => scriptText.substring(start, end),
      getLength: () => scriptText.length,
      getChangeRange: () => undefined,
    },
    mappings: mappings,
    embeddedCodes: [],
  };
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
        format: true,
        navigation: true,
        semantic: true,
        structure: true,
        verification: true,
      },
    };
  });
}
