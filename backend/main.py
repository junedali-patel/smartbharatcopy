from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification
from typing import Any
import io
import os

# Use the existing locally downloaded Hugging Face snapshot in the repo.
# This path is relative to the backend/ folder.
# We point to the snapshot that contains config.json and preprocessor_config.json.
MODEL_DIR = (
    "../models--linkanjarad--mobilenet_v2_1.0_224-plant-disease-identification/"
    "snapshots/c1861579a670fb6232258805b801cd4137cb7176"
)

app = FastAPI(title="Plant Disease Classification API")

# Allow mobile clients (adjust origins for your app / domain in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def load_model() -> None:
    """
    Load the image processor and model once at startup.
    """
    global image_processor, model, device

    if not os.path.isdir(MODEL_DIR):
        raise RuntimeError(
            f"Model directory '{MODEL_DIR}' not found. "
            f"Make sure the snapshot folder from "
            f"'models--linkanjarad--mobilenet_v2_1.0_224-plant-disease-identification' "
            f"is present in the project."
        )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    image_processor = AutoImageProcessor.from_pretrained(MODEL_DIR)
    model = AutoModelForImageClassification.from_pretrained(MODEL_DIR)
    model.to(device)
    model.eval()


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> Any:
    """
    Accept an image upload and return disease label + confidence percentage.
    """
    if file.content_type is None or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image file.")

    inputs = image_processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.softmax(logits, dim=-1)
        confidence, predicted_idx = torch.max(probs, dim=-1)

    idx = int(predicted_idx.item())
    conf = float(confidence.item())

    label = model.config.id2label.get(idx, str(idx))
    confidence_pct = round(conf * 100.0, 2)

    return JSONResponse(
        {
            "disease_label": label,
            "confidence": confidence_pct,
        }
    )


@app.get("/health")
def health() -> Any:
    return {"status": "ok"}


"""
Run locally:

uvicorn main:app --host 0.0.0.0 --port 8000

Example response:
{
  "disease_label": "Apple___Black_rot",
  "confidence": 97.84
}
"""

