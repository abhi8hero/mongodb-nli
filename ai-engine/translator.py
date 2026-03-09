from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
import os
import json
import re
from dotenv import load_dotenv

app = FastAPI()

@app.get("/")
def root():
    return {"message": "MongoDB NLI AI Engine is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

ALLOWED_OPERATIONS = ["find", "insert", "update", "delete", "count"]
MAX_LIMIT = 100
PROMPT_PATH = os.path.join("prompts", "mongo_prompt.txt")

class QueryRequest(BaseModel):
    query: str

def load_prompt(user_query: str) -> str:
    with open(PROMPT_PATH, "r", encoding="utf-8") as file:
        template = file.read()
    return template.replace("{query}", user_query)

def validate_operation(op: dict):

    required = ["collection", "operation"]
    op.setdefault("filter", {})
    op.setdefault("sort", {})
    op.setdefault("limit", 0)
    op.setdefault("data", {})

    for key in required:
        if key not in op:
            return f"Missing key: {key}"

    if op["operation"] not in ALLOWED_OPERATIONS:
        return "Invalid operation"

    if op["limit"] and op["limit"] > MAX_LIMIT:
        op["limit"] = MAX_LIMIT

    if op["operation"] == "update":
        if not any(key.startswith("$") for key in op["data"]):
            op["data"] = {"$set": op["data"]}

    return None

@app.post("/translate")
def translate_query(request: QueryRequest):
    try:
        prompt = load_prompt(request.query)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        raw_text = response.text.strip()

        match = re.search(r"\{[\s\S]*\}", raw_text)
        if not match:
            return {"error": True, "message": "Invalid AI response"}

        parsed = json.loads(match.group())

        if "operations" not in parsed:
            return {"error": True, "message": "Missing operations"}

        validated = []

        for op in parsed["operations"]:
            err = validate_operation(op)
            if err:
                return {"error": True, "message": err}
            validated.append(op)

        return {"operations": validated}

    except Exception as e:
        return {"error": True, "message": str(e)}
    
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("translator:app", host="0.0.0.0", port=port)
