import {
  CodeMapping,
  forEachEmbeddedCode,
  type LanguagePlugin,
  type VirtualCode,
} from "@volar/language-core";
import { getMarkoVirtualFile } from "./getMarkoVirtualFile";
import { URI } from "vscode-uri";
import type ts from "typescript";
import path from "path";
import type TS from "typescript/lib/tsserverlibrary";
import type { PackageInfo } from "../util/importPackage";

export function getLanguageModule(
  markoInstallInfo: PackageInfo,
  ts: typeof import("typescript")
): LanguagePlugin<MarkoVirtualCode> {
  return {
    createVirtualCode(fileId, languageId, snapshot) {
      if (languageId === "marko") {
        const fileName = fileId.includes("://")
          ? URI.parse(fileId).fsPath.replace(/\\/g, "/")
          : fileId;
        console.log("Creating Virtual Code", fileName);
        return new MarkoVirtualCode(fileName, snapshot, ts);
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

            if (markoInstallInfo) {
              const markoTypesFile = ts.sys.resolvePath(
                path.join(markoInstallInfo.path, "index.d.ts")
              );
              addedFileNames.push(markoTypesFile);
            } else {
              // These are a copy of the types defined in the marko project for
              // when we can't find a marko install.
              addedFileNames.push(
                ts.sys.resolvePath(
                  path.resolve(builtInTypes, "marko.runtime.d.ts")
                )
              );
            }

            // const resolveTypeCompilerOptions: TS.CompilerOptions = {
            //   moduleResolution: ts.ModuleResolutionKind.Bundler,
            // };
            // const markoRunGeneratedTypesFile = path.join(
            //   rootDir,
            //   ".marko-run/routes.d.ts"
            // );
            // const resolveFromFile = path.join(rootDir, "_.d.ts");
            // const internalTypesFile =
            //   defaultTypeLibs.internalTypesFile ||
            //   ts.resolveTypeReferenceDirective(
            //     "@marko/language-tools/marko.internal.d.ts",
            //     resolveFromFile,
            //     resolveTypeCompilerOptions,
            //     host
            //   ).resolvedTypeReferenceDirective?.resolvedFileName;
            // const { resolvedTypeReferenceDirective: resolvedMarkoTypes } =
            //   ts.resolveTypeReferenceDirective(
            //     (config.translator.runtimeTypes as string | undefined) ||
            //       "marko",
            //     resolveFromFile,
            //     resolveTypeCompilerOptions,
            //     host
            //   );
            // const { resolvedTypeReferenceDirective: resolvedMarkoRunTypes } =
            //   ts.resolveTypeReferenceDirective(
            //     "@marko/run",
            //     resolveFromFile,
            //     resolveTypeCompilerOptions,
            //     host
            //   );
            // const markoTypesFile =
            //   resolvedMarkoTypes?.resolvedFileName ||
            //   defaultTypeLibs.markoTypesFile;
            // const markoRunTypesFile = resolvedMarkoRunTypes?.resolvedFileName;

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

    const virtualCode = getMarkoVirtualFile(
      this.fileName,
      this.snapshot.getText(0, this.snapshot.getLength()),
      this.ts
    );

    this.embeddedCodes.push(virtualCode);
  }
}
