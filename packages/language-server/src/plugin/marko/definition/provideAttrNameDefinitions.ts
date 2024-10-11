import type { LocationLink } from "@volar/language-service";
import type { MarkoVirtualCode } from "../../../core";
import { readFileSync } from "fs";
import { URI } from "vscode-uri";
import {
  Location,
  Position,
  getLines,
  getLocation,
  type Node,
} from "marko-language-tools";

export function provideAttrNameDefinitions(
  node: Node.AttrName,
  file: MarkoVirtualCode
): LocationLink[] {
  const tagName = node.parent.parent.nameText;
  const attrName = file.markoAst.read(node);
  const tagDef = tagName ? file.tagLookup.getTag(tagName) : undefined;
  const attrDef = file.tagLookup.getAttribute(tagName || "", attrName);
  let range = START_LOCATION;

  if (!attrDef) {
    return [];
  }

  const attrEntryFile = attrDef.filePath || tagDef?.filePath;
  if (!attrEntryFile) {
    return [];
  }

  if (/\.json$/.test(attrEntryFile)) {
    const tagDefSource = readFileSync(attrEntryFile, "utf-8");
    const match = RegExpBuilder`/"@${attrName}"\s*:\s*[^\r\n,]+/g`.exec(
      tagDefSource
    );

    if (match && match.index) {
      range = getLocation(
        getLines(tagDefSource),
        match.index,
        match.index + match[0].length
      );
    }

    return [
      {
        targetUri: URI.file(attrEntryFile).toString(),
        targetRange: range,
        targetSelectionRange: range,
        originSelectionRange: file.markoAst.locationAt(node),
      },
    ];
  }

  return [];
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
