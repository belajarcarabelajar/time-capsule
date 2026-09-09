"""Run with Blender --background --python-exit-code 1 --python this-file."""
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from history_room_scenes import initialize_materials, rural_village

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
initialize_materials()
rural_village()
bpy.context.view_layer.update()
parts = [obj for obj in bpy.context.scene.objects
         if obj.name.startswith('Lumbung padi') and obj.type == 'MESH']
posts = [obj for obj in parts if obj.dimensions.z > 2
         and obj.dimensions.x < .3 and obj.dimensions.y < .3]
floors = [obj for obj in parts if obj.dimensions.x > 2
          and obj.dimensions.y > 1.8 and obj.dimensions.z < .2]
assert len(posts) == 4 and len(floors) == 1, 'Expected four posts and one floor'
floor = floors[0]
floor_bottom = floor.location.z - floor.dimensions.z / 2
for post in posts:
    top = post.location.z + post.dimensions.z / 2
    assert top >= floor_bottom, f'{post.name}: support gap {floor_bottom - top:.3f}'
print('HISTORY_STRUCTURE_PASS: all four granary posts meet the floor')
