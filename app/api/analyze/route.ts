
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { db, catalogItems } from "../../../src/lib/db";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

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

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: {
        apiVersion: "v1beta",
        timeout: 60000,
    },
});

export async function POST(request: Request) {
    const startedAt = Date.now();

    const logTime = (stage: string) => {
        console.info(`[analyze] ${stage}: ${Date.now() - startedAt}ms`);
    };

    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { success: false, message: "Gemini API key is missing" },
                { status: 500 }
            );
        }

        // 1. Validate uploaded image.
        const formData = await request.formData();
        const image = formData.get("image");

        if (!(image instanceof File)) {
            return NextResponse.json(
                { success: false, message: "Please upload an image" },
                { status: 400 }
            );
        }

        if (!allowedMimeTypes.includes(image.type)) {
            return NextResponse.json(
                { success: false, message: "Unsupported image format" },
                { status: 400 }
            );
        }

        if (image.size === 0 || image.size > MAX_IMAGE_SIZE) {
            return NextResponse.json(
                { success: false, message: "Image must be between 1 byte and 5 MB" },
                { status: 400 }
            );
        }

        logTime("Image received");

        // 2. Fetch catalogue.
        const catalogue = await db
            .select({
                id: catalogItems.id,
                name: catalogItems.name,
                description: catalogItems.description,
            })
            .from(catalogItems)
            .orderBy(asc(catalogItems.name));

        logTime("Catalogue fetched");

        if (catalogue.length === 0) {
            return NextResponse.json(
                { success: false, message: "Product catalogue is empty" },
                { status: 400 }
            );
        }

        // 3. Convert image to Base64.
        const imageBuffer = Buffer.from(await image.arrayBuffer());
        const base64Image = imageBuffer.toString("base64");

        const catalogueText = catalogue
            .map(
                (item) =>
                    `ID: ${item.id}\nName: ${item.name}\nDescription: ${item.description ?? "No description"}`
            )
            .join("\n\n");

        const prompt = `
You are a visual product identification system for a bakery.

Identify products and quantities visible in the supplied photograph.

SELLER CATALOGUE:
${catalogueText}

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

        // 4. Analyze using Gemini GenerateContent API (with fallback if primary model is under high demand).
        logTime("Starting Gemini request");

        const primaryModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";
        const fallbackModel = "gemini-3.6-flash";

        const callGemini = async (modelName: string) => {
            const res = await ai.models.generateContent({
                model: modelName,
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: image.type,
                                    data: base64Image,
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
            return res.text;
        };

        let responseText: string | undefined;

        try {
            responseText = await callGemini(primaryModel);
        } catch (err: any) {
            const isUnavailable =
                err?.status === 503 ||
                err?.code === 503 ||
                String(err?.message || "").includes("503") ||
                String(err?.message || "").includes("high demand");

            if (isUnavailable && primaryModel !== fallbackModel) {
                console.warn(
                    `[analyze] ${primaryModel} is experiencing high demand (503). Retrying with fallback model ${fallbackModel}...`
                );
                responseText = await callGemini(fallbackModel);
            } else {
                throw err;
            }
        }

        logTime("Gemini response received");

        if (!responseText) {
            throw new Error("Gemini returned an empty response");
        }

        // 5. Validate AI response.
        let parsedResponse: unknown;

        try {
            parsedResponse = JSON.parse(responseText);
        } catch {
            console.error("Gemini returned invalid JSON:", responseText);

            return NextResponse.json(
                { success: false, message: "AI returned invalid JSON" },
                { status: 502 }
            );
        }

        const validated = analysisSchema.safeParse(parsedResponse);

        if (!validated.success) {
            console.error(
                "Invalid Gemini response:",
                validated.error.flatten()
            );

            return NextResponse.json(
                { success: false, message: "AI returned invalid analysis data" },
                { status: 502 }
            );
        }

        // 6. Verify catalogue IDs against PostgreSQL.
        const catalogueMap = new Map(
            catalogue.map((item) => [item.id, item])
        );

        const matchedItems = validated.data.matchedItems.flatMap((match) => {
            const product = catalogueMap.get(match.catalogItemId);

            if (!product) return [];

            return [{
                catalogItemId: product.id,
                productName: product.name,
                quantity: match.quantity,
                confidence: match.confidence,
            }];
        });

        logTime("Analysis completed");

        return NextResponse.json({
            success: true,
            message: "Image analyzed successfully",
            matchedItems,
            unknownItems: validated.data.unknownItems,
        });

    } catch (error) {
        console.error("Image analysis error:", error);

        return NextResponse.json(
            { success: false, message: "Unable to analyze the image" },
            { status: 500 }
        );
    }
}
