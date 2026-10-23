"""Rebuild the active exterior garden or its botanical layers.

Compatibility entry point for the previous --preview / --layers commands.
The current builder and original leaf meshes live in fibonacci_garden
and fibonacci_geranium.
"""
import sys,runpy
from pathlib import Path
if '--mode' not in sys.argv:
    sys.argv.extend(['--mode','preview' if '--preview' in sys.argv else 'plant'])
runpy.run_path(str(Path(__file__).resolve().with_name('fibonacci_garden.py')),run_name='__main__')
