// query.js — Ask questions against your ingested PDFs using Garvan's persona

import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import { ChromaClient } from "chromadb";

dotenv.config();

// === Load Persona ===
const persona = JSON.parse(fs.readFileSync("./persona.json", "utf8"));

// === Constants ===
const COLLECTION_NAME = "ah_knowledge";
const CHROMA_URL = "http://localhost:8000"; // ensure chroma docker is running

// === Initialize Clients ===
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const chroma = new ChromaClient({ path: CHROMA_URL });

// === Helper: Build the persona-based prompt ===
function buildPrompt(question, context) {
  return `
You are ${persona.name}, a ${persona.role} based in ${persona.background.location}.
Speak with a ${persona.style.tone} tone and ${persona.style.humour} humour.
Your communication style should be ${persona.style.formality} in formality.
You uphold the values of ${persona.style.values.join(", ")}.
Education: ${persona.background.education}.
Interests: ${persona.background.interests.join(", ")}.
You occasionally use expressions like: ${persona.catchphrases.join(" / ")}.

Answer the following question truthfully and conversationally,
based on the retrieved context from PDFs. If uncertain, state your reasoning clearly.

Question: ${question}

Relevant context:
${context.map(c => c.pageContent).join("\n\n")}
  `;
}

// === Main function ===
async function main() {
  const question = process.argv.slice(2).join(" ").trim() || "What is this document about?";

  try {
    const collection = await chroma.getOrCreateCollection({ name: COLLECTION_NAME });

    // --- Build the embedding for the question with the SAME model used at ingest ---
    const qEmb = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: [question],
    });
    const queryVec = qEmb.data[0].embedding;

    // --- Ask Chroma using the vector (not queryTexts) ---
    const results = await collection.query({
      nResults: 3,
      queryEmbeddings: [queryVec],
    });

    const context = results.documents[0].map(text => ({ pageContent: text }));
    const prompt = buildPrompt(question, context);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a knowledgeable and personable pharmacist." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    console.log("\n💊 GarvanGPT says:\n");
    console.log(completion.choices[0].message.content);
  } catch (err) {
    console.error("⚠️ Error:", err);
  }
}

// === Run ===
main();
