require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

if (!GEMINI_API_KEY) {
    console.error("ERROR: Add your Gemini key to .env as GEMINI_API_KEY=...");
    process.exit(1);
}

app.use(express.json({ limit: "10kb" }));
// Serve the app files from the project root without exposing server-side files.
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "task.html"));
});
app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "style.css"));
});
app.get("/script.js", (req, res) => {
    res.sendFile(path.join(__dirname, "script.js"));
});

// AI API route
app.post("/api/ask", async (req, res) => {

    try {
        const { prompt, mode } = req.body;

        // Basic validation
        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({
                error: "Please enter a valid question."
            });
        }

        const cleanPrompt = prompt.trim();

        if (cleanPrompt.length === 0) {
            return res.status(400).json({
                error: "Question cannot be empty."
            });
        }

        if (cleanPrompt.length > 4000) {
            return res.status(400).json({
                error: "Question is too long. Maximum 4000 characters allowed."
            });
        }

        // Different AI modes
        let instruction = "";

        switch (mode) {

            case "summarize":
                instruction = `
                    Summarize the following content in simple language.
                    Use important points and short paragraphs.
                `;
                break;

            case "quiz":
                instruction = `
                    Create a useful study quiz from the given topic.
                    Generate 5 questions.
                    Include 4 options for each question and clearly mention
                    the correct answer.
                `;
                break;

            case "career":
                instruction = `
                    Act as a helpful career assistant.
                    Give practical and beginner-friendly career guidance.
                    Include skills, learning roadmap and useful suggestions.
                `;
                break;

            default:
                instruction = `
                    Act as an AI Study Assistant.
                    Explain the answer clearly in simple language.
                    Use examples wherever useful.
                    Format the answer using headings and bullet points.
                `;
        }

        const requestGemini = model => fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY
                },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: instruction }] },
                    contents: [{ role: "user", parts: [{ text: cleanPrompt }] }]
                })
            }
        );

        let response = await requestGemini(GEMINI_MODEL);

        // The primary model can be temporarily busy; try Google's lighter model once.
        if (response.status === 503 && GEMINI_MODEL === "gemini-3.8-flash") {
            response = await requestGemini("gemini-3.5-flash-lite");
        }

        const result = await response.json();

        if (!response.ok) {
            console.error("Gemini API request failed with status:", response.status);

            if (response.status === 401 || response.status === 403) {
                return res.status(response.status).json({
                    error: "Gemini API key accept nahi hui. Google AI Studio ki valid key ko .env mein GEMINI_API_KEY ke naam se set karein."
                });
            }

            if (response.status === 429) {
                return res.status(429).json({
                    error: "Gemini API quota/rate limit aa gayi hai. Google AI Studio mein usage aur quota check karein."
                });
            }

            if (response.status === 503) {
                return res.status(503).json({
                    error: "Gemini abhi busy hai. Thodi der baad dobara try karein."
                });
            }

            return res.status(502).json({
                error: "Gemini API request fail hui. API key, model access aur Google AI Studio quota check karein."
            });
        }

        const answer = result.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("");

        if (!answer || answer.trim() === "") {
            return res.status(502).json({
                error: "Gemini ne empty response diya. Dobara try karein."
            });
        }

        res.json({
            answer: answer.trim()
        });

    } catch (error) {

        console.error("Gemini API Error:", error.message);

        res.status(500).json({
            error: "Gemini se connect nahi ho paya. Internet connection check karke dobara try karein."
        });
    }
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`AI Study Assistant running at http://localhost:${PORT}`);
});

server.on("error", error => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. The app may already be running at http://localhost:${PORT}. Stop the existing server with Ctrl+C before starting another copy.`);
        return;
    }

    console.error("Unable to start server:", error.message);
});
