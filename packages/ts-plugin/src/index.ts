import { createLanguageServicePlugin } from "@volar/typescript/lib/quickstart/createLanguageServicePlugin.js";
import { getLanguagePlugin } from "./language";

export = createLanguageServicePlugin((ts: typeof import("typescript")) => {
  return {
    languagePlugins: [getLanguagePlugin(ts)],
  };
});
