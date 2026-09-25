import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

async function testModel(modelName) {
  console.log(`\n--- Testing model: ${modelName} ---`);
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ text: 'Rispondi solo con la parola "OK" se mi ricevi.' }],
    });
    console.log(`Success! Response: ${response.text}`);
  } catch (error) {
    console.error(`Failed with error:`, error.message);
  }
}

async function run() {
  await testModel("gemini-3-flash-preview");
  await testModel("gemini-3.5-flash");
  await testModel("gemini-3.1-flash-lite");
  await testModel("gemini-3.1-flash-lite-preview");
  await testModel("gemini-3.1-pro-preview");
}

run();
