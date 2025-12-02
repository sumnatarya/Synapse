import { GoogleGenAI, Type, Schema } from "@google/genai";
import { StudyResponse, SyllabusStructure, SyllabusInput } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for Phase 1: Identifying Subjects and their Topics
const structureSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    subjects: {
      type: Type.ARRAY,
      items: { 
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Name of the subject (e.g., Physics, Calculus)" },
            topics: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of major units, chapters, or modules listed under this subject."
            }
        },
        required: ["name", "topics"]
      },
      description: "List of distinct subjects and their breakdown found in the syllabus."
    }
  },
  required: ["subjects"]
};

// Schema for Phase 2: Generating Content
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    courseTitle: { type: Type.STRING, description: "A catchy and descriptive title for the specific study plan." },
    overview: { type: Type.STRING, description: "A detailed executive summary of this specific topic/subject, outlining learning objectives." },
    recommendedBooks: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "List of specific high-quality textbooks, research papers, or resources for this topic." 
    },
    topics: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Sub-topic title" },
          content: { 
            type: Type.STRING, 
            description: "Extensive, in-depth study material. Use Markdown strictly: '###' for subsection headers, '**bold**' for definitions/keywords, '> ' for callouts/important notes/formulas, '-' for bullet points. Explain concepts clearly with examples." 
          },
          keyConcepts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Core definitions or formulas." },
          estimatedTime: { type: Type.STRING, description: "Realistic time to master this section (e.g., '1.5 hours')" }
        },
        required: ["title", "content", "keyConcepts", "estimatedTime"]
      }
    },
    mindMap: {
        type: Type.OBJECT,
        description: "A deep hierarchical tree structure. Root is the Main Subject. Ensure it goes 3-4 levels deep to show relationships between sub-concepts.",
        properties: {
            name: { type: Type.STRING },
            children: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        children: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    children: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                name: { type: Type.STRING }
                                            },
                                            required: ["name"]
                                        }
                                    }
                                },
                                required: ["name"]
                            }
                        }
                    },
                    required: ["name"]
                }
            }
        },
        required: ["name", "children"]
    }
  },
  required: ["courseTitle", "overview", "recommendedBooks", "topics", "mindMap"]
};

export async function analyzeSyllabusStructure(input: SyllabusInput): Promise<SyllabusStructure> {
  const model = "gemini-2.5-flash";
  const prompt = "Analyze the provided syllabus content and extract the list of subjects and their major topics/units. Return the data strictly as JSON.";

  let contents: any = [];
  
  if (input.text) {
    contents = [{ role: 'user', parts: [{ text: input.text }, { text: prompt }] }];
  } else if (input.fileData) {
     contents = [{ role: 'user', parts: [
       { inlineData: { mimeType: input.fileData.mimeType, data: input.fileData.data } },
       { text: prompt }
     ] }];
  }

  const result = await ai.models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: structureSchema,
      temperature: 0.2 // Low temperature for consistent JSON structure
    }
  });

  if (!result.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(result.text) as SyllabusStructure;
}

export async function generateStudyMaterial(
  programName: string, 
  input: SyllabusInput, 
  subject: string, 
  topic?: string
): Promise<StudyResponse> {
  const model = "gemini-2.5-flash";
  const focus = topic 
    ? `Focus EXCLUSIVELY and DEEPLY on the topic: "${topic}" within the subject "${subject}". Break it down into granular sub-concepts.` 
    : `Create a comprehensive and rigorous guide for the subject: "${subject}". Cover the most important concepts in high depth.`;
  
  const prompt = `
    You are an expert professor and tutor helping a student prepare for "${programName}" at a high academic level.
    Your goal is to provide **comprehensive, in-depth, and detailed** study material.
    
    Using the provided syllabus content as a reference for scope, generate a detailed study guide.
    
    ${focus}
    
    CRITICAL INSTRUCTIONS FOR FORMATTING AND DEPTH:
    1. **Go Deep**: Do not just summarize. Explain the "Why" and "How". Provide theoretical depth.
    2. **Structure**: Use Markdown headers (###) to separate sections within the content field.
    3. **Formatting**: 
       - Use **bold** for vocabulary and key terms.
       - Use > blockquotes for key definitions, formulas, or "Important Note" callouts.
       - Use bullet points (-) for lists and steps.
       - Use \`code\` style for variable names or short equations.
    4. **Mini-Textbook**: Treat each topic content as a comprehensive chapter.
    
    The output must be a valid JSON object matching the specified schema.
    Include:
    1. A descriptive course title.
    2. A detailed overview.
    3. Specific Recommended books/resources.
    4. A list of study topics with **extensive** formatted content.
    5. A deep mind map structure.
  `;

  let contents: any = [];
  if (input.text) {
    contents = [{ role: 'user', parts: [{ text: input.text }, { text: prompt }] }];
  } else if (input.fileData) {
     contents = [{ role: 'user', parts: [
       { inlineData: { mimeType: input.fileData.mimeType, data: input.fileData.data } },
       { text: prompt }
     ] }];
  }

  const result = await ai.models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.3 // Slightly higher for creative but structured content
    }
  });

  if (!result.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(result.text) as StudyResponse;
}