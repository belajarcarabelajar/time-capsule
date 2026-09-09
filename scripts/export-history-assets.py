"""Offline Blender authoring/export; see docs/history-environments.md."""
import argparse
import hashlib
import json
import math
import random
import subprocess
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from history_asset_details import enrich, merge_material_groups
from history_room_scenes import ROOM_BUILDERS, initialize_materials
from history_room_enrichment import enrich_surfaces
from history_scene_primitives import box, cylinder, finish, light, material, materials

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--room', choices=list(ROOM_BUILDERS), required=True)
parser.add_argument('--input', type=Path, help='Re-export an edited blend instead of authoring.')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = args.root.resolve()
out = root / 'apps/web/public/history' / args.room
source = root / 'assets/history/source' / f'{args.room}.blend'
out.mkdir(parents=True, exist_ok=True)
source.parent.mkdir(parents=True, exist_ok=True)
random.seed(1941)
views = json.loads(subprocess.check_output(
    ['node', str(root / 'scripts/history-asset-views.mjs'), args.room], text=True))

if args.input:
    bpy.ops.wm.open_mainfile(filepath=str(args.input.resolve()))
else:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    initialize_materials()
    ROOM_BUILDERS[args.room]()
    enrich_surfaces(args.room)
    enrich(args.room, box, cylinder, finish, material,
           materials['Oiled walnut'], materials['Illustrative parchment'])
    light('Soft afternoon key', (2, -4, 7), 1800, (1, .80, .57), 6, (0, 1, 1))
    light('Cool fill', (-4, -2, 4), 700, (.58, .72, 1), 5, (0, 1, 1))
    bpy.ops.object.camera_add()
    bpy.context.scene.camera = bpy.context.object

scene = bpy.context.scene
bpy.context.preferences.filepaths.save_version = 0
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 1440, 960
scene.render.resolution_percentage = 100
scene.world.color = (.12, .12, .12)
scene.view_settings.view_transform = 'AgX'
scene.render.image_settings.file_format = 'WEBP'
scene.render.image_settings.quality = 83
# Match runtime vertical field of view at the poster aspect ratio.
scene.camera.data.sensor_fit = 'VERTICAL'
scene.camera.data.lens = scene.camera.data.sensor_height / (2 * math.tan(math.radians(32) / 2))


def set_camera(view):
    def z_up(point):
        x, y, z = point
        return Vector((x, -z, y))
    scene.camera.location = z_up(view['position'])
    scene.camera.rotation_euler = (
        z_up(view['target']) - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()


posters = ['poster.webp', 'poster-detail.webp', 'poster-context.webp']
set_camera(views[0])
scene.render.filepath = str(out / posters[0])
bpy.ops.wm.save_as_mainfile(filepath=str(source), compress=False)
for filename, view in zip(posters, views):
    set_camera(view)
    scene.render.filepath = str(out / filename)
    bpy.ops.render.render(write_still=True)
merge_material_groups(scene)
bpy.ops.export_scene.gltf(filepath=str(out / 'room.glb'), export_format='GLB',
                          export_cameras=False, export_lights=False, export_apply=True,
                          export_yup=True, export_image_format='JPEG', export_jpeg_quality=82)
for obj in scene.objects:
    if obj.type == 'MESH':
        obj.data.calc_loop_triangles()
summary = {'room': args.room, 'blender': bpy.app.version_string, 'views': views,
           'triangles': sum(len(o.data.loop_triangles) for o in scene.objects if o.type == 'MESH'),
           'files': {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                     for p in [source, out / 'room.glb', *[out / name for name in posters]]}}
(out / 'export-report.json').write_text(json.dumps(summary, indent=2) + '\n')
print('HISTORY_EXPORT ' + json.dumps(summary))
