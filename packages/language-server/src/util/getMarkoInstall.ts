import { getPackageInfo } from "./importPackage";

export function getMarkoInstall(
  basePaths: string[],
  options?: {
    nearestPackageJson: string | undefined;
  }
) {
  if (options?.nearestPackageJson) {
    basePaths.push(options.nearestPackageJson);

    let deps: Set<string> = new Set();
    try {
      const packageJSON = require(options.nearestPackageJson);
      [
        ...Object.keys(packageJSON.dependencies ?? {}),
        ...Object.keys(packageJSON.devDependencies ?? {}),
        ...Object.keys(packageJSON.peerDependencies ?? {}),
      ].forEach((dep) => deps.add(dep));
    } catch {}

    if (!deps.has("marko")) {
      return undefined;
    }
  }

  try {
    return getPackageInfo("marko", basePaths);
  } catch (e) {
    return undefined;
  }
}
