import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const samplePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const analysisSchema = z.object({
  matchedItems: z.array(
    z.object({
      catalogItemId: z.string().uuid(),
      quantity: z.number().int().positive(),
      confidence: z.number().min(0).max(1),
    })
  ),
  unknownItems: z.array(
    z.object({
      description: z.string(),
      estimatedQuantity: z.number().int().positive(),
    })
  ),
});

async function testFullAnalyze() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: {
      apiVersion: "v1beta",
      timeout: 30000,
    },
  });

  const prompt = `
You are a visual product identification system for a bakery.

Identify products and quantities visible in the supplied photograph.

SELLER CATALOGUE:
ID: 80e35328-912a-466e-9be7-ecdbba123456
Name: Chocolate Croissant
Description: Freshly baked chocolate croissant

RULES:
1. Match ONLY products from this catalogue.
2. Never invent or modify catalogue IDs.
3. Put uncertain or unmatched products in unknownItems.
4. Count distinguishable visible products.
5. Never invent products that are not visible.
6. Never return prices.
7. Confidence must be between 0 and 1.
8. Be conservative when products are blurry or occluded.

Return JSON with exactly this structure:
{
  "matchedItems": [
    {
      "catalogItemId": "catalogue UUID",
      "quantity": 2,
      "confidence": 0.92
    }
  ],
  "unknownItems": [
    {
      "description": "Unidentified product",
      "estimatedQuantity": 1
    }
  ]
}

Return empty arrays if no products are identifiable.
`;

  const start = Date.now();
  console.log("Sending request to gemini-3.5-flash with structured JSON response...");
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/png",
              data: samplePngBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 2048,
    },
  });

  console.log(`Received response in ${Date.now() - start}ms:`);
  console.log(response.text);

  const parsed = JSON.parse(response.text!);
  const validated = analysisSchema.safeParse(parsed);
  console.log("Validation success:", validated.success);
}

testFullAnalyze();

