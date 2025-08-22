#!/usr/bin/env python3
"""
AI Code Editor - Python Backend API
Handles AI requests via WebSocket and REST API
Supports both online (OpenAI/Groq) and offline (llama.cpp) modes
"""

import asyncio
import websockets
import json
import logging
import os
import sys
from typing import Dict, Any, Optional
from datetime import datetime
import threading

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ai_engine import AIEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AICodeEditorBackend:
    def __init__(self):
        self.ai_engine = AIEngine()
        self.connected_clients = set()
        self.host = 'localhost'
        self.port = 8765
        
    async def register_client(self, websocket):
        """Register a new client connection"""
        self.connected_clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.connected_clients)}")
        
        # Send welcome message
        welcome_msg = {
            "type": "connection",
            "success": True,
            "message": "Connected to AI Code Editor Backend",
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send(json.dumps(welcome_msg))

    async def unregister_client(self, websocket):
        """Unregister a client connection"""
        self.connected_clients.discard(websocket)
        logger.info(f"Client disconnected. Total clients: {len(self.connected_clients)}")

    async def handle_message(self, websocket, message: str):
        """Handle incoming messages from clients"""
        try:
            data = json.loads(message)
            logger.info(f"Received request: {data.get('action', 'unknown')}")
            
            # Extract request data
            action = data.get('action')
            content = data.get('content', '')
            persona = data.get('persona', 'teacher')
            mode = data.get('mode', 'online')
            options = data.get('options', {})
            
            # Process the request
            response = await self.process_request(action, content, persona, mode, options)
            
            # Send response back to client
            await websocket.send(json.dumps(response))
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON received: {e}")
            error_response = {
                "success": False,
                "error": "Invalid JSON format",
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(error_response))
            
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            error_response = {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send(json.dumps(error_response))

    async def process_request(self, action: str, content: str, persona: str, mode: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Process different types of AI requests"""
        try:
            if action == 'explain':
                response = await self.ai_engine.explain_code(content, persona, mode)
            elif action == 'translate':
                target_language = options.get('targetLanguage', 'python')
                response = await self.ai_engine.translate_code(content, target_language, persona, mode)
            elif action == 'optimize':
                response = await self.ai_engine.optimize_code(content, persona, mode)
            elif action == 'chat':
                response = await self.ai_engine.chat(content, persona, mode)
            elif action == 'fix_error':
                error_msg = options.get('error', '')
                response = await self.ai_engine.fix_error(content, error_msg, persona, mode)
            else:
                response = f"Unknown action: {action}. Available actions: explain, translate, optimize, chat, fix_error"
            
            return {
                "success": True,
                "response": response,
                "action": action,
                "persona": persona,
                "mode": mode,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing request: {e}")
            return {
                "success": False,
                "error": str(e),
                "action": action,
                "timestamp": datetime.now().isoformat()
            }

    async def handle_client(self, websocket, path):
        """Handle individual client connections"""
        await self.register_client(websocket)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info("Client connection closed")
        except Exception as e:
            logger.error(f"Error in client handler: {e}")
        finally:
            await self.unregister_client(websocket)

    def start_server(self):
        """Start the WebSocket server"""
        logger.info(f"Starting AI Code Editor Backend on ws://{self.host}:{self.port}")
        
        # Start the WebSocket server
        start_server = websockets.serve(
            self.handle_client,
            self.host,
            self.port,
            ping_interval=20,
            ping_timeout=10,
            max_size=1024*1024  # 1MB max message size
        )
        
        # Run the server
        asyncio.get_event_loop().run_until_complete(start_server)
        logger.info("Backend server started successfully!")
        
        try:
            asyncio.get_event_loop().run_forever()
        except KeyboardInterrupt:
            logger.info("Server shutdown requested")
        except Exception as e:
            logger.error(f"Server error: {e}")
        finally:
            logger.info("Backend server stopped")

# Health check endpoint for monitoring
class HealthServer:
    def __init__(self, port=8766):
        self.port = port
        
    def start(self):
        """Start a simple HTTP health check server"""
        import http.server
        import socketserver
        
        class HealthHandler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path == '/health':
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    health_info = {
                        "status": "healthy",
                        "timestamp": datetime.now().isoformat(),
                        "service": "AI Code Editor Backend"
                    }
                    self.wfile.write(json.dumps(health_info).encode())
                else:
                    self.send_response(404)
                    self.end_headers()
                    
            def log_message(self, format, *args):
                pass  # Suppress logging for health checks
        
        with socketserver.TCPServer(("", self.port), HealthHandler) as httpd:
            logger.info(f"Health check server running on port {self.port}")
            httpd.serve_forever()

def main():
    """Main entry point"""
    backend = AICodeEditorBackend()
    
    # Start health check server in a separate thread
    health_server = HealthServer()
    health_thread = threading.Thread(target=health_server.start, daemon=True)
    health_thread.start()
    
    # Initialize AI engine
    logger.info("Initializing AI engine...")
    if backend.ai_engine.initialize():
        logger.info("AI engine initialized successfully")
    else:
        logger.warning("AI engine initialization failed, running in limited mode")
    
    # Start the main WebSocket server
    backend.start_server()

if __name__ == "__main__":
    main()