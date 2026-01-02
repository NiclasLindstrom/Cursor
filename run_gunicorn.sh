#!/bin/bash
# Simple script to run the application with Gunicorn

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run Gunicorn
gunicorn --config gunicorn_config.py app:app

