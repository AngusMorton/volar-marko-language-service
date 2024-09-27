import { TextEdit, type CompletionItem } from "@volar/language-server";
import type { Node } from "@marko/language-tools";
import getTagNameCompletion from "./getTagNameCompletion";
import type { MarkoVirtualCode } from "../../../core";

const importTagReg = /(['"])<((?:[^\1\\>]+|\\.)*)>?\1/;

export function getImportCompletion(
  node: Node.Import,
  file: MarkoVirtualCode
): CompletionItem[] {
  // check for import statement
  const value = file.markoAst.read(node);
  const match = importTagReg.exec(value);
  if (match) {
    const [{ length }] = match;
    const fromStart = node.start + match.index;
    const range = file.markoAst.locationAt({
      start: fromStart + 1,
      end: fromStart + length - 1,
    });

    const result: CompletionItem[] = [];

    for (const tag of file.tagLookup.getTagsSorted()) {
      if (
        (tag.template || tag.renderer) &&
        !(
          tag.html ||
          tag.parser ||
          tag.translator ||
          tag.isNestedTag ||
          tag.name === "*" ||
          tag.parseOptions?.statement ||
          /^@?marko[/-]/.test(tag.taglibId) ||
          (tag.name[0] === "_" && /[\\/]node_modules[\\/]/.test(tag.filePath))
        )
      ) {
        const completion = getTagNameCompletion({
          tag,
          importer: file.fileName,
        });

        completion.label = `<${completion.label}>`;
        completion.textEdit = TextEdit.replace(range, completion.label);
        result.push(completion);
      }
    }

    return result;
  }

  return [];
}
