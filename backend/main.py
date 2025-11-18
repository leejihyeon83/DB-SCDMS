from fastapi import FastAPI
from backend.routers import example

app = FastAPI()

app.include_router(example.router)

@app.get("/")
def home():
    return {"message": "DB-SCDMS Backend is running!"}
