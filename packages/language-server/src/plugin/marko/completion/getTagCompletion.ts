import {
  CompletionItemKind,
  InsertTextFormat,
  TextEdit,
} from "@volar/language-server";
import type { CompletionItem } from "@volar/language-server";
import { UNFINISHED, type Node } from "marko-language-tools";
import type { MarkoVirtualCode } from "../../../core";

const partialCloseTagReg = /<\/(?:[^><]*>)?/iy;

/**
 * Provide completion for the closing tag.
 */
export function getTagCompletion(
  node: Node.Tag,
  file: MarkoVirtualCode,
  offset: number
): CompletionItem[] {
  const isClosed = node.end !== UNFINISHED;
  if (isClosed || node.concise) return [];

  const closingTagStr = `</${node.nameText || ""}>`;

  if (offset === node.open.end) {
    // We're at the end of the open tag and the closing tag was not found.
    return [
      {
        label: closingTagStr,
        kind: CompletionItemKind.Class,
        insertTextFormat: InsertTextFormat.Snippet,
        insertText: `\n\t$0\n${closingTagStr}`,
      },
    ];
  } else if (node.close && offset >= node.close.start) {
    // We have an unfinished closing tag.
    const start = node.close.start;
    partialCloseTagReg.lastIndex = start;
    const [{ length }] = partialCloseTagReg.exec(
      file.snapshot.getText(0, file.snapshot.getLength())
    )!;
    const end = start + length;

    return [
      {
        label: closingTagStr,
        kind: CompletionItemKind.Class,
        insertTextFormat: InsertTextFormat.Snippet,
        textEdit: TextEdit.replace(
          file.markoAst.locationAt({
            start,
            end,
          }),
          closingTagStr
        ),
      } satisfies CompletionItem,
    ];
  } else {
    return [];
  }
}
