"""Serve PostSet locally: python3 scripts/serve.py  (then open http://localhost:8000)

The same as `python3 -m http.server 8000 --directory src`, but it tells the
browser not to keep old copies of pages. Without that, Chrome can show a
screen from before your last change, which looks exactly like a bug.
Standard library only; nothing to install.
"""

import functools
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src")


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


handler = functools.partial(NoCache, directory=SRC)
with http.server.ThreadingHTTPServer(("", PORT), handler) as server:
    print(f"PostSet is running at http://localhost:{PORT}  (Ctrl+C stops it)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
