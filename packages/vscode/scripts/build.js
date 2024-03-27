console.log("Building VSCode Plugin...");

const isDev = process.argv.includes("--watch");
require("esbuild")
  .context({
    entryPoints: {
      "./dist/server":
        "./node_modules/marko-language-server/bin/marko-language-server.js",
      "./dist/client": "src/client.ts",
      "./dist/marko-ts-plugin": "./node_modules/marko-ts-plugin/dist/",
    },
    sourcemap: true,
    bundle: true,
    metafile: process.argv.includes("--metafile"),
    outdir: ".",
    external: ["vscode"],
    format: "cjs",
    platform: "node",
    tsconfig: "./tsconfig.json",
    define: { "process.env.NODE_ENV": '"production"' },
    minify: process.argv.includes("--minify"),
    plugins: [
      require("esbuild-plugin-copy").copy({
        resolveFrom: "cwd",
        assets: {
          from: ["../language-server/types/**/*.d.ts"],
          to: ["./dist/types"],
          watch: isDev,
        },
      }),
      {
        name: "umd2esm",
        setup(build) {
          build.onResolve(
            { filter: /^(vscode-.*-languageservice|jsonc-parser)/ },
            (args) => {
              const pathUmdMay = require.resolve(args.path, {
                paths: [args.resolveDir],
              });
              // Call twice the replace is to solve the problem of the path in Windows
              const pathEsm = pathUmdMay
                .replace("/umd/", "/esm/")
                .replace("\\umd\\", "\\esm\\");
              return { path: pathEsm };
            }
          );
        },
      },
    ],
  })
  .then(async (ctx) => {
    console.log("building...");
    if (isDev) {
      await ctx.watch();
      console.log("watching...");
    } else {
      await ctx.rebuild();
      await ctx.dispose();
      console.log("finished.");
    }
  });
