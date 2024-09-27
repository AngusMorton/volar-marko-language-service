import { getMarkoPrettierService } from "./plugin/prettier";
import { create as createEmmetService } from "volar-service-emmet";
import { create as createCssService } from "volar-service-css";
import { create as createTypeScriptTwoSlashService } from "volar-service-typescript-twoslash-queries";
import { getMarkoLanguagePlugin } from "./core";
import { create as createTypeScriptServices } from "volar-service-typescript";
// import { create as createHtmlService } from "./plugin/html";
import { create as createMarkoService } from "./plugin/marko";
import type { Connection } from "@volar/language-server";

export function getLanguagePlugins(ts: typeof import("typescript")) {
  return [getMarkoLanguagePlugin(ts)];
}

export function getLanguageServicePlugins(
  connection: Connection,
  ts: typeof import("typescript")
) {
  const result = [
    // createHtmlService(),
    createCssService(),
    createEmmetService(),
    ...createTypeScriptServices(ts),
    createTypeScriptTwoSlashService(ts),
    createMarkoService(ts),
    getMarkoPrettierService(connection),
  ];
  return result;
}
