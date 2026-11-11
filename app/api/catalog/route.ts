
import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";

import { db, catalogItems } from "../../../src/lib/db";

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
