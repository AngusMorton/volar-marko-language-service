import {
  CodeMapping,
  forEachEmbeddedCode,
  type LanguagePlugin,
  type VirtualCode,
} from "@volar/language-core";
import type * as ts from "typescript";
import {
  parse,
  extractScript,
  ScriptLang,
  Project,
  NodeType,
} from "@marko/language-tools";
import { URI } from "vscode-uri";
import path from "path";

export const markoLanguagePlugin: LanguagePlugin = {
  createVirtualCode(_id, languageId, snapshot, files) {
    if (languageId === "marko") {
      return createMarkoCode(_id, snapshot);
    }
  },
  updateVirtualCode(_id, _oldVirtualCode, newSnapshot) {
    return createMarkoCode(_id, newSnapshot);
  },
  typescript: {
    extraFileExtensions: [
      { extension: "marko", isMixedContent: true, scriptKind: 7 },
    ],
    getScript(rootVirtualCode) {
      for (const code of forEachEmbeddedCode(rootVirtualCode)) {
        if (code.id.startsWith("script_")) {
          return {
            code,
            extension: ".ts",
            scriptKind: 3,
          };
        }
      }
    },
  },
};

export interface MarkoCode extends VirtualCode {
  markoDocument: ReturnType<typeof parse>;
  tagLookup: ReturnType<typeof Project.getTagLookup>;
}

function createMarkoCode(id: string, snapshot: ts.IScriptSnapshot): MarkoCode {
  console.log(id);
  const { fsPath, scheme } = URI.parse(id);
  const filename = scheme === "file" ? fsPath : undefined;
  console.log("filename", filename);
  const dirname = filename ? path.dirname(filename) : process.cwd();
  const document = snapshot.getText(0, snapshot.getLength());
  const markoDocument = parse(document);
  const tagLookup = Project.getTagLookup(dirname);

  return {
    id: "root",
    languageId: "marko",
    snapshot,
    mappings: [
      {
        sourceOffsets: [0],
        generatedOffsets: [0],
        lengths: [snapshot.getLength()],
        data: {
          completion: true,
          format: true,
          navigation: true,
          semantic: true,
          structure: true,
          verification: true,
        },
      },
    ],
    embeddedCodes: [...createEmbeddedCodes()],
    markoDocument,
    tagLookup,
  };

  function* createEmbeddedCodes(): Generator<VirtualCode> {
    console.log("Extracting Script");
    const script = extractScript({
      parsed: markoDocument,
      scriptLang: ScriptLang.js,
      lookup: tagLookup,
    });
    const scriptText = script.toString();

    yield {
      id: "script_0",
      languageId: "typescript",
      snapshot: {
        getText: (start, end) => scriptText.substring(start, end),
        getLength: () => scriptText.length,
        getChangeRange: () => undefined,
      },
      mappings: [generateMappingsFromExtracted(script)],
      embeddedCodes: [],
    };
  }
}

function generateMappingsFromExtracted(
  extracted: ReturnType<typeof extractScript>
): CodeMapping {
  const sourceOffsets = [];
  const generatedOffsets: number[] = [];
  const lengths = [];

  for (const node of extracted.parsed.program.static) {
    if (node.type === NodeType.Class) {
      // const sourceStartLocation = extracted.parsed.positionAt(node.start);
      // sourceStartLocation.line += 1;
      // const modifiedSourceStartOffset = extracted.parsed.(sourceStartLocation);
      const generatedStartOffset = extracted.generatedOffsetAt(node.start + 10);
      console.log(" - generatedStartOffset", generatedStartOffset);
      console.log(extracted.parsed.code.slice(node.start, node.end));
      if (generatedStartOffset) {
        sourceOffsets.push(node.start + 10);
        generatedOffsets.push(generatedStartOffset);
        lengths.push(node.end - (node.start + 10));
      } else {
        console.error(
          `Failed to find generated offset for class at ${node.start}`
        );
      }
    }
  }

  for (const node of extracted.parsed.program.body) {
    console.log("NodeType", NodeType[node.type]);
    if (node.type === NodeType.Scriptlet) {
      const generatedStartOffset = extracted.generatedOffsetAt(
        node.value.start
      );
      console.log(" - generatedStartOffset", generatedStartOffset);
      if (generatedStartOffset) {
        sourceOffsets.push(node.value.start);
        generatedOffsets.push(generatedStartOffset);
        lengths.push(node.value.end - node.value.start);
      } else {
        console.error(
          `Failed to find generated offset for scriptlet at ${node.value.start}`
        );
      }
    }
  }
  return {
    sourceOffsets,
    generatedOffsets,
    lengths,

    data: {
      completion: true,
      format: true,
      navigation: true,
      semantic: true,
      structure: true,
      verification: true,
    },
  };
}
