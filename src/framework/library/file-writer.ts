import { existsSync, mkdirSync, promises, constants, accessSync } from "fs";
import * as prettier from "prettier";
// Todo: Add Prettier config https://prettier.io/docs/en/api.html
import { format } from "groqfmt-nodejs";
import path from "path";
import { Logger } from "./logger";

export class FileWriter {
  header: string;
  logger: Logger;

  constructor(header?: string) {
    const defaultHeader = [
      "/* DO NOT CHANGE",
      ` * Autogenerated with Sanity Composer via package script "${process.env.npm_lifecycle_event}"`,
      " */",
      "",
    ];

    this.header = header ?? defaultHeader.join("\n");
    this.logger = new Logger();
  }

  checkFileExists(filePath: string) {
    try {
      accessSync(filePath, constants.F_OK);
      return true;
    } catch (err) {
      return false;
    }
  }

  ensureDirectoriesExist(filePath: string) {
    const dirname = path.dirname(filePath);
    if (existsSync(dirname)) {
      return true;
    }

    this.ensureDirectoriesExist(dirname);
    mkdirSync(dirname);
  }

  async prettifyTypeScript(code: string) {
    return await prettier.format(code, { parser: "babel-ts" });
  }

  async prettifyGroq(code: string) {
    try {
      return await format(String(code).trim());
    } catch (e: any) {
      const regexMsg = /parsing query:(.*)/s;
      const matchMsg = e.message.match(regexMsg);
      const errMessage = matchMsg ? matchMsg[1] : null;

      const regex = /echo "(.*?)(?=\s*\|\s*tee)/s;
      const match = e.message.match(regex);
      const capturedText = match ? match[1] : null;

      this.logger.error("Groq Syntax Error", errMessage, capturedText);
      return "";
    }
  }

  async writeTypeScript(filePath: string, code: string) {
    this.ensureDirectoriesExist(filePath);
    const content = [this.header, code].join("\n");
    await promises.writeFile(filePath, content);
  }
}
