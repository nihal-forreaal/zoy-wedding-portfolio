import asyncio
import os
import discord
from discord.ext import commands
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
import uvicorn

# ==========================================
# CONFIGURATION - USE RENDER ENVIRONMENT VARIABLES
# ==========================================
DISCORD_TOKEN = os.environ.get("DISCORD_TOKEN", "")
CATEGORY_ID = int(os.environ.get("CATEGORY_ID", "0"))
# ==========================================

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        # Map channel_id -> websocket
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, channel_id: int):
        await websocket.accept()
        self.active_connections[channel_id] = websocket

    def disconnect(self, channel_id: int):
        if channel_id in self.active_connections:
            del self.active_connections[channel_id]

    async def send_message(self, channel_id: int, message: str):
        if channel_id in self.active_connections:
            await self.active_connections[channel_id].send_text(message)

manager = ConnectionManager()

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f'Discord Bot Logged in as {bot.user}')

@bot.command()
async def ping(ctx):
    await ctx.send("Pong! The Zoy Designs bot is online.")

@bot.event
async def on_message(message):
    await bot.process_commands(message)
    if message.author == bot.user:
        return
    if message.content and not message.content.startswith("!"):
        # Route to specific websocket connected to this channel
        await manager.send_message(message.channel.id, f"Zoy Designs: {message.content}")

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    channel_id = None
    try:
        category = await bot.fetch_channel(CATEGORY_ID)
        if category:
            channel = discord.utils.get(category.text_channels, name=session_id)
            if not channel:
                channel = await category.create_text_channel(session_id)
            channel_id = channel.id
            await manager.connect(websocket, channel_id)
            
            while True:
                data = await websocket.receive_text()
                print(f"Received message from {session_id}: {data}")
                await channel.send(f"**New Message:** {data}")
        else:
            await websocket.accept()
            await websocket.send_text("Error: Support offline (Category not found).")
            await websocket.close()
    except WebSocketDisconnect:
        if channel_id:
            manager.disconnect(channel_id)
    except Exception as e:
        print(f"Error in websocket for {session_id}: {e}")

app.mount("/", StaticFiles(directory=".", html=True), name="static")

async def run_discord():
    while True:
        try:
            if DISCORD_TOKEN != "YOUR_DISCORD_BOT_TOKEN_HERE":
                await bot.start(DISCORD_TOKEN)
            else:
                break
        except Exception as e:
            print(f"Network Error connecting to Discord: {e}")
            await asyncio.sleep(10)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(run_discord())

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
