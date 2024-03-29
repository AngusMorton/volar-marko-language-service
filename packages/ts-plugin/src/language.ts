import {
  type CodeMapping,
  forEachEmbeddedCode,
  type LanguagePlugin,
  type VirtualCode,
} from "@volar/language-core";
import type ts from "typescript";
import path from "path";
import { Project, parse } from "@marko/language-tools";
import { parseScripts } from "./parseScript";

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
      resolveLanguageServiceHost(host) {
        return {
          ...host,
          getScriptFileNames() {
            const addedFileNames = [];

            const builtInTypes = ts.sys.resolvePath(
              path.resolve(__dirname, "./types")
            );
            addedFileNames.push(
              ts.sys.resolvePath(
                path.resolve(builtInTypes, "marko.internal.d.ts")
              )
            );

            // These are a copy of the types defined in the marko project for
            // when we can't find a marko install.
            addedFileNames.push(
              ts.sys.resolvePath(
                path.resolve(builtInTypes, "marko.runtime.d.ts")
              )
            );

            return [...host.getScriptFileNames(), ...addedFileNames];
          },
        };
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

    const dirname = path.dirname(this.fileName);
    const tagLookup = Project.getTagLookup(dirname);
    const text = this.snapshot.getText(0, this.snapshot.getLength());
    const markoAst = parse(text, this.fileName);
    const scripts = parseScripts(this.fileName, markoAst, this.ts, tagLookup);
    this.embeddedCodes.push(...scripts);
  }
}
