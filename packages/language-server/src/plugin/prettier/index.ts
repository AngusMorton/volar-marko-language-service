import { create as createPrettierService } from "volar-service-prettier";
import { getMarkoPrettierPluginPath, importPrettier } from "./package";
import type { Connection } from "@volar/language-server";
import { ShowMessageNotification } from "@volar/language-server";
import { MessageType } from "@volar/language-server";
import { URI } from "vscode-uri";
import type { ServicePlugin } from "@volar/language-server";

export function getMarkoPrettierService(connection: Connection): ServicePlugin {
  let prettier: ReturnType<typeof importPrettier>;
  let prettierPluginName: ReturnType<typeof getMarkoPrettierPluginPath>[1];
  let prettierPluginPath: ReturnType<typeof getMarkoPrettierPluginPath>[0];
  let hasShownNotification = false;

  return createPrettierService(
    (context) => {
      const workspaceUri = URI.parse(context.env.workspaceFolder);
      if (workspaceUri.scheme === "file") {
        prettier = importPrettier(workspaceUri.fsPath);
        const [path, pluginName] =
          getMarkoPrettierPluginPath(workspaceUri.fsPath) ?? [];
        prettierPluginPath = path;
        prettierPluginName = pluginName;
        if ((!prettier || !prettierPluginPath) && !hasShownNotification) {
          connection.sendNotification(ShowMessageNotification.type, {
            message:
              "Couldn't load `prettier` or `prettier-plugin-marko`/`prettier-plugin-htmljs`. Formatting will not work. Please make sure those two packages are installed into your project and restart the language server.",
            type: MessageType.Warning,
          });
          hasShownNotification = true;
        }
        return prettier;
      }
    },
    {
      documentSelector: [{ language: "marko" }],
      getFormattingOptions: async (
        prettierInstance,
        document,
        formatOptions,
        context
      ) => {
        const filePath = URI.parse(document.uri).fsPath;

        let configOptions = null;
        try {
          configOptions = await prettierInstance.resolveConfig(filePath, {
            useCache: false,
            editorconfig: true,
          });
        } catch (e) {
          connection.sendNotification(ShowMessageNotification.type, {
            message: `Failed to load Prettier config.\n\nError:\n${e}`,
            type: MessageType.Warning,
          });
          console.error("Failed to load Prettier config.", e);
        }

        const editorOptions = await context.env.getConfiguration<object>?.(
          "prettier",
          document.uri
        );

        // Return a config with the following cascade:
        // - Prettier config file should always win if it exists, if it doesn't:
        // - Prettier config from the VS Code extension is used, if it doesn't exist:
        // - Use the editor's basic configuration settings
        const resolvedConfig = {
          filepath: filePath,
          tabWidth: formatOptions.tabSize,
          useTabs: !formatOptions.insertSpaces,
          ...editorOptions,
          ...configOptions,
        };

        console.log("config", {
          ...resolvedConfig,
          plugins: [
            ...(await getMarkoPrettierPlugin()),
            ...(resolvedConfig.plugins ?? []),
          ],
          parser: "marko",
        });

        return {
          ...resolvedConfig,
          plugins: [
            ...(await getMarkoPrettierPlugin()),
            ...(resolvedConfig.plugins ?? []),
          ],
          parser: "marko",
        };

        async function getMarkoPrettierPlugin() {
          if (!prettier || !prettierPluginPath || !prettierPluginName) {
            return [];
          }

          const supportInfo = await prettier.getSupportInfo();
          const hasPluginLoadedAlready =
            supportInfo.languages.some((l: any) => l.name === "marko") ||
            resolvedConfig.plugins?.includes(prettierPluginName); // getSupportInfo doesn't seems to work very well in Prettier 3 for plugins

          return hasPluginLoadedAlready ? [] : [prettierPluginPath];
        }
      },
    }
  );
}
