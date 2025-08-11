#!/usr/bin/env python3
# Simple static server with COOP/COEP headers for WebGPU/WASM threads.
# Usage:
#   python3 server.py
# Then open: http://localhost:8000/index-webllm-min.html
from http.server import SimpleHTTPRequestHandler, HTTPServer

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Cross-origin isolation headers
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        # Basic CORS (handy if you load assets/CDNs)
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
