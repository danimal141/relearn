import { GoogleGenerativeAI } from "@google/generative-ai";

interface GeminiClientConfig {
  apiKey: string;
  modelName?: string;
}

interface GeminiError {
  code: "INITIALIZATION_ERROR" | "API_KEY_MISSING";
  message: string;
}

export const createGeminiClient = (
  config: GeminiClientConfig
): { success: true; data: GoogleGenerativeAI } | { success: false; error: GeminiError } => {
  if (!config.apiKey) {
    return {
      success: false,
      error: {
        code: "API_KEY_MISSING",
        message: "Gemini API key is required",
      },
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    return {
      success: true,
      data: genAI,
    };
  } catch (_error) {
    return {
      success: false,
      error: {
        code: "INITIALIZATION_ERROR",
        message: "Failed to initialize Gemini client",
      },
    };
  }
};
