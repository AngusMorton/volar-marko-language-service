import { createLanguageServicePlugin } from "@volar/typescript/lib/quickstart/createLanguageServicePlugin.js";
import { getLanguageModule } from "./language";

export = createLanguageServicePlugin((ts: typeof import("typescript")) => {
  return [getLanguageModule(ts)];
});
