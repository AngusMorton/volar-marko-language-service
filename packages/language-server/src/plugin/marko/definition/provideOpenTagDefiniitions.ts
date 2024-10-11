import type { LocationLink } from "@volar/language-service";
import type { MarkoVirtualCode } from "../../../core";
import path from "path";
import { readFileSync } from "fs";
import { URI } from "vscode-uri";
import {
  Location,
  Node,
  NodeType,
  Position,
  getLines,
  getLocation,
  type TagDefinition,
} from "marko-language-tools";

export function provideOpenTagDefinitions(
  node: Node.OpenTagName,
  file: MarkoVirtualCode
): LocationLink[] {
  const tag = node.parent;
  let tagDef: TagDefinition | null | undefined;
  let range = START_LOCATION;

  if (tag.type === NodeType.AttrTag) {
    let parentTag = tag.owner;
    while (parentTag?.type === NodeType.AttrTag) parentTag = parentTag.owner;
    tagDef =
      parentTag && parentTag.nameText
        ? file.tagLookup.getTag(parentTag.nameText)
        : undefined;
  } else {
    tagDef = tag.nameText ? file.tagLookup.getTag(tag.nameText) : undefined;
  }

  if (!tagDef) {
    return [];
  }

  const tagEntryFile = tagDef.template || tagDef.renderer || tagDef.filePath;

  if (!path.isAbsolute(tagEntryFile)) {
    return [];
  }

  if (/\/marko(?:-tag)?\.json$/.test(tagEntryFile)) {
    const tagDefSource = readFileSync(tagEntryFile, "utf-8");
    const match =
      RegExpBuilder`/"(?:<${tag.nameText}>|${tag.nameText})"\s*:\s*[^\r\n,]+/g`.exec(
        tagDefSource
      );

    if (match && match.index) {
      range = getLocation(
        getLines(tagDefSource),
        match.index,
        match.index + match[0].length
      );
    }
  }

  return [
    {
      targetUri: URI.file(tagEntryFile).toString(),
      targetRange: range,
      targetSelectionRange: range,
      originSelectionRange: file.markoAst.locationAt(node),
    },
  ];
}

const START_POSITION: Position = {
  line: 0,
  character: 0,
};

const START_LOCATION: Location = {
  start: START_POSITION,
  end: START_POSITION,
};

function RegExpBuilder(
  strings: TemplateStringsArray,
  ...expressions: [unknown, ...unknown[]]
) {
  let i = 0;
  let src = strings[0].slice(strings[0].indexOf("/") + 1);
  const secondLastExprIndex = strings.length - 2;

  for (; i < secondLastExprIndex; i++) {
    src += escape(expressions[i]) + strings[i + 1];
  }

  src += escape(expressions[i]);

  const lastStr = strings[i + 1];
  const lastSlashIndex = lastStr.lastIndexOf("/");
  let flags = "";

  if (lastSlashIndex === -1) {
    src += lastStr;
  } else {
    flags = lastStr.slice(lastSlashIndex + 1);
    src += lastStr.slice(0, lastSlashIndex);
  }

  return new RegExp(src, flags);
}

function escape(val: unknown) {
  return String(val).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}
