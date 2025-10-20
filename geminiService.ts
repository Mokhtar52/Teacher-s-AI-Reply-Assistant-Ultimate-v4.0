import { GoogleGenAI, Type } from "@google/genai";
import { MessageType, ReplyTone, Sentiment, IntegrationPlatform, Student } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export interface AnalyzedContext {
  messageType: MessageType;
  sentiment: Sentiment;
  detectedLanguage: 'en' | 'ar' | 'unknown';
}

export interface BilingualReplySentence {
    englishSentence: string;
    arabicSentence: string;
}

export interface GeneratedReply {
    sentences: BilingualReplySentence[];
    toneDescription: string;
}

const contextAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        messageType: { type: Type.STRING, enum: Object.values(MessageType) },
        sentiment: { type: Type.STRING, enum: Object.values(Sentiment) },
        detectedLanguage: { type: Type.STRING, enum: ['en', 'ar', 'unknown'] },
    },
    required: ['messageType', 'sentiment', 'detectedLanguage'],
};

const replyGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        sentences: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    englishSentence: { type: Type.STRING, description: "A single sentence of the reply in English." },
                    arabicSentence: { type: Type.STRING, description: "The direct, equivalent translation of that single sentence in Arabic." },
                },
                required: ['englishSentence', 'arabicSentence']
            }
        },
        toneDescription: {
            type: Type.STRING,
            description: 'A short, friendly description of the reply\'s tone, starting with an emoji. E.g., "⭐ Warm & Encouraging".'
        }
    },
    required: ['sentences', 'toneDescription']
};

export const analyzeContext = async (studentMessage: string): Promise<AnalyzedContext> => {
    const prompt = `
        Analyze the following student message sent to an Arabic & Qur'an teacher.
        Determine the message type, sentiment, and the primary language of the message.
        
        Student's Message: "${studentMessage}"

        Provide your analysis as a JSON object matching the required schema.
    `;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: contextAnalysisSchema,
            },
        });
        const parsed = JSON.parse(response.text.trim());
        return parsed;
    } catch (error) {
        console.error("Error analyzing context:", error);
        // Fallback for safety
        return {
            messageType: MessageType.GENERAL,
            sentiment: Sentiment.NEUTRAL,
            detectedLanguage: 'unknown',
        };
    }
};


export const generateBilingualReply = async (
  studentMessage: string,
  context: AnalyzedContext,
  tone: ReplyTone,
  platform: IntegrationPlatform,
  teacherName: string,
  student?: Student | null
): Promise<GeneratedReply> => {
  try {
    const prompt = `
      You are an AI assistant for a Qur'an and Arabic teacher named ${teacherName}.
      The teacher is replying to a student message on the ${platform} platform.
      
      **Context:**
      - Student's Name: ${student?.name || 'student'}
      - Message received: "${studentMessage}"
      - Detected Message Type: "${context.messageType}"
      - Detected Student Sentiment: "${context.sentiment}"
      
      **Reply Requirements:**
      1.  **Tone:** Your reply MUST strictly adhere to the "${tone}" tone.
          - If sentiment is Apologetic or Negative, be extra reassuring.
          - If sentiment is Enthusiastic, match the energy.
      2.  **Bilingual:** Generate a reply in both simple English (for non-native speakers) and natural, polite Arabic.
      3.  **Structure:** Break the entire reply down into individual, corresponding sentences. Each English sentence must have a matching Arabic sentence.
      4.  **Format:** Keep it short and conversational, suitable for ${platform}.
      5.  **Signature:** Include the teacher's name, ${teacherName}, in a natural way if appropriate.
      6.  **Output:** Provide a JSON object that strictly follows the defined schema, containing the array of sentence pairs and a tone description.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: replyGenerationSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedResponse = JSON.parse(jsonText);
    
    if (!parsedResponse.sentences || parsedResponse.sentences.length === 0) {
        throw new Error("AI returned an empty reply.");
    }

    return {
        sentences: parsedResponse.sentences,
        toneDescription: parsedResponse.toneDescription || "⭐ Balanced",
    }

  } catch (error) {
    console.error("Error generating bilingual reply:", error);
    throw new Error("Failed to generate a reply. The model may be unable to process this request. Please try again or rephrase.");
  }
};