import type { CodeMapping, VirtualCode } from "@volar/language-core";
import { ScriptLang, extractScript, type parse } from "marko-language-tools";
import { TextDocument } from "vscode-html-languageservice";

export function parseScripts(
  fileId: string,
  parsed: ReturnType<typeof parse>,
  ts: typeof import("typescript"),
  tagLookup: any
): VirtualCode[] {
  const script = extractScript({
    parsed,
    scriptLang: ScriptLang.ts,
    lookup: tagLookup,
    ts: ts,
  });
  const scriptText = script.toString();

  const sourcedDoc = TextDocument.create("", "marko", 0, parsed.code);
  const genDoc = TextDocument.create("", "typescript", 0, scriptText);

  const mappings: CodeMapping[] = [];
  for (const token of script.tokens) {
    // if (token.length === 0) {
    //   // Skip empty tokens;
    //   continue;
    // }

    const sourceRange = {
      start: sourcedDoc.positionAt(token.sourceStart),
      end: sourcedDoc.positionAt(token.sourceStart + token.length),
    };
    const generatedRange = {
      start: genDoc.positionAt(token.generatedStart),
      end: genDoc.positionAt(token.generatedStart + token.length),
    };

    const sourceText = sourcedDoc.getText(sourceRange);
    const generatedText = genDoc.getText(generatedRange);

    // if (sourceText.trim() === "" || generatedText.trim() === "") {
    //   continue;
    // }

    if (sourceText !== generatedText) {
      console.error(
        "Mismatched text",
        sourceText,
        generatedText,
        sourceRange,
        generatedRange
      );
      throw new Error("Mismatched text");
    }

    mappings.push({
      sourceOffsets: [token.sourceStart],
      generatedOffsets: [token.generatedStart],
      lengths: [token.length],
      data: {
        completion: true,
        format: false,
        navigation: true,
        semantic: true,
        structure: true,
        verification: true,
      },
    });
  }

  if (mappings.length > 0) {
    return [
      {
        id: "script",
        languageId: "typescript",
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
