from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
import os
import json
import re
from dotenv import load_dotenv
import uvicorn

# -------------------------------
# FastAPI App
# -------------------------------

app = FastAPI()

@app.get("/")
def root():
    return {"message": "MongoDB NLI AI Engine is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# -------------------------------
# Environment Setup
# -------------------------------

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

# -------------------------------
# Constants
# -------------------------------

ALLOWED_OPERATIONS = [
    "find",
    "insert",
    "update",
    "delete",
    "count",
    "aggregate"
]

MAX_LIMIT = 100
PROMPT_PATH = os.path.join("prompts", "mongo_prompt.txt")

# -------------------------------
# Request Model
# -------------------------------

class QueryRequest(BaseModel):
    query: str

# -------------------------------
# Prompt Loader
# -------------------------------

def load_prompt(user_query: str) -> str:
    with open(PROMPT_PATH, "r", encoding="utf-8") as file:
        template = file.read()

    return template.replace("{query}", user_query)

# -------------------------------
# Operation Validator
# -------------------------------

def validate_operation(op: dict):

    # Basic required keys
    if "collection" not in op:
        return "Missing key: collection"

    if "operation" not in op:
        return "Missing key: operation"

    # Operation check
    if op["operation"] not in ALLOWED_OPERATIONS:
        return f"Invalid operation: {op['operation']}"

    # Aggregate validation
    if op["operation"] == "aggregate":
        if "pipeline" not in op or not isinstance(op["pipeline"], list):
            return "Aggregation requires a 'pipeline' array"

    # Limit safety
    if isinstance(op.get("limit"), int) and op["limit"] > MAX_LIMIT:
        op["limit"] = MAX_LIMIT

    # Update safety
    if op["operation"] == "update":
        data = op.get("data", {})

        if data and not any(key.startswith("$") for key in data.keys()):
            op["data"] = {"$set": data}

    return None

# -------------------------------
# Translate Endpoint
# -------------------------------

@app.post("/translate")
def translate_query(request: QueryRequest):

    try:

        prompt = load_prompt(request.query)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        raw_text = response.text.strip()

        # Extract JSON from LLM output
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)

        if not match:
            return {
                "error": True,
                "message": "Invalid AI response"
            }

        parsed = json.loads(match.group())

        if "operations" not in parsed:
            return {
                "error": True,
                "message": "Missing operations"
            }

        validated = []

        for op in parsed["operations"]:

            err = validate_operation(op)

            if err:
                return {
                    "error": True,
                    "message": err
                }

            validated.append(op)

        return {
            "operations": validated
        }

    except Exception as e:
        return {
            "error": True,
            "message": str(e)
        }

# -------------------------------
# Local Run 
# -------------------------------

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 10000))

    uvicorn.run(
        "translator:app",
        host="0.0.0.0",
        port=port
    )
