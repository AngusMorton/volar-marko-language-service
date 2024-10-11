import type { CompletionItem } from "@volar/language-server";
import getTagNameCompletion from "./getTagNameCompletion";
import type { MarkoVirtualCode } from "../../../core";
import { type Node, NodeType } from "marko-language-tools";

export function getOpenTagNameCompletions(
  node: Node.OpenTagName | Node.AnyNode,
  file: MarkoVirtualCode
): CompletionItem[] {
  if (node.type === NodeType.OpenTagName) {
    const tag = node.parent;
    const range = file.markoAst.locationAt(tag);
    const isAttrTag = tag.type === NodeType.AttrTag;
    const result: CompletionItem[] = [];

    if (isAttrTag) {
      let parentTag = tag.owner;
      while (parentTag?.type === NodeType.AttrTag) parentTag = parentTag.owner;
      const parentTagDef =
        parentTag &&
        parentTag.nameText &&
        file.tagLookup.getTag(parentTag.nameText);

      if (parentTagDef) {
        const { nestedTags } = parentTagDef;
        for (const key in nestedTags) {
          if (key !== "*") {
            const tag = nestedTags[key];
            result.push(
              getTagNameCompletion({
                tag,
                range,
                importer: file.id,
                showAutoComplete: true,
              })
            );
          }
        }
      }
    } else {
      const skipStatements = !(
        tag.concise && tag.parent.type === NodeType.Program
      );
      for (const tag of file.tagLookup.getTagsSorted()) {
        if (
          !(
            tag.name === "*" ||
            tag.isNestedTag ||
            (skipStatements && tag.parseOptions?.statement) ||
            (tag.name[0] === "_" &&
              /^@?marko[/-]|[\\/]node_modules[\\/]/.test(tag.filePath))
          )
        ) {
          const completion = getTagNameCompletion({
            tag,
            range,
            importer: file.id,
            showAutoComplete: true,
          });
          result.push(completion);
        }
      }
    }

    return result;
  } else {
    const range = file.markoAst.locationAt(node);
    const result: CompletionItem[] = [];

    for (const tag of file.tagLookup.getTagsSorted()) {
      if (
        !(
          tag.name === "*" ||
          tag.isNestedTag ||
          (tag.name[0] === "_" &&
            /^@?marko[/-]|[\\/]node_modules[\\/]/.test(tag.filePath))
        )
      ) {
        const completion = getTagNameCompletion({
          tag,
          range,
          importer: file.id,
          showAutoComplete: true,
        });
        result.push(completion);
      }
    }
    return result;
  }
}
