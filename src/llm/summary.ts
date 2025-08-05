import type { GoogleGenerativeAI } from "@google/generative-ai";
import type { SummaryRequest, SummaryResult } from "./types";

interface SummaryConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_CONFIG: Required<SummaryConfig> = {
  model: "gemini-1.5-flash",
  maxTokens: 500,
  temperature: 0.7,
};

const DEFAULT_PROMPT = `Based on the following text from a social media post, extract one key learning or insight.
The learning should be concise, actionable, and meaningful.
Focus on wisdom, tips, or valuable perspectives that can be applied in daily life or work.
Respond in Japanese with a single, clear learning point.

Text:`;

export const generateSummary = async (
  client: GoogleGenerativeAI,
  request: SummaryRequest,
  config?: SummaryConfig
): Promise<SummaryResult> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    const model = client.getGenerativeModel({
      model: finalConfig.model,
      generationConfig: {
        maxOutputTokens: finalConfig.maxTokens,
        temperature: finalConfig.temperature,
      },
    });

    const prompt =
      request.customPrompt ||
      (request.promptType === "custom" ? request.customPrompt : DEFAULT_PROMPT);

    if (!prompt) {
      return {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Prompt is required for custom prompt type",
        },
      };
    }

    const fullPrompt = `${prompt}\n\n${request.text}`;
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const summary = response.text();

    if (!summary) {
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: "Failed to generate summary",
        },
      };
    }

    return {
      success: true,
      data: {
        summary: summary.trim(),
        generatedAt: new Date(),
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
        message: "Failed to generate summary",
        details: error,
      },
    };
  }
};
