import { contextMgr as cm, stdIO, valueMgr as vm } from "./deps.ts";
import { TextWriter, Writer } from "./io.ts";
import { TextArtifactNature } from "./nature.ts";

export interface Artifact {
  readonly isArtifact: true;
}

export interface TextArtifact extends Artifact {
  readonly isTextArtifact: true;
  readonly nature: TextArtifactNature;
  text(ctx: cm.Context): string;
  textFragment(ctx: cm.Context): string;
}

export function isTextArtifact(o: any): o is TextArtifact {
  return "isTextArtifact" in o;
}

export interface MutableTextArtifact extends TextArtifact {
  readonly isMutableTextArtifact: true;
  readonly options: MutableTextArtifactOptions;
  appendText(ctx: cm.Context, content: string | TextWriter): void;
}

export function isMutableTextArtifact(o: any): o is MutableTextArtifact {
  return "isMutableTextArtifact" in o;
}

export interface MutableTextArtifactOptions {
  readonly nature: TextArtifactNature;
  readonly preamble?: vm.TextValue;
}

export class DefaultTextArtifact implements MutableTextArtifact {
  readonly isArtifact = true;
  readonly isTextArtifact = true;
  readonly nature: TextArtifactNature;
  readonly isMutableTextArtifact = true;

  protected readonly writer: Writer = new stdIO.StringWriter();

  constructor(readonly options: MutableTextArtifactOptions) {
    this.nature = options.nature;
  }

  appendText(ctx: cm.Context, content: string | TextWriter): void {
    const te = new TextEncoder();
    switch (typeof content) {
      case "string":
        this.writer.write(te.encode(content));
        break;

      case "function":
        content(ctx, this.writer, te);
    }
  }

  text(ctx: cm.Context): string {
    const sw = this.writer as stdIO.StringWriter;
    const preamble = this.options.preamble
      ? vm.resolveTextValue(ctx, this.options.preamble)
      : this.nature.defaultPreamble
      ? vm.resolveTextValue(ctx, this.nature.defaultPreamble)
      : undefined;
    const text = this.writer.toString();
    return preamble ? preamble + this.writer.toString() : text;
  }

  textFragment(ctx: cm.Context): string {
    return this.writer.toString();
  }
}
