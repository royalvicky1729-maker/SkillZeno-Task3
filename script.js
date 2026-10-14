const promptInput = document.getElementById("prompt");

const askBtn = document.getElementById("askBtn");

const clearBtn = document.getElementById("clearBtn");

const copyBtn = document.getElementById("copyBtn");

const response = document.getElementById("response");

const responseCard = document.getElementById("responseCard");

const loading = document.getElementById("loading");

const errorBox = document.getElementById("errorBox");

const charCount = document.getElementById("charCount");

const modeButtons = document.querySelectorAll(".mode-btn");


// Current AI mode
let currentMode = "study";


// Character counter
promptInput.addEventListener("input", () => {

    const length = promptInput.value.length;

    charCount.textContent = `${length} / 4000`;

});


// Mode selection
modeButtons.forEach(button => {

    button.addEventListener("click", () => {

        modeButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        currentMode = button.dataset.mode;

        updatePlaceholder();

    });

});


// Update placeholder according to mode
function updatePlaceholder() {

    const placeholders = {

        study:
            "Example: Explain operating system in simple language...",

        summarize:
            "Paste the text you want to summarize...",

        quiz:
            "Example: Create a quiz on Computer Networks...",

        career:
            "Example: Give me a roadmap to become a full-stack developer..."

    };

    promptInput.placeholder =
        placeholders[currentMode];

}


// Show error
function showError(message) {

    errorBox.textContent = message;

    errorBox.classList.remove("hidden");
}


// Hide error
function hideError() {

    errorBox.classList.add("hidden");

    errorBox.textContent = "";
}


// Ask AI
async function askAI() {

    hideError();

    const prompt = promptInput.value.trim();


    // Validation
    if (!prompt) {

        showError(
            "Please enter a question or topic first."
        );

        promptInput.focus();

        return;
    }


    if (prompt.length > 4000) {

        showError(
            "Your input is too long. Maximum 4000 characters allowed."
        );

        return;
    }


    // UI loading state
    askBtn.disabled = true;

    askBtn.textContent = "Generating...";

    loading.classList.remove("hidden");

    responseCard.classList.add("hidden");


    try {

        const res = await fetch("/api/ask", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                prompt: prompt,

                mode: currentMode

            })

        });


        const data = await res.json();


        if (!res.ok) {

            throw new Error(
                data.error || "Something went wrong."
            );

        }


        if (!data.answer ||
            data.answer.trim() === "") {

            throw new Error(
                "AI returned an empty response."
            );

        }


        response.textContent = data.answer;

        responseCard.classList.remove("hidden");


        // Scroll to answer
        responseCard.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


    } catch (error) {

        console.error(error);

        showError(
            error.message ||
            "Unable to connect to the AI service."
        );

    } finally {

        loading.classList.add("hidden");

        askBtn.disabled = false;

        askBtn.textContent = "Ask AI ✨";

    }

}


// Ask button
askBtn.addEventListener(
    "click",
    askAI
);


// Enter key shortcut
promptInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            event.ctrlKey
        ) {
            askAI();
        }

    }
);


// Copy response
copyBtn.addEventListener(
    "click",
    async () => {

        const text =
            response.textContent.trim();

        if (!text) return;

        try {

            await navigator.clipboard.writeText(text);

            copyBtn.textContent = "Copied ✓";

            setTimeout(() => {

                copyBtn.textContent = "📋 Copy";

            }, 1500);

        } catch {

            showError(
                "Unable to copy the response."
            );

        }

    }
);


// Clear everything
clearBtn.addEventListener(
    "click",
    () => {

        promptInput.value = "";

        response.textContent = "";

        responseCard.classList.add("hidden");

        hideError();

        charCount.textContent = "0 / 4000";

        promptInput.focus();

    }
);