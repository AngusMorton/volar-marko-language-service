import path from "path";

export function getLanguageServerTypesDir(ts: typeof import("typescript")) {
  return ts.sys.resolvePath(path.resolve(__dirname, "../../types"));
}
