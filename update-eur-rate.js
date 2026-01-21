import fetch from "node-fetch";
import { parseStringPromise } from "xml2js";

const SHOP = process.env.SHOPIFY_SHOP;
const TOKEN = process.env.SHOPIFY_TOKEN;

async function run() {
  try {
    // 1. Fetch BNR XML
    const xml = await fetch("https://www.bnr.ro/nbrfxrates.xml").then(r => r.text());
    const parsed = await parseStringPromise(xml);

    // 2. Extract EUR rate
    const rates = parsed.DataSet.Body[0].Cube[0].Rate;
    const eur = rates.find(r => r.$.currency === "EUR")._;

    console.log("Fetched EUR rate from BNR:", eur);

    // 3. Update Shopify shop metafield
    const response = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: `
          mutation {
            metafieldsSet(metafields: [{
              ownerId: "gid://shopify/Shop/1",
              namespace: "custom",
              key: "eur_rate",
              type: "number_decimal",
              value: "${eur}"
            }]) {
              metafields { id value }
              userErrors { message }
            }
          }
        `
      })
    });

    const result = await response.json();

    if (result.errors || result.data.metafieldsSet.userErrors.length) {
      console.error("Shopify error:", result);
      process.exit(1);
    }

    console.log("✅ EUR rate updated in Shopify metafield:", eur);

  } catch (err) {
    console.error("Script failed:", err);
    process.exit(1);
  }
}

run();


