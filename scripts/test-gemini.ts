
import { analyzeLink } from "../services/geminiService";

async function runTest() {
    const testUrl = "https://x.com/EvanFeigenbaum/status/2014870799321117058?s=20";
    console.log("Starting test for URL:", testUrl);

    if (!process.env.API_KEY) {
        console.error("ERROR: API_KEY environment variable is not set.");
        console.error("Usage: API_KEY=your_key npx vite-node scripts/test-gemini.ts");
        process.exit(1);
    }

    try {
        console.log("Calling analyzeLink...");
        const result = await analyzeLink(testUrl);
        console.log("SUCCESS! Result:", JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.error("FAILED during test.");
        console.error("Full Error Object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
}

runTest();
