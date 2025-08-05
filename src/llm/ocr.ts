import type { GoogleGenerativeAI } from "@google/generative-ai";
import type { OcrRequest, OcrResult } from "./types";

interface OcrConfig {
  model?: string;
  maxRetries?: number;
  timeout?: number;
}

const DEFAULT_CONFIG: Required<OcrConfig> = {
  model: "gemini-1.5-flash",
  maxRetries: 3,
  timeout: 30000,
};

export const extractTextFromImage = async (
  client: GoogleGenerativeAI,
  request: OcrRequest,
  config?: OcrConfig
): Promise<OcrResult> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const model = client.getGenerativeModel({ model: finalConfig.model });

    const imagePart = {
      inlineData: {
        data: request.imageData.toString("base64"),
        mimeType: request.mimeType,
      },
    };

    const prompt = `Extract all text from this image. Please provide the complete text content exactly as it appears in the image, preserving the original formatting and structure. If the image contains multiple sections or posts, clearly separate them. If no text is found, respond with "NO_TEXT_FOUND".`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    if (!text || text === "NO_TEXT_FOUND") {
      return {
        success: false,
        error: {
          code: "INVALID_IMAGE",
          message: "No text found in the image",
        },
      };
    }

    return {
      success: true,
      data: {
        text: text.trim(),
        extractedAt: new Date(),
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("quota") || error.message.includes("rate")) {
        return {
          success: false,
          error: {
            code: "RATE_LIMIT",
            message: "API rate limit exceeded",
            details: error.message,
          },
        };
      }

      if (error.message.includes("timeout")) {
        return {
          success: false,
          error: {
            code: "TIMEOUT",
            message: "Request timed out",
            details: error.message,
          },
        };
      }
    }

    return {
      success: false,
      error: {
        code: "API_ERROR",
        message: "Failed to extract text from image",
        details: error,
      },
    };
  }
};
