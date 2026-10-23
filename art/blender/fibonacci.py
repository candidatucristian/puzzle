"""Build Room I's outdoor garden level in Blender/Cycles.

The authoritative scene builder is fibonacci_garden.py; the plant uses
original three-dimensional leaf scan topology in fibonacci_geranium.py.
The complete editable scene is saved as fibonacci.blend with packed textures.

blender -b --factory-startup -P art/blender/fibonacci.py -- --mode preview
blender -b --factory-startup -P art/blender/fibonacci.py -- --mode layers --width 2560 --samples 512 --gpu --save
"""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).resolve().with_name('fibonacci_garden.py')),run_name='__main__')
