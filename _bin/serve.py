#!/usr/bin/env python3

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import os
import socket
import webbrowser
import threading
import time

DIRECTORY_TO_SERVE = os.getcwd()
STARTING_PORT = 3333

class DevHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.directory = DIRECTORY_TO_SERVE

    def log_message(self, format, *args):
        pass  # Override to suppress logging    

    def translate_path(self, path):
        path = path.split("?", 1)[0]
        path = path.split("#", 1)[0]
        path = os.path.join(self.directory, *path.split("/"))
        return path
    
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

def find_free_port(start_port):
    port = start_port
    while port < 65536:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("", port))
                return port
        except OSError:
            port += 1

def open_browser(url):
    # Give the server a moment to start
    time.sleep(0.5)
    webbrowser.open(url)

if __name__ == "__main__":
    port = find_free_port(STARTING_PORT)
    address = "127.0.0.1"
    url = f"""http://{address}:{port}"""

    threading.Thread(target=open_browser, args=(url,), daemon=True).start()
    
    with ThreadingHTTPServer((address, port), DevHandler) as httpd:
        print(f"""Serving {DIRECTORY_TO_SERVE} at
http://{httpd.server_address[0]}:\x1b[1;32m{httpd.server_address[1]}\x1b[0m""")
        print("Logging disabled. To re-enable comment out `DevHandler.log_message()`")
        httpd.serve_forever()
