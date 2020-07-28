/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as fs from 'fs';
import * as path from 'path';
import {Utility} from './utility';
const Zip: any = require('node-7z-forall');
const fetch: any = require('node-fetch');

export class OrchestratorNlr {
  public static async getAsync(nlrPath: string, versionId: string, onFinish: any = null) {
    try {
      if (nlrPath) {
        nlrPath = path.resolve(nlrPath);
      }

      if (nlrPath.length === 0) {
        throw new Error('Please provide path to Orchestrator model');
      }

      Utility.debuggingLog(`Version id: ${versionId}`);
      Utility.debuggingLog(`Nlr path: ${nlrPath}`);

      const versions: any = await OrchestratorNlr.getNlrVersionsAsync();
      if (!versions) {
        throw new Error('Failed getting nlr_versions.json');
      }

      const modelInfo: any = versions.models[versionId];
      if (!modelInfo) {
        throw new Error(`Model info for version ${versionId} not found`);
      }

      const url: string = modelInfo.onnxModelUri;
      const fileName: string = url.substring(url.lastIndexOf('/') + 1);
      const modelFolder: string = path.join(nlrPath, path.basename(fileName, '.7z'));
      const res: any = await fetch(url);
      const modelZipPath: string = path.join(nlrPath, fileName);
      const fileStream: any = fs.createWriteStream(modelZipPath);
      res.body.pipe(fileStream);
      res.body.on('error', () => {
        throw new Error(`Failed downloading model version ${versionId}`);
      });
      fileStream.on('finish', () => {
        Utility.debuggingLog(`Finished downloading model version ${versionId}`);
        const seven: any = new Zip();
        seven.extractFull(modelZipPath, nlrPath).then(() => {
          Utility.debuggingLog(`Finished extracting model version ${versionId}`);
          OrchestratorNlr.moveFiles(modelFolder, nlrPath);
          Utility.debuggingLog(`Finished moving files from ${modelFolder} to ${nlrPath}`);
          fs.rmdirSync(modelFolder);
          Utility.debuggingLog(`Deleted folder: ${modelFolder}`);
          onFinish();
        });
      });
    } catch (error) {
      throw new Error(error);
    }
  }

  public static async getNlrVersionsAsync(): Promise<string> {
    const response: any = await fetch('https://aka.ms/nlrversions');
    return response.json();
  }

  public static async listAsync(): Promise<string> {
    const json: any = await OrchestratorNlr.getNlrVersionsAsync();
    return JSON.stringify(json, null, 2);
  }

  private static moveFiles(sourceDir: string, targetDir: string) {
    const items: string[] = fs.readdirSync(sourceDir);
    for (const item of items) {
      const currentItemPath: string = path.join(sourceDir, item);
      Utility.moveFile(currentItemPath, targetDir);
    }
  }
}