from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Presenton Minimal Bridge")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/openapi.json")
def openapi():
    return {"openapi":"3.1.0","info":{"title":"Presenton","version":"0.1.0"},"paths":{"/api/v1/ppt":{"get":{"responses":{"200":{"description":"ok"}}}}}}

@app.get("/api/v1/ppt")
def ppt_health():
    return {"status":"ready","generation":"enabled","provider":"configured"}
