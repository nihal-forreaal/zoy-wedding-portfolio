import asyncio
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
import uvicorn


# ==========================================
# Simple keyword-based auto-responder chat
# No external integrations required.
# ==========================================

AUTO_RESPONSES = [
    (["price", "cost", "package", "₹", "rs", "rupee"], "Our packages start from ₹299. Check our Pricing section for full details, or contact us directly for a custom quote!"),
    (["rsvp", "attend", "guest"], "Yes! Our Premium package includes a fully digital RSVP system for all your events, including multi-event support."),
    (["time", "long", "week", "deliver", "ready"], "We typically deliver your custom wedding website within 1–2 weeks of receiving your photos and details."),
    (["domain", "url", "link", "website address"], "A custom domain name is included for one year with our Premium and Luxury packages."),
    (["photo", "gallery", "picture", "image"], "Our Premium package includes a full photo gallery. You can share as many photos as you like with your guests!"),
    (["map", "venue", "location", "direction"], "We integrate interactive Google Maps directly into your wedding website so guests never get lost."),
    (["countdown", "timer", "date"], "Yes! We add a beautiful live countdown timer to your site to build excitement as your big day approaches."),
    (["contact", "email", "whatsapp", "reach", "talk"], "You can email us at hello@zoydesigns.com or WhatsApp us — just click the Contact Us button at the top!"),
    (["hi", "hello", "hey", "hii", "helo"], "Hi there! Welcome to Zoy Designs 👋 How can we help you plan your perfect wedding website today?"),
]

DEFAULT_RESPONSE = (
    "Thank you for your message! Our team will get back to you shortly. "
    "For urgent queries, please email us at hello@zoydesigns.com or use the WhatsApp button."
)


def get_auto_response(message: str) -> str:
    msg_lower = message.lower()
    for keywords, response in AUTO_RESPONSES:
        if any(kw in msg_lower for kw in keywords):
            return response
    return DEFAULT_RESPONSE


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)

    async def send_message(self, session_id: str, message: str):
        ws = self.active_connections.get(session_id)
        if ws:
            await ws.send_text(message)


manager = ConnectionManager()

app = FastAPI()


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    # Always accept the connection first before any logic
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Simulate a brief "typing" delay for a natural feel
            await asyncio.sleep(0.8)
            response = get_auto_response(data)
            await manager.send_message(session_id, response)
    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        print(f"WebSocket error for session '{session_id}': {e}")
        manager.disconnect(session_id)


# Serve static files (HTML/CSS/JS) from the current directory
app.mount("/", StaticFiles(directory=".", html=True), name="static")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
