import {
  Diagnostic,
  ServicePlugin,
  ServicePluginInstance,
  DiagnosticSeverity,
} from "@volar/language-server";
import { DiagnosticType } from "@marko/babel-utils";
import { MarkoVirtualCode } from "../../core/index.js";
import type { MarkoMeta } from "@marko/compiler";
type DiagnosticMessage = MarkoMeta["diagnostics"][0];

export const create = (ts: typeof import("typescript")): ServicePlugin => {
  return {
    triggerCharacters: ["<"],
    create(context): ServicePluginInstance {
      return {
        provideSemanticDiagnostics(document, token) {
          if (token.isCancellationRequested) return [];

          const [file] = context.documents.getVirtualCodeByUri(document.uri);
          if (!(file instanceof MarkoVirtualCode)) return;

          const parserDiagnostics = file.parserDiagnostics.map(
            parserMessageToDiagnostic
          );
          const compilerDiagnostics = file.compilerDiagnostics.map(
            compilerMessageToDiagnostic
          );

          return [...parserDiagnostics, ...compilerDiagnostics];

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
