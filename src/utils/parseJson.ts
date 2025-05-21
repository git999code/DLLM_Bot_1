import * as fs from 'fs';
import * as path from 'path';

export function parseJson(filePath: string): any {
    try {
        const fullPath = path.resolve(__dirname, '..', '..', filePath);
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error parsing ${filePath}:`, error);
        throw error;
    }
}
