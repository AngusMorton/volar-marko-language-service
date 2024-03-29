import {
  MessageType,
  ShowMessageNotification,
  type Connection,
} from "@volar/language-server/node";
import { getMarkoPrettierService } from "./plugin/prettier";
import { create as createEmmetService } from "volar-service-emmet";
import { create as createHtmlService } from "volar-service-html";
import { create as createCssService } from "volar-service-css";
import { create as createTypeScriptServices } from "volar-service-typescript";
import { create as createMarkoService } from "./plugin/marko";
import type { ServerOptions } from "@volar/language-server/lib/server";
import { getLanguageModule } from "./core";
import { getMarkoInstall } from "./util/getMarkoInstall";

export function createServerOptions(
  connection: Connection,
  ts: typeof import("typescript")
): ServerOptions {
  return {
    watchFileExtensions: ["marko"],
    getLanguagePlugins(serviceEnv, projectContext) {
      if (projectContext.typescript) {
        const rootPath = projectContext.typescript.configFileName
          ? projectContext.typescript.configFileName
              .split("/")
              .slice(0, -1)
              .join("/")
          : serviceEnv.typescript!.uriToFileName(serviceEnv.workspaceFolder);

        const nearestPackageJson = ts.findConfigFile(
          rootPath,
          ts.sys.fileExists,
          "package.json"
        );

        const markoInstall = getMarkoInstall([rootPath], {
          nearestPackageJson,
        });

        if (!markoInstall) {
          connection.sendNotification(ShowMessageNotification.type, {
            message:
              "Couldn't find Marko in your project. Please make sure Marko is installed and restart the language server.",
            type: MessageType.Warning,
          });
          return [];
        }

        console.log("Found Marko", markoInstall);
        return [getLanguageModule(markoInstall, ts)];
      }

      return [];
    },
    getServicePlugins() {
      console.log("getServicePlugins");
      const result = [
        createHtmlService(),
        createCssService(),
        createEmmetService(),
        ...createTypeScriptServices(ts),
        createMarkoService(ts),
        getMarkoPrettierService(connection),
      ];
      return result;
    },
  };
}
