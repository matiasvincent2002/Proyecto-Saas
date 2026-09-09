import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class JsonFileRepository {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async readAll() {
    await this.ensureFile();
    const content = await readFile(this.filePath, 'utf8');
    return JSON.parse(content);
  }

  async writeAll(records) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  }

  async ensureFile() {
    try {
      await readFile(this.filePath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      await this.writeAll([]);
    }
  }
}
