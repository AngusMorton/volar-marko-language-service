import {
  type CodeMapping,
  forEachEmbeddedCode,
  type LanguagePlugin,
  type VirtualCode,
} from "@volar/language-core";
import type ts from "typescript";
import { getMarkoVirtualFile } from "./getMarkoVirtualFile";

export function getLanguageModule(
  ts: typeof import("typescript")
): LanguagePlugin<MarkoVirtualCode> {
  return {
    createVirtualCode(fileId, languageId, snapshot) {
      if (languageId === "marko") {
        return new MarkoVirtualCode(fileId, snapshot, ts);
      }
    },
    updateVirtualCode(_fileId, markoFile, newSnapshot) {
      markoFile.update(newSnapshot);
      return markoFile;
    },
    typescript: {
      extraFileExtensions: [
        { extension: "marko", isMixedContent: true, scriptKind: 7 },
      ],
      getScript(markoCode) {
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
    this.onSnapshotUpdated();
  }

  public update(newSnapshot: ts.IScriptSnapshot) {
    this.snapshot = newSnapshot;
    this.onSnapshotUpdated();
  }

  onSnapshotUpdated() {
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

    const virtualCode = getMarkoVirtualFile(
      this.fileName,
      this.snapshot.getText(0, this.snapshot.getLength()),
      this.ts
    );

    this.embeddedCodes.push(virtualCode);
  }
}
