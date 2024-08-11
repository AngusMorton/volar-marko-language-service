import {
  LanguageServiceEnvironment,
  MessageType,
  ShowMessageNotification,
  type Connection,
} from "@volar/language-server/node";
import { getMarkoPrettierService } from "./plugin/prettier";
import { create as createEmmetService } from "volar-service-emmet";
import { create as createHtmlService } from "volar-service-html";
import { create as createCssService } from "volar-service-css";
import { create as createTypeScriptTwoSlashService } from "volar-service-typescript-twoslash-queries";
import { create as createTypeScriptServices } from "./plugin/typescript";
import { create as createMarkoService } from "./plugin/marko";
import { getMarkoLanguagePlugin } from "./core";
import { getMarkoInstall } from "./util/getMarkoInstall";

export function getLanguagePlugins(
  connection: Connection,
  ts: typeof import("typescript"),
  serviceEnv: LanguageServiceEnvironment,
  tsconfig: string | undefined
) {
  const rootPath = tsconfig
    ? tsconfig.split("/").slice(0, -1).join("/")
    : serviceEnv.workspaceFolders[0]!.fsPath;

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

  return [getMarkoLanguagePlugin(markoInstall, ts)];
}

export function getLanguageServicePlugins(
  connection: Connection,
  ts: typeof import("typescript")
) {
  const result = [
    createHtmlService(),
    createCssService(),
    createEmmetService(),
    ...createTypeScriptServices(ts),
    createTypeScriptTwoSlashService(ts),
    //  createTypescriptAddonsService(),
    createMarkoService(ts),
    getMarkoPrettierService(connection),
  ];
  return result;
}
