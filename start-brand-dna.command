#!/bin/bash
# Double-click this file to run Brand DNA at http://localhost:8000
cd "$(dirname "$0")"
( sleep 1; open "http://localhost:8000" 2>/dev/null ) &
echo ""
echo "  Brand DNA is running at:  http://localhost:8000"
echo "  (leave this window open — close it to stop the server)"
echo ""
python3 -m http.server 8000
