import {
  Diagnostic,
  DiagnosticSeverity,
  LanguageServicePlugin,
  LanguageServicePluginInstance,
} from "@volar/language-server";
import { DiagnosticType } from "@marko/babel-utils";
import { MarkoVirtualCode } from "../../core/index.js";
import type { MarkoMeta } from "@marko/compiler";
import { NodeType } from "@marko/language-tools";
import { getOpenTagNameCompletions } from "./completion/getOpenTagNameCompletions.js";
import { getTagCompletion } from "./completion/getTagCompletion.js";
import { URI } from "vscode-uri";
import { getImportCompletion } from "./completion/getImportCompletion.js";
import { provideOpenTagDefinitions } from "./definition/provideOpenTagDefiniitions.js";
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

          const decoded = context.decodeEmbeddedDocumentUri(
            URI.parse(document.uri)
          );

          const sourceScript =
            decoded && context.language.scripts.get(decoded[0]);
          const virtualCode =
            decoded && sourceScript?.generated?.embeddedCodes.get(decoded[1]);
          if (!(virtualCode instanceof MarkoVirtualCode)) return;

          const node = virtualCode.markoAst.nodeAt(document.offsetAt(position));
          if (!node) return;
          if (
            node.type === NodeType.OpenTagName ||
            // If the user types "<", then we assume they're trying to open a tag.
            completionContext.triggerCharacter === "<"
          ) {
            return {
              items: getOpenTagNameCompletions(node, virtualCode),
              isIncomplete: false,
            };
          } else if (node.type === NodeType.Tag) {
            return {
              items: getTagCompletion(
                node,
                virtualCode,
                document.offsetAt(position)
              ),
              isIncomplete: false,
            };
          } else if (node.type === NodeType.Import) {
            return {
              items: getImportCompletion(node, virtualCode),
              isIncomplete: true,
            };
          }

          return {
            items: [],
            isIncomplete: false,
          };
        },

        provideDefinition(document, position, token) {
          if (token.isCancellationRequested) return;

          const decoded = context.decodeEmbeddedDocumentUri(
            URI.parse(document.uri)
          );

          const sourceScript =
            decoded && context.language.scripts.get(decoded[0]);
          const virtualCode =
            decoded && sourceScript?.generated?.embeddedCodes.get(decoded[1]);
          if (!(virtualCode instanceof MarkoVirtualCode)) return;

          const node = virtualCode.markoAst.nodeAt(document.offsetAt(position));
          if (!node) return;

          if (node.type === NodeType.OpenTagName) {
            return provideOpenTagDefinitions(node, virtualCode);
          }
        },

        provideDiagnostics(document, token) {
          if (token.isCancellationRequested) return [];

          const decoded = context.decodeEmbeddedDocumentUri(
            URI.parse(document.uri)
          );
          const sourceScript =
            decoded && context.language.scripts.get(decoded[0]);
          const virtualCode =
            decoded && sourceScript?.generated?.embeddedCodes.get(decoded[1]);
          if (!(virtualCode instanceof MarkoVirtualCode)) return;

          console.log("Providing diagnostics for", virtualCode.fileName);

          const parserDiagnostics = virtualCode.parserDiagnostics.map(
            parserMessageToDiagnostic
          );
          const compilerDiagnostics = virtualCode.compilerDiagnostics.map(
            compilerMessageToDiagnostic
          );

          const diagnostics = [...parserDiagnostics, ...compilerDiagnostics];

          return diagnostics;

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
    },
  };
};
