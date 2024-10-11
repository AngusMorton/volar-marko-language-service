import type {
  Disposable,
  LanguageServicePlugin,
  LanguageServicePluginInstance,
} from "@volar/language-server";
import { create as createHtmlService } from "volar-service-html";
import { URI } from "vscode-uri";
import { MarkoVirtualCode } from "../../core";
import type {
  IAttributeData,
  IHTMLDataProvider,
  ITagData,
} from "vscode-html-languageservice";
import { enhancedProvideCompletionItems } from "./completions";

export const create = (): LanguageServicePlugin => {
  let customData: IHTMLDataProvider[] = [];
  const onDidChangeCustomDataListeners = new Set<() => void>();
  const onDidChangeCustomData = (listener: () => void): Disposable => {
    onDidChangeCustomDataListeners.add(listener);
    return {
      dispose() {
        onDidChangeCustomDataListeners.delete(listener);
      },
    };
  };

  const htmlPlugin = createHtmlService({
    getCustomData: (context) => {
      return [...customData];
    },
    onDidChangeCustomData,
  });
  return {
    name: "marko-template",
    capabilities: {
      ...htmlPlugin.capabilities,
    },
    create(context): LanguageServicePluginInstance {
      const htmlPluginInstance = htmlPlugin.create(context);

      return {
        ...htmlPluginInstance,

        async provideCompletionItems(
          document,
          position,
          completionContext,
          token
        ) {
          if (document.languageId !== "html") return;

          const decoded = context.decodeEmbeddedDocumentUri(
            URI.parse(document.uri)
          );
          const sourceScript =
            decoded && context.language.scripts.get(decoded[0]);
          const root = sourceScript?.generated?.root;
          if (!(root instanceof MarkoVirtualCode)) return;

          // Update the HTML data.
          provideHtmlData(root);
          let htmlComplete = await htmlPluginInstance.provideCompletionItems?.(
            document,
            position,
            completionContext,
            token
          );

          if (!htmlComplete) {
            return;
          }

          return enhancedProvideCompletionItems(htmlComplete);
        },

        provideHover(document, position, token) {
          if (document.languageId !== "html") return;

          if (context.decodeEmbeddedDocumentUri(URI.parse(document.uri))) {
            updateExtraCustomData([]);
          }

          return htmlPluginInstance.provideHover?.(document, position, token);
        },
      };
    },
  };

  function provideHtmlData(markoCode: MarkoVirtualCode) {
    const taglib = markoCode.tagLookup;

    console.log("Creating HTML data for", markoCode.fileName);
    const htmlProvider: IHTMLDataProvider = {
      getId() {
        return "marko-template";
      },
      isApplicable(languageId) {
        return true;
      },
      provideValues(tag, attribute) {
        return [];
      },
      provideTags() {
        const tags: ITagData[] = [];
        for (const tag of taglib.getTagsSorted()) {
          if (
            // tag.taglibId !== "marko-html" &&
            // tag.taglibId !== "marko-svg" &&
            // tag.taglibId !== "marko-math" &&
            tag.name !== "*" &&
            !tag.name.startsWith("_") &&
            tag.parseOptions?.statement !== true &&
            tag.htmlType === "html"
          ) {
            continue;
          }

          tags.push({
            name: tag.name,
            description: tag.description,
            references: [{ name: tag.name, url: tag.filePath }],
            attributes: [],
          });
        }
        return tags;
      },
      provideAttributes(tag) {
        console.log("provideAttributes", tag);
        const attributes: IAttributeData[] = [];

        // const tagDef = taglib.getTag(tag);
        // if (!tagDef) return [];

        // for (const attrName in tagDef.attributes) {
        //   if (attrName === "*") {
        //     continue;
        //   }

        //   const attributeProperties = tagDef.attributes[attrName];

        //   attributes.push({
        //     name: attrName,
        //     description: attributeProperties.description,
        //   });
        //   attributes.push({
        //     name: attrName + ":no-update",
        //     description: attributeProperties.description,
        //   });
        //   attributes.push({
        //     name: attrName + ":scoped",
        //     description: attributeProperties.description,
        //   });
        // }

        // attributes.push({
        //   name: "no-update",
        // });
        // attributes.push({
        //   name: "no-update-body",
        // });
        // attributes.push({
        //   name: "no-update-body-if",
        // });
        return attributes;
      },
    };

    updateExtraCustomData([htmlProvider]);
  }

  function updateExtraCustomData(extraData: IHTMLDataProvider[]) {
    customData = extraData;
    onDidChangeCustomDataListeners.forEach((l) => l());
  }
};
