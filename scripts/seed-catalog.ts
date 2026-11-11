
import "dotenv/config";

import { db, pool, catalogItems } from "../src/lib/db";

const products = [
    { name: "Classic Chocolate Brownie", description: "Rich chocolate brownie", price: 8000 },
    { name: "Walnut Brownie", description: "Chocolate brownie with walnuts", price: 10000 },
    { name: "Vanilla Cupcake", description: "Classic vanilla cupcake", price: 6000 },
    { name: "Chocolate Cupcake", description: "Chocolate cupcake with frosting", price: 7000 },
    { name: "Red Velvet Cupcake", description: "Red velvet cupcake with cream cheese frosting", price: 8500 },
    { name: "Lemon Loaf Slice", description: "Fresh lemon-flavoured loaf cake", price: 7500 },
    { name: "Banana Bread Slice", description: "Homemade banana bread", price: 6500 },
    { name: "Chocolate Chip Cookie", description: "Cookie with chocolate chips", price: 5000 },
    { name: "Oatmeal Cookie", description: "Oatmeal and raisin cookie", price: 4500 },
    { name: "Mini Cheesecake", description: "Individual-sized baked cheesecake", price: 12000 },
    { name: "Cinnamon Roll", description: "Soft cinnamon roll with icing", price: 9000 },
    { name: "Blueberry Muffin", description: "Muffin with blueberries", price: 7500 },
];

async function seedCatalogue() {
    try {
        console.log("Checking existing catalogue...");

        const existingItems = await db
            .select({ name: catalogItems.name })
            .from(catalogItems);

        const existingNames = new Set(
            existingItems.map((item) => item.name.trim().toLowerCase())
        );

        const newProducts = products.filter(
            (product) => !existingNames.has(product.name.toLowerCase())
        );

        if (newProducts.length === 0) {
            console.log("Catalogue is already seeded. No new products added.");
            return;
        }

        await db.insert(catalogItems).values(newProducts);

        console.log(`Successfully added ${newProducts.length} products.`);
        console.table(
            newProducts.map((product) => ({
                name: product.name,
                price: `₹${(product.price / 100).toFixed(2)}`,
            }))
        );
    } catch (error) {
        console.error("Catalogue seeding failed:", error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

seedCatalogue();
