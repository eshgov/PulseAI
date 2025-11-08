import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json
from app.cpr_analyzer import CPRAnalyzer # Import our new class

# Initialize the FastAPI app
app = FastAPI()

# Create a single analyzer instance to be shared
# This way, it retains the BPM history for all connections
# Note: This is a simple approach; for multiple users, we'd manage this differently
analyzer = CPRAnalyzer()

@app.websocket("/ws/cpr")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected!")
    
    try:
        while True:
            # Receive the JSON message from the client
            data = await websocket.receive_text()
            
            # The client sends JSON: {"image": "base64..."}
            image_data_url = json.loads(data).get("image")
            
            if not image_data_url:
                continue

            # Process the frame using our analyzer
            feedback = analyzer.process_frame(image_data_url)
            
            if feedback:
                # Send the *real* feedback back
                await websocket.send_json(feedback)

    except WebSocketDisconnect:
        print("Client disconnected")
        # Reset analyzer state for the next connection (in this simple setup)
        analyzer.__init__() 
    except Exception as e:
        print(f"An error occurred: {e}")
        await websocket.close(code=1011)