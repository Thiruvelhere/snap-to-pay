
import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { z } from "zod";

import { db, catalogItems } from "../../../src/lib/db";

const createCatalogItemSchema = z.object({
    name: z.string().trim().min(1, "Product name is required").max(255),
    description: z.string().trim().max(2000).nullable().optional(),
    // Price is accepted in integer paise, never as a floating-point rupee value.
    price: z.number().int().positive().max(2147483647),
});

export async function GET() {
    try {
        const items = await db
            .select({
                id: catalogItems.id,
                name: catalogItems.name,
                description: catalogItems.description,
                price: catalogItems.price,
            })
            .from(catalogItems)
            .orderBy(asc(catalogItems.name));

        return NextResponse.json({
            success: true,
            items,
        });
    } catch (error) {
        console.error("Catalogue API error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to retrieve catalogue",
            },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = createCatalogItemSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid product details",
                    errors: validation.error.issues,
                },
                { status: 400 }
            );
        }

        const [item] = await db
            .insert(catalogItems)
            .values({
                name: validation.data.name,
                description: validation.data.description || null,
                price: validation.data.price,
            })
            .returning({
                id: catalogItems.id,
                name: catalogItems.name,
                description: catalogItems.description,
                price: catalogItems.price,
            });

        return NextResponse.json(
            {
                success: true,
                item,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Catalogue product creation error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to add product to catalogue",
            },
            { status: 500 }
        );
    }
}
