import {
  Diagnostic,
  DiagnosticSeverity,
  LanguageServicePlugin,
  LanguageServicePluginInstance,
} from "@volar/language-server";
import { DiagnosticType, NodeType } from "marko-language-tools";
import { MarkoVirtualCode } from "../../core/index.js";
import type { MarkoMeta } from "marko-language-tools";
import { URI } from "vscode-uri";
import { getImportCompletion } from "./completion/getImportCompletion.js";
import { provideOpenTagDefinitions } from "./definition/provideOpenTagDefiniitions.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { getAttrNameCompletion } from "./completion/getAttrNameCompletion.js";

type DiagnosticMessage = MarkoMeta["diagnostics"][0];

export const create = (
  ts: typeof import("typescript")
): LanguageServicePlugin => {
  return {
    capabilities: {
      completionProvider: {
        triggerCharacters: ["<"],
      },
    },
    create(context): LanguageServicePluginInstance {
      return {
        provideCompletionItems(document, position, completionContext, token) {
          if (token.isCancellationRequested) return;

          return worker(document, (virtualCode) => {
            const offset = document.offsetAt(position);
            const node = virtualCode.markoAst.nodeAt(offset);
            if (!node) return;
            if (node.type === NodeType.Import) {
              return {
                items: getImportCompletion(node, virtualCode),
                isIncomplete: true,
              };
            } else if (node.type === NodeType.AttrName) {
              return {
                items: getAttrNameCompletion(node, virtualCode, offset),
                isIncomplete: true,
              };
            }

            return {
              items: [],
              isIncomplete: false,
            };
          });
        },

        provideDefinition(document, position, token) {
          if (token.isCancellationRequested) return;

          return worker(document, (virtualCode) => {
            const node = virtualCode.markoAst.nodeAt(
              document.offsetAt(position)
            );
            if (!node) return;

            if (node.type === NodeType.OpenTagName) {
              return provideOpenTagDefinitions(node, virtualCode);
            }
          });
        },

        provideDiagnostics(document, token) {
          if (token.isCancellationRequested) return [];

          return worker(document, (virtualCode) => {
            try {
              const parserDiagnostics = virtualCode.parserDiagnostics.map(
                parserMessageToDiagnostic
              );
              const compilerDiagnostics = virtualCode.compilerDiagnostics.map(
                compilerMessageToDiagnostic
              );

              const diagnostics = [
                ...parserDiagnostics,
                ...compilerDiagnostics,
              ];

              return diagnostics;
            } catch (error) {
              console.error("Error providing diagnostics", error);
            }

            return [];
          });

          function parserMessageToDiagnostic(
            diag: MarkoVirtualCode["parserDiagnostics"][0]
          ): Diagnostic {
            return {
              message: diag.message,
              range: {
                start: document.positionAt(diag.start),
                end: document.positionAt(diag.end),
              },
              code: diag.code,
              severity: DiagnosticSeverity.Error,
              source: "marko",
            };
          }

          function compilerMessageToDiagnostic(
            diag: DiagnosticMessage
          ): Diagnostic {
            console.log("compilerMessageToDiagnostic", diag);

            const range = diag.loc
              ? {
                  start: {
                    line: diag.loc.start.line - 1,
                    character: diag.loc.start.column,
                  },
                  end: {
                    line: diag.loc.end.line - 1,
                    character: diag.loc.end.column,
                  },
                }
              : {
                  start: { line: 0, character: 0 },
                  end: { line: 0, character: 0 },
                };

            let severity: DiagnosticSeverity | undefined;

            switch (diag.type) {
              case DiagnosticType.Warning:
              case DiagnosticType.Deprecation:
                severity = DiagnosticSeverity.Warning;
                break;
              case DiagnosticType.Suggestion:
                severity = DiagnosticSeverity.Hint;
                break;
              default:
                severity = DiagnosticSeverity.Error;
                break;
            }

            return {
              message: diag.label,
              range,
              code: undefined,
              severity: severity,
              source: "marko",
            };
          }
        },
      };

      async function worker<T>(
        document: TextDocument,
        callback: (markoDocument: MarkoVirtualCode) => T
      ): Promise<Awaited<T> | undefined> {
        const decoded = context.decodeEmbeddedDocumentUri(
          URI.parse(document.uri)
        );
        const sourceScript =
          decoded && context.language.scripts.get(decoded[0]);
        const virtualCode =
          decoded && sourceScript?.generated?.embeddedCodes.get(decoded[1]);
        if (!(virtualCode instanceof MarkoVirtualCode)) return;

        return await callback(virtualCode);
      }
    },
  };
};
