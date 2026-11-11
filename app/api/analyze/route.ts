
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { db, catalogItems } from "../../../src/lib/db";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];


const analysisSchema = z.object({
    matchedItems: z.array(
        z.object({
            catalogItemId: z.string().uuid(),
            quantity: z.number().int().positive().catch(1).default(1),
            confidence: z.number().min(0).max(1).catch(0.5).default(0.5),
        })
    ).default([]),

    unknownItems: z.array(
        z.object({
            description: z.string(),
            estimatedQuantity: z.number().int().positive().catch(1).default(1),
        })
    ).default([]),

    identifiedProducts: z.array(
        z.object({
            description: z.string().default("Unidentified product"),
            category: z.string().default("Unknown"),
            brand: z.string().nullable().default(null),
            model: z.string().nullable().default(null),
            color: z.string().nullable().default(null),
            packaging: z.string().nullable().default(null),
            visibleCondition: z.string().nullable().default(null),
            barcode: z.string().nullable().default(null),
        })
    ).default([]),
});

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: {
        apiVersion: "v1beta",
        timeout: 60_000,
    },
});

export async function POST(request: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { success: false, error: "Gemini API key is not configured." },
                { status: 500 }
            );
        }

        const formData = await request.formData();
        const image = formData.get("image");
        const barcodeValue = formData.get("barcode");

        if (!(image instanceof File)) {
            return NextResponse.json(
                { success: false, error: "An image is required." },
                { status: 400 }
            );
        }

        if (!ALLOWED_MIME_TYPES.includes(image.type)) {
            return NextResponse.json(
                { success: false, error: "Unsupported image format." },
                { status: 400 }
            );
        }

        if (image.size > MAX_IMAGE_SIZE) {
            return NextResponse.json(
                { success: false, error: "Image must be 5 MB or smaller." },
                { status: 400 }
            );
        }

        const catalogue = await db
            .select({
                id: catalogItems.id,
                name: catalogItems.name,
                description: catalogItems.description,
            })
            .from(catalogItems)
            .orderBy(asc(catalogItems.name));

        if (catalogue.length === 0) {
            return NextResponse.json(
                { success: false, error: "The product catalogue is empty." },
                { status: 400 }
            );
        }

        const imageBuffer = Buffer.from(await image.arrayBuffer());
        const base64Image = imageBuffer.toString("base64");

        const catalogueText = catalogue
            .map(
                (item) =>
                    `ID: ${item.id} | Name: ${item.name} | Description: ${item.description || "No description"
                    }`
            )
            .join("\n");

        const prompt = `
You are a visual product recognition and catalogue matching system.

Analyze the supplied product image. This system must work across general
retail categories, not only food or bakery products.

CATALOGUE:
${catalogueText}

BARCODE SIGNAL:
${typeof barcodeValue === "string" && barcodeValue.trim()
                ? barcodeValue.trim()
                : "No barcode was provided."}

TASKS:

1. Identify each distinct visible product.
2. Describe its visible characteristics.
3. Extract the following attributes where visually supported:
   - category
   - brand
   - model
   - colour
   - packaging
   - visible condition
4. Include the supplied barcode value in the relevant product's barcode
   field, if one was provided. Do not invent barcode values.
5. Match detected products against the supplied catalogue.
6. Only use catalogue IDs that actually appear in the catalogue.
7. If a product cannot be confidently matched, put it in unknownItems.
8. Estimate the quantity of each detected product.
9. Return a confidence score between 0 and 1 for every catalogue match.

IMPORTANT RULES:

- Do not invent brands, model numbers, or product specifications.
- Use null for attributes that cannot be reliably determined.
- Do not infer authenticity from an image or barcode.
- Do not estimate product prices.
- Do not create catalogue entries.
- Do not force a match when the catalogue does not contain the product.
- A barcode is an identification signal, not proof of authenticity.
- Return valid JSON matching the requested schema.
`;

        const model =
            process.env.GEMINI_MODEL || "gemini-3.5-flash";

        let response;

        try {
            response = await ai.models.generateContent({
                model,
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
                    maxOutputTokens: 4096,
                },
            });
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : "";

            if (
                message.includes("503") ||
                message.toLowerCase().includes("high demand")
            ) {
                response = await ai.models.generateContent({
                    model: "gemini-3.6-flash",
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
                        maxOutputTokens: 4096,
                    },
                });
            } else {
                throw error;
            }
        }

        const responseText = response.text;

        if (!responseText) {
            return NextResponse.json(
                { success: false, error: "AI returned an empty response." },
                { status: 502 }
            );
        }

        let parsedResponse: unknown;

        try {
            parsedResponse = JSON.parse(responseText);
        } catch {
            return NextResponse.json(
                { success: false, error: "AI returned invalid JSON." },
                { status: 502 }
            );
        }

        const validation = analysisSchema.safeParse(parsedResponse);

        if (!validation.success) {
            console.error(
                "AI response validation failed:",
                validation.error.flatten()
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "AI response did not match the expected structure.",
                },
                { status: 502 }
            );
        }

        const result = validation.data;
        const catalogueMap = new Map(
            catalogue.map((item) => [item.id, item])
        );

        const matchedItems = result.matchedItems
            .filter((item) => catalogueMap.has(item.catalogItemId))
            .map((item) => ({
                catalogItemId: item.catalogItemId,
                productName: catalogueMap.get(item.catalogItemId)!.name,
                quantity: item.quantity,
                confidence: item.confidence,
            }));

        return NextResponse.json({
            success: true,
            message: "Image analyzed successfully",
            matchedItems,
            unknownItems: result.unknownItems,
            identifiedProducts: result.identifiedProducts,
        });
    } catch (error) {
        console.error("Product analysis error:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Failed to analyze the product image.",
            },
            { status: 500 }
        );
    }
}
