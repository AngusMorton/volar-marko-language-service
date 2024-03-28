import type * as prettier from "prettier";
import { getPackagePath } from "../../util/importPackage";

export function importPrettier(fromPath: string): typeof prettier | undefined {
  const prettierPkg = getPackagePath("prettier", [fromPath, __dirname]);

  if (!prettierPkg) {
    return undefined;
  }

  return require(prettierPkg);
}

export function getMarkoPrettierPluginPath(
  fromPath: string
):
  | [string, "prettier-plugin-marko" | "prettier-plugin-htmljs"]
  | [undefined, undefined] {
  const corePluginPath = getPackagePath(
    "prettier-plugin-marko",
    [fromPath, __dirname],
    false
  );

  // Prefer the official plugin if it's installed.
  if (corePluginPath) {
    return [corePluginPath, "prettier-plugin-marko"];
  }

  // Otherwise, use the htmljs plugin. We might in the future want to make
  // the htmljs version the preferred plugin.
  // const secondaryPlugin = getPackagePath(
  //   "prettier-plugin-htmljs",
  //   [fromPath, __dirname],
  //   false
  // );

  // if (!secondaryPlugin) {
  //   return [undefined, undefined];
  // }

  // return [secondaryPlugin, "prettier-plugin-htmljs"];
  return [undefined, undefined];
}
