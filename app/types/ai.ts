/**
 * Types for the AI insights feature powered by Amazon Bedrock (Claude 3 Haiku).
 */

export interface AIInsight {
  summary: string | null;      // one-sentence weather overview
  activities: string[];        // 3 activity suggestions for current conditions
  clothing: string[];          // 3 clothing/gear suggestions
}
