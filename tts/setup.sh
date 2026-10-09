# #!/usr/bin/env bash
# set -euo pipefail

# SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# VENV="$SCRIPT_DIR/.venv"

# echo "==> Creating Python virtual environment at $VENV"
# python3 -m venv "$VENV"

echo "==> Installing dependencies"
"$VENV/bin/pip" install --upgrade pip --quiet
"$VENV/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"

echo "==> Running test (generates tts/test_output.wav)"
"$VENV/bin/python" "$SCRIPT_DIR/test_setup.py"

echo ""
echo "Setup complete. Activate the environment with:"
echo "  source $VENV/bin/activate"
echo ""
echo "Then generate all voice lines with:"
echo "  python tts/generate_voices.py"
echo "  python tts/measure_durations.py"
