import {
  CompletionItemKind,
  type CompletionList,
} from "vscode-html-languageservice";

export function enhancedProvideCompletionItems(
  completions: CompletionList
): CompletionList {
  completions.items = completions.items.map((completion) => {
    const source = completion?.data?.originalItem?.source;
    if (source) {
      // Sort completions starting with `astro:` higher than other imports
      if (source.startsWith("marko:")) {
        completion.sortText =
          "\u0000" + (completion.sortText ?? completion.label);
      }

      // For components import, use the file kind and sort them first, as they're often what the user want over something else
      if (source.endsWith(".marko")) {
        completion.kind = CompletionItemKind.File;
        completion.detail = completion.detail + "\n\n" + source;
        completion.sortText =
          "\u0001" + (completion.sortText ?? completion.label);
        completion.data.isComponent = true;
      }
    }

    return completion;
  });

  return completions;
}
