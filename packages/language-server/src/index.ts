import {
  MessageType,
  ShowMessageNotification,
  createConnection,
  createServer,
  createTypeScriptProject,
  loadTsdkByPath,
} from "@volar/language-server/node";
import {
  getLanguagePlugins,
  getLanguageServicePlugins,
} from "./languageServerPlugin.js";
import { getMarkoInstall } from "./util/getMarkoInstall.js";
import { addMarkoTypes } from "./core/index.js";

const connection = createConnection();
const server = createServer(connection);

connection.listen();

connection.onInitialize((params) => {
  const tsdk = params.initializationOptions?.typescript?.tsdk;

  if (!tsdk) {
    throw new Error(
      "The `typescript.tsdk` init option is required. It should point to a directory containing a `typescript.js` or `tsserverlibrary.js` file, such as `node_modules/typescript/lib`."
    );
  }

  const { typescript, diagnosticMessages } = loadTsdkByPath(
    tsdk,
    params.locale
  );

  return server.initialize(
    params,
    createTypeScriptProject(typescript, diagnosticMessages, ({ env }) => {
      return {
        languagePlugins: getLanguagePlugins(typescript),
        setup({ project }) {
          const { languageServiceHost, configFileName } = project.typescript!;

          const rootPath = configFileName
            ? configFileName.split("/").slice(0, -1).join("/")
            : env.workspaceFolders[0]!.fsPath;
          const nearestPackageJson = typescript.findConfigFile(
            rootPath,
            typescript.sys.fileExists,
            "package.json"
          );

          const markoInstall = getMarkoInstall([rootPath], {
            nearestPackageJson: nearestPackageJson,
          });

          if (!markoInstall) {
            connection.sendNotification(ShowMessageNotification.type, {
              message: `Couldn't find Marko in workspace "${rootPath}".`,
              type: MessageType.Warning,
            });
          }

          addMarkoTypes(markoInstall, typescript, languageServiceHost);
        },
      };
    }),
    getLanguageServicePlugins(connection, typescript)
  );
});

connection.onInitialized(() => {
  server.initialized();
  server.fileWatcher.watchFiles([
    `**/*.{${["js", "cjs", "mjs", "ts", "cts", "mts", "json", "marko"].join(
      ","
    )}}`,
  ]);
});
