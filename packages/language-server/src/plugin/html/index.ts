import type {
  LanguageServicePlugin,
  LanguageServicePluginInstance,
} from "@volar/language-server";
import { create as createHtmlService } from "volar-service-html";
import { URI } from "vscode-uri";
import { MarkoVirtualCode } from "../../core";
import { getOpenTagNameCompletions } from "../marko/completion/getOpenTagNameCompletions";

export const create = (): LanguageServicePlugin => {
  const htmlPlugin = createHtmlService({
    getCustomData: (context) => {
      return [];
    },
  });
  return {
    ...htmlPlugin,
    create(context): LanguageServicePluginInstance {
      const htmlPluginInstance = htmlPlugin.create(context);

      return {
        ...htmlPluginInstance,
        async provideCompletionItems(
          document,
          position,
          completionContext,
          token
        ) {
          if (document.languageId !== "html") return;

          const decoded = context.decodeEmbeddedDocumentUri(
            URI.parse(document.uri)
          );
          const sourceScript =
            decoded && context.language.scripts.get(decoded[0]);
          const root = sourceScript?.generated?.root;
          if (!(root instanceof MarkoVirtualCode)) return;

          const node = root.htmlAst.parsed.nodeAt(document.offsetAt(position));
          if (!node) return;

          let completions = await htmlPluginInstance.provideCompletionItems!(
            document,
            position,
            completionContext,
            token
          );
          const markoTagCompletions = getOpenTagNameCompletions(node, root);
          if (completions) {
            completions.items.push(...markoTagCompletions);
          } else {
            completions = { isIncomplete: false, items: markoTagCompletions };
          }

          if (!completions) {
            return null;
          }

          return completions;
        },
      };
    },
  };
};
