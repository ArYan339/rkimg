
import { GoogleGenAI } from '@google/genai';

export const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve({ base64, mimeType: file.type });
        };
        reader.onerror = (error) => reject(error);
    });
};

export const createThumbnail = (base64Image: string, maxSize: number = 128): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64Image;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > height) {
                if (width > maxSize) {
                    height = Math.round(height * (maxSize / width));
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width = Math.round(width * (maxSize / height));
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (error) => reject(error);
    });
};

let ai: GoogleGenAI;

/**
 * Returns a singleton instance of the GoogleGenAI client.
 * It will initialize the client on the first call.
 * @throws {Error} If the API key is not provided in the environment.
 */
export const getAiClient = (): GoogleGenAI => {
    const apiKey = process.env.API_KEY;

    if (!ai) {
        if (!apiKey) {
            // Throw a specific error that can be caught by the UI to provide clear instructions.
            throw new Error('API_KEY environment variable not found.');
        }
        ai = new GoogleGenAI({ apiKey });
    }
    return ai;
};