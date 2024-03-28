import { create as createPrettierService } from "volar-service-prettier";
import { getMarkoPrettierPluginPath, importPrettier } from "./package";
import type { Connection } from "@volar/language-server";
import { ShowMessageNotification } from "@volar/language-server";
import { MessageType } from "@volar/language-server";
import { URI } from "vscode-uri";
import type { ServicePlugin } from "@volar/language-server";
import { dynamicRequire } from "../../util/importPackage";
import { dirname } from "path";
import { Project } from "@marko/language-tools";

export function getMarkoPrettierService(connection: Connection): ServicePlugin {
  let prettier: ReturnType<typeof importPrettier>;
  let prettierPluginName: ReturnType<typeof getMarkoPrettierPluginPath>[1];
  let prettierPluginPath: ReturnType<typeof getMarkoPrettierPluginPath>[0];
  let hasShownNotification = false;

  return createPrettierService(
    (context) => {
      console.log("Looking for Prettier in", context.env.workspaceFolder);
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
      isFormattingEnabled: async (prettier, document, context) => {
        console.log("Is Formatting Enabled");
        const uri = URI.parse(document.uri);
        if (uri.scheme === "file") {
          const fileInfo = await prettier.getFileInfo(uri.fsPath, {
            ignorePath: ".prettierignore",
            resolveConfig: false,
          });
          if (fileInfo.ignored) {
            return false;
          }
        }
        return true;
      },
      getFormattingOptions: async (
        prettierInstance,
        document,
        formatOptions,
        context
      ) => {
        console.log("Getting formatting options");
        console.log(document.uri);
        const filePath = URI.parse(document.uri).fsPath;
        const fileDir = dirname(filePath);
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

        try {
          let resolvedPlugin;
          if (prettierPluginPath) {
            resolvedPlugin = dynamicRequire(prettierPluginPath);

            resolvedPlugin.setCompiler(
              Project.getCompiler(fileDir),
              Project.getConfig(fileDir)
            );
          } else {
            // Fallback to the built-in version of marko-prettier-plugin if the workspace doesn't have it installed.
            // resolvedPlugin = markoPrettier;
            throw Error("prettier-plugin-marko not found.");
          }

          return {
            ...resolvedConfig,
            plugins: [resolvedPlugin, ...(resolvedConfig.plugins ?? [])],
            parser: "marko",
          };
        } catch (e) {
          connection.sendNotification(ShowMessageNotification.type, {
            message: `Failed to configure marko-prettier-plugin.\n\nError:\n${e}`,
            type: MessageType.Warning,
          });
          console.error("Failed to load Prettier config.", e);
          return {
            ...resolvedConfig,
          };
        }
      },
    }
  );
}
