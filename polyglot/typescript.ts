import { MutableTextArtifact } from "../artifact.ts";
import { contextMgr as cm, inflect, valueMgr as vm } from "../deps.ts";
import { PersistenceHandler } from "../io.ts";
import { TextArtifactNature } from "../nature.ts";
import * as code from "../code.ts";

export const typeScriptArtifact = new (class implements TextArtifactNature {
  readonly isTextArtifactNature = true;
  readonly name = "TypeScript";
  readonly defaultFileExtn: string = ".ts";
  readonly fileExtensions: string[] = [this.defaultFileExtn];
  readonly defaultPreamble: vm.TextValue =
    "// Code generated by Netspective IGS. DO NOT EDIT.\n\n";

  constructor() {}
})();

export class TypeScriptCodeDeclaration implements code.PolyglotCodeDecl {
  readonly modules: TypeScriptModuleDeclaration[] = [];

  constructor(readonly ph: PersistenceHandler) {
  }

  declareModule(module: TypeScriptModuleDeclaration): void {
    this.modules.push(module);
  }

  emit(ctx: cm.Context, eh: code.PolyglotErrorHandler): void {
    for (const module of this.modules) {
      const mta = this.ph.createMutableTextArtifact(ctx, {
        nature: typeScriptArtifact,
      });
      module.emit(ctx, mta, eh);
      this.ph.persistTextArtifact(
        ctx,
        `${inflect.toKebabCase(module.name)}.ts`,
        mta,
      );
    }
  }
}

export class TypeScriptModuleDeclaration implements code.PolyglotModuleDecl {
  readonly interfaces: TypeScriptInterfaceDeclaration[] = [];

  constructor(
    readonly code: TypeScriptCodeDeclaration,
    readonly name: inflect.InflectableValue,
  ) {
  }

  declareInterface(intf: TypeScriptInterfaceDeclaration): void {
    this.interfaces.push(intf);
  }

  emit(
    ctx: cm.Context,
    mta: MutableTextArtifact,
    eh: code.PolyglotErrorHandler,
  ): void {
    for (const intf of this.interfaces) {
      intf.emit(ctx, mta, eh);
    }
  }
}

export class TypeScriptInterfaceDeclaration
  implements code.PolyglotInterfaceDecl {
  readonly properties: code.PolyglotPropertyDecl[] = [];
  readonly content: object[] = [];

  constructor(
    readonly module: TypeScriptModuleDeclaration,
    readonly name: inflect.InflectableValue,
  ) {
  }

  declareProperty(prop: code.PolyglotPropertyDecl): void {
    this.properties.push(prop);
  }

  declareContent(content: object): void {
    this.content.push(content);
  }

  emit(
    ctx: cm.Context,
    mta: MutableTextArtifact,
    eh: code.PolyglotErrorHandler,
  ): void {
    const propDecls: string[] = [];
    for (const property of this.properties) {
      const decl = property.getInterfaceDecl(ctx, eh);
      if (decl) {
        propDecls.push(decl);
      }
    }
    const intfIdentifier = inflect.toPascalCase(this.name);
    mta.appendText(ctx, `export interface ${intfIdentifier} {\n`);
    mta.appendText(ctx, "  " + propDecls.join(",\n  "));
    mta.appendText(ctx, "\n}\n\n");

    const contentConstIdentifier = inflect.toCamelCase(this.name) + "Content";
    mta.appendText(
      ctx,
      `export const ${contentConstIdentifier}: ${intfIdentifier}[] = [\n`,
    );
    for (const content of this.content) {
      const contentDecls: string[] = [];
      for (const property of this.properties) {
        const decl = property.getContentDecl(ctx, content, eh);
        if (decl) {
          contentDecls.push(decl);
        }
      }
      mta.appendText(
        ctx,
        "  {\n    " + contentDecls.join(",\n    ") + "\n  },\n",
      );
    }
    mta.appendText(ctx, "];");
  }
}