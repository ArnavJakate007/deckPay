import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("Missing VITE_GEMINI_API_KEY in .env");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

export interface BillDetails {
    total: number;
    items: string[];
    date: string;
    currency: string;
}

export async function parseBillImage(imageFile: File): Promise<BillDetails> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Convert file to base64
        const base64Data = await fileToGenerativePart(imageFile);

        const prompt = `Analyze this receipt image and extract the following details in JSON format:
    - total: The total amount paid (number only)
    - items: A list of items purchased (array of strings)
    - date: The date of the receipt (YYYY-MM-DD format if possible, or string)
    - currency: The currency symbol or code (e.g., "INR", "₹", "USD")

    Return ONLY raw JSON. No markdown formatting.`;

        const result = await model.generateContent([prompt, base64Data as any]);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(cleanText) as BillDetails;
    } catch (error) {
        console.error("Error parsing bill:", error);
        throw new Error("Failed to extract bill details. Please try again or enter manually.");
    }
}

async function fileToGenerativePart(file: File) {
    const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
}
