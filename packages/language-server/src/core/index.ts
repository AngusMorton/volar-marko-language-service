import {
  CodeMapping,
  forEachEmbeddedCode,
  type LanguagePlugin,
  type VirtualCode,
} from "@volar/language-core";
import { parseScripts } from "./parseScript";
import { URI } from "vscode-uri";
import type ts from "typescript";
import path, { dirname } from "path";
import type { PackageInfo } from "../util/importPackage";
import { Project, parse } from "@marko/language-tools";
import type { MarkoMeta } from "@marko/compiler";
import { parseStyles } from "./parseStyles";
import { parseHtml } from "./parseHtml";
import { DiagnosticType } from "@marko/babel-utils";

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
  parserDiagnostics: {
    message: string;
    start: number;
    end: number;
    code: number;
  }[] = [];
  compilerDiagnostics: MarkoMeta["diagnostics"] = [];
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
          format: true,
        },
      },
    ];

    this.embeddedCodes = [];

    const dirname = path.dirname(this.fileName);
    const tagLookup = Project.getTagLookup(dirname);
    const text = this.snapshot.getText(0, this.snapshot.getLength());
    const markoAst = parse(text, this.fileName);
    // TODO: Fork @marko/language-tools?
    this.parserDiagnostics = markoAst.errors ?? [];

    const scripts = parseScripts(this.fileName, markoAst, this.ts, tagLookup);
    this.embeddedCodes.push(...scripts);

    const styles = parseStyles(this.fileName, markoAst, tagLookup);
    this.embeddedCodes.push(...styles);

    const html = parseHtml(markoAst);
    this.embeddedCodes.push(...html);

    const compiler = Project.getCompiler(this.fileName);
    try {
      const result = compiler.compileSync(text, this.fileName, compilerConfig);
      this.compilerDiagnostics = result.meta.diagnostics ?? [];
    } catch (e: any) {
      if (this.parserDiagnostics.length === 0) {
        // The parser didn't find any errors, so this is likely a compiler error.
        this.compilerDiagnostics = [
          {
            type: DiagnosticType.Error,
            label: "The Marko Compiler encountered an error. " + e.message,
            fix: false,
            loc: {
              start: { line: 0, column: 0 },
              end: { line: 0, column: 0 },
            },
          },
        ];
      }
    }
  }
}

const compilerConfig = {
  code: false,
  output: "migrate",
  sourceMaps: false,
  errorRecovery: true,
  babelConfig: {
    babelrc: false,
    configFile: false,
    browserslistConfigFile: false,
    caller: {
      name: "@marko/language-server",
      supportsStaticESM: true,
      supportsDynamicImport: true,
      supportsTopLevelAwait: true,
      supportsExportNamespaceFrom: true,
    },
  },
} as const;
