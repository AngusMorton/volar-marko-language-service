import type { LanguageServicePlugin } from "@volar/language-server";
import { create as createTypeScriptServices } from "volar-service-typescript";

export const create = (
  ts: typeof import("typescript")
): LanguageServicePlugin[] => {
  const tsServicePlugins = createTypeScriptServices(
    ts as typeof import("typescript"),
    {}
  );
  return tsServicePlugins.map<LanguageServicePlugin>((plugin) => {
    if (plugin.name === "typescript-semantic") {
      return {
        ...plugin,
        // create(context): LanguageServicePluginInstance {
        //   const typeScriptPlugin = plugin.create(context);
        //   return {
        //     ...typeScriptPlugin,
        //     async provideCompletionItems(
        //       document,
        //       position,
        //       completionContext,
        //       token
        //     ) {
        //       const originalCompletions =
        //         await typeScriptPlugin.provideCompletionItems!(
        //           document,
        //           position,
        //           completionContext,
        //           token
        //         );
        //       if (!originalCompletions) return null;
        //       return originalCompletions;
        //     },
        //     async resolveCompletionItem(item, token) {
        //       const resolvedCompletionItem =
        //         await typeScriptPlugin.resolveCompletionItem!(item, token);
        //       if (!resolvedCompletionItem) return item;

        //       return resolvedCompletionItem;
        //     },
        //     async provideCodeActions(
        //       document,
        //       range,
        //       codeActionContext,
        //       token
        //     ) {
        //       const originalCodeActions =
        //         await typeScriptPlugin.provideCodeActions!(
        //           document,
        //           range,
        //           codeActionContext,
        //           token
        //         );
        //       if (!originalCodeActions) return null;

        //       return originalCodeActions;
        //     },
        //     async resolveCodeAction(codeAction, token) {
        //       const resolvedCodeAction =
        //         await typeScriptPlugin.resolveCodeAction!(codeAction, token);
        //       if (!resolvedCodeAction) return codeAction;

        //       return resolvedCodeAction;
        //     },
        //   };
        // },
      };
    }
    return plugin;
  });
};
