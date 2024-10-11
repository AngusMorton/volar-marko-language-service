/// <reference types="@volar/typescript" />

import {
  type CodeMapping,
  forEachEmbeddedCode,
  type LanguagePlugin,
  type VirtualCode,
} from "@volar/language-core";
import type ts from "typescript";
import path from "path";
import { parseScripts } from "./parseScript";
import { Project, parse } from "marko-language-tools";

export function getLanguagePlugin(
  ts: typeof import("typescript")
): LanguagePlugin<string, MarkoVirtualCode> {
  return {
    getLanguageId(fileName: string) {
      if (fileName.endsWith(".marko")) {
        return "marko";
      }
    },
    createVirtualCode(fileId, languageId, snapshot) {
      if (languageId === "marko") {
        return new MarkoVirtualCode(fileId, snapshot, ts);
      }
    },
    typescript: {
      extraFileExtensions: [
        { extension: "marko", isMixedContent: true, scriptKind: 7 },
      ],
      getServiceScript(markoCode) {
        for (const code of forEachEmbeddedCode(markoCode)) {
          if (code.id === "script") {
            return {
              code,
              extension: ".ts",
              scriptKind: 3 satisfies ts.ScriptKind.TS,
            };
          }
        }
      },
    },
  };
}

export class MarkoVirtualCode implements VirtualCode {
  id = "root";
  languageId = "marko";
  mappings!: CodeMapping[];
  embeddedCodes!: VirtualCode[];
  codegenStacks = [];

  constructor(
    public fileName: string,
    public snapshot: ts.IScriptSnapshot,
    public ts: typeof import("typescript")
  ) {
    this.mappings = [
      {
        sourceOffsets: [0],
        generatedOffsets: [0],
        lengths: [this.snapshot.getLength()],
        data: {
          verification: true,
          completion: true,
          semantic: true,
          navigation: true,
          structure: true,
          format: false,
        },
      },
    ];

    this.embeddedCodes = [];

    const dirname = path.dirname(this.fileName);
    const tagLookup = Project.getTagLookup(dirname);
    const text = this.snapshot.getText(0, this.snapshot.getLength());
    const markoAst = parse(text, this.fileName);
    const scripts = parseScripts(this.fileName, markoAst, this.ts, tagLookup);
    this.embeddedCodes.push(...scripts);
  }
}
