import fetch from "node-fetch";

// Preluăm datele din GitHub Secrets
const SHOP = process.env.SHOPIFY_SHOP;
const TOKEN = process.env.SHOPIFY_TOKEN;

async function run() {
  try {
    console.log(`Pornire actualizare pentru: ${SHOP}`);

    // 1. Curs BNR
    const xmlRes = await fetch("https://www.bnr.ro/nbrfxrates.xml");
    const xmlText = await xmlRes.text();
    const match = xmlText.match(/<Rate currency="EUR">([0-9.]+)<\/Rate>/);
    if (!match) throw new Error("Nu am putut citi cursul BNR.");
    const eurRate = match[1];

    // 2. Obținem GID-ul magazinului
    const shopRes = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ shop { id } }" })
    });
    const shopData = await shopRes.json();
    const shopId = shopData.data?.shop?.id;
    if (!shopId) throw new Error("Eroare autentificare Shopify. Verifică TOKEN-ul.");

    // 3. Update Metafield
    const mutation = `
      mutation metafieldsSet($input: [MetafieldsSetInput!]!) {
        metafieldsSet(input: $input) {
          userErrors { message }
        }
      }`;

    const variables = {
      input: [{
        namespace: "custom",
        key: "eur_rate",
        type: "number_decimal",
        value: eurRate,
        ownerId: shopId
      }]
    };

    const result = await fetch(`https://${SHOP}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ query: mutation, variables })
    });

    console.log(`Succes! Cursul ${eurRate} a fost trimis către Shopify.`);
  } catch (err) {
    console.error("Eroare:", err.message);
    process.exit(1);
  }
}

run();
