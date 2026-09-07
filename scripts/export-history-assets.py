"""Offline Blender authoring/export. blender -b --python scripts/export-history-assets.py -- --root . --room archive"""
import argparse
import hashlib
import json
import math
import random
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from history_asset_details import enrich, merge_material_groups

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--room', choices=['archive', 'ww1-field-station', 'ww2-radio-room', 'kingdom-court', 'market-port', 'rural-village'], required=True)
parser.add_argument('--input', type=Path, help='Re-export an edited blend instead of authoring.')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = args.root.resolve()
out = root / 'apps/web/public/history' / args.room
source = root / 'assets/history/source' / f'{args.room}.blend'
out.mkdir(parents=True, exist_ok=True)
source.parent.mkdir(parents=True, exist_ok=True)
random.seed(1941)
materials = {}


def material(name, color, texture='grain', metallic=0, roughness=.72):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    n = 256
    y, x = np.mgrid[0:n, 0:n] / n
    rng = np.random.default_rng(len(materials) + 35)
    noise = rng.random((n, n))
    if texture == 'grain':
        tone = .82 + .13 * np.sin(x * 180 + np.sin(y * 13) * 2) + noise * .08
    elif texture == 'paper':
        tone = .90 + noise * .1
        # Illustrative contour marks: no invented writing or geographic claims.
        contours = np.sin(x * 23 + np.cos(y * 13) * 3 + np.sin(x * 8))
        tone -= (np.abs(contours) < .08) * .18
    elif texture == 'fabric':
        tone = .8 + .08 * np.sin(x * 750) + .08 * np.cos(y * 750) + noise * .05
    else:
        tone = .88 + noise * .12
    pixels = np.ones((n, n, 4), dtype=np.float32)
    pixels[:, :, :3] = tone[:, :, None] * np.array(color)
    img = bpy.data.images.new(name + ' surface', width=n, height=n)
    img.pixels.foreach_set(pixels.ravel())
    img.pack()
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = img
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    materials[name] = mat
    return mat


def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def box(name, loc, size, mat, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Soft worn edges', 'BEVEL')
        mod.width, mod.segments = bevel, 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return finish(obj, name, mat)


def cylinder(name, loc, radius, depth, mat, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    return finish(bpy.context.object, name, mat)


def ring(name, loc, radius, tube, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=8, location=loc,
                                   major_radius=radius, minor_radius=tube, rotation=rot)
    return finish(bpy.context.object, name, mat)


def lamp(x, y, z):
    cylinder('Lamp foot', (x, y, z), .22, .07, brass)
    cylinder('Lamp stem', (x, y, z + .36), .025, .7, brass, 16)
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=.34, radius2=.18, depth=.3,
                                   location=(x, y, z + .7))
    finish(bpy.context.object, 'Patinated lamp shade', green)
    light('Warm practical', (x, y, z + .57), 65, (1, .63, .28), .25)


def light(name, loc, power, color, size, target=None):
    data = bpy.data.lights.new(name, 'AREA' if target else 'POINT')
    data.energy, data.color = power, color
    if target:
        data.shape, data.size = 'DISK', size
    else:
        data.shadow_soft_size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    if target:
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def table(x=0, y=0):
    box('Inlaid map table', (x, y, 1.25), (3.3, 1.9, .16), wood)
    box('Leather writing insert', (x, y, 1.34), (2.9, 1.52, .015), green, .01)
    for dx in [-1.35, 1.35]:
        for dy in [-.65, .65]:
            box('Tapered desk leg', (x + dx, y + dy, .6), (.13, .13, 1.2), wood)
            box('Brass leg shoe', (x + dx, y + dy, .12), (.15, .15, .13), brass)
    box('Blank contour study', (x - .28, y -.1, 1.365), (1.72, 1.12, .008), paper, 0)
    for dy in [-.65, .65]:
        box('Drawer apron', (x, y + dy, 1.06), (2.9, .1, .2), wood)
    lamp(x + 1.08, y + .45, 1.4)


def shelves(cx, cy, angle, width=1.85):
    origin = Vector((cx, cy, 0))
    def piece(name, local, size, mat):
        x, y, z = local
        loc = origin + Vector((x * math.cos(angle) - y * math.sin(angle),
                               x * math.sin(angle) + y * math.cos(angle), z))
        obj = box(name, loc, size, mat, 0 if name in ['Spine tooling', 'Cloth-bound volume'] else .012)
        obj.rotation_euler.z = angle
    piece('Cabinet backing', (0, .15, 1.9), (width, .12, 3.8), dark)
    for x in [-width / 2, width / 2]:
        piece('Library pilaster', (x, -.1, 1.95), (.12, .5, 3.9), wood)
    for z in [.22, 1.04, 1.88, 2.72, 3.56, 3.88]:
        piece('Shelf cornice', (0, -.05, z), (width + .13, .55, .09), wood)
    for level in range(4):
        x = -width / 2 + .15
        while x < width / 2 - .13:
            w = random.uniform(.075, .16)
            h = random.uniform(.39, .65)
            col = random.choice(books)
            piece('Cloth-bound volume', (x, -.16, .29 + level * .84 + h / 2), (w, .32, h), col)
            for dz in [.09, h - .09]:
                piece('Spine tooling', (x, -.328, .29 + level * .84 + dz), (w * .76, .008, .009), brass)
            x += w + .023


def archive():
    for i in range(26):
        box('Oak floorboard', (-5.1 + i * .4, .6, -.05), (.39, 11.5, .1), wood, .005)
    cylinder('Archive rug', (0, .4, .018), 2.9, .02, green, 96)
    for radius in [2.63, 2.76]:
        ring('Rug border', (0, .4, .034), radius, .015, brass)
    for x, y, a in [(-3.65, 1.3, math.pi / 2), (-3.15, 3, .75), (-1.5, 3.8, 0),
                     (.5, 3.8, 0), (2.5, 3.5, -.4), (3.6, 2, -1.1)]:
        shelves(x, y, a)
    box('Plaster backdrop', (0, 4.2, 2.7), (10, .18, 5.5), plaster)
    for x in [-4.6, 4.6]:
        box('Side wall', (x, 1.6, 2.7), (.18, 5.4, 5.5), plaster)
    # High clerestory window creates a recognisable luminous architectural focus.
    box('Window recess', (0, 4.08, 4.63), (3.3, .13, 1.5), dark)
    box('Frosted daylight', (0, 3.99, 4.63), (3.1, .035, 1.35), glass)
    for x in [-1.55, -.78, 0, .78, 1.55]:
        box('Window mullion', (x, 3.94, 4.63), (.045, .1, 1.48), brass)
    table(0, -.25)
    # Armillary instrument: intersecting rings and polar spindle, not a sphere proxy.
    cylinder('Armillary plinth', (-2.2, 1, .42), .4, .82, wood)
    cylinder('Instrument foot', (-2.2, 1, .9), .32, .09, brass)
    cylinder('Instrument column', (-2.2, 1, 1.15), .055, .45, brass)
    for rot in [(0, 0, 0), (math.pi / 2, 0, 0), (math.pi / 2, .45, .4)]:
        ring('Armillary celestial ring', (-2.2, 1, 1.72), .46, .019, brass, rot)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=.11, location=(-2.2, 1, 1.72))
    finish(bpy.context.object, 'Armillary central sphere', brass)
    light('Clerestory daylight', (0, 3, 5.3), 1300, (.72, .85, 1), 4, (0, 0, 0))


def field_station():
    earth = material('Packed earth', (.22, .19, .13), 'noise')
    canvas = material('Weathered canvas', (.40, .37, .23), 'fabric')
    iron = material('Blackened iron', (.07, .08, .07), 'noise', .45)
    ruin = material('Weathered masonry', (.25, .27, .25), 'noise')
    box('Earth foundation', (0, .7, -.15), (9, 8, .3), earth)
    for i in range(19):
        box('Duckboard', (-3.8 + i * .42, .2, .03), (.39, 6.6, .08), wood, .005)
    for z in range(15):
        box('Back retaining board', (0, 3.3, .15 + z * .23), (8.4, .12, .21), wood, .005)
        box('Side retaining board', (-4.1, .7, .15 + z * .23), (.12, 5.3, .21), wood, .005)
    for x in [-4, -2, 0, 2, 4]:
        box('Shelter upright', (x, 3.05, 1.85), (.19, .22, 3.7), dark)
    box('Shelter crossbeam', (0, 3, 3.65), (8.5, .3, .25), dark)
    for row in range(2):
        for col in range(12):
            box('Sandbag parapet', (-3.7 + col * .66 + row * .16, 3.3, 3.6 + row * .28),
                (.64, .44, .29), canvas, .12)
    table(0, .3)
    box('Field telephone case', (-1.02, .6, 1.57), (.62, .42, .42), wood)
    box('Telephone top', (-1.02, .6, 1.80), (.65, .44, .035), iron)
    box('Receiver bridge', (-1.02, .6, 1.92), (.57, .10, .09), iron)
    for x in [-1.27, -.77]:
        cylinder('Receiver earpiece', (x, .6, 1.85), .10, .1, iron, 24)
    for i in range(15):
        ring('Telephone cord coil', (-1.36, .39, 1.44 + i * .025), .038, .008, iron)
    for z in [.25, 1.05, 1.85]:
        box('Supply shelf', (2.8, 2.35, z), (1.65, .7, .08), wood)
        for x in [2.25, 2.8, 3.35]:
            box('Canvas supply parcel', (x, 2.35, z + .23), (.43, .45, .38), canvas, .05)
    for x in [1.95, 3.65]:
        box('Supply rack post', (x, 2.5, 1.15), (.09, .1, 2.3), dark)
    box('Distant ruined masonry', (1.08, 3.0, 1.65), (.72, .28, 1.6), ruin)
    box('Ruin wall fragment', (1.92, 3.0, 1.35), (.56, .28, 1.1), ruin)
    box('Broken masonry cap', (1.5, 2.96, 2.5), (1.55, .4, .16), ruin)
    box('Rubble at ruined wall', (1.5, 2.7, .42), (1.65, .55, .4), ruin, .08)
    box('Dispatch board', (-2.5, 3.12, 2.1), (1.65, .06, 1.0), dark)
    for x in [-2.95, -2.4]:
        box('Illustrative blank notice', (x, 3.07, 2.12), (.42, .015, .65), paper, 0)
    light('Overcast shelter opening', (-2, -1, 5), 1000, (.70, .79, .87), 5, (0, 2, 0))


def radio_room():
    curtain = material('Blackout wool', (.075, .09, .095), 'fabric')
    upholstery = material('Ochre upholstery', (.39, .25, .12), 'fabric')
    speaker = material('Woven speaker cloth', (.42, .34, .22), 'fabric')
    for i in range(23):
        box('Domestic floorboard', (-4.4 + i * .4, .5, -.05), (.39, 8, .1), wood, .005)
    box('Wallpaper back wall', (0, 3.5, 2.4), (9, .15, 4.8), plaster)
    box('Wallpaper side wall', (-4.45, .8, 2.4), (.15, 5.4, 4.8), plaster)
    for z in [.18, 1.0, 4.45]:
        box('Back picture rail', (0, 3.39, z), (8.8, .07, .09), wood)
    box('Rectangular woven carpet', (0, .25, .025), (5.9, 4.5, .04), green)
    box('Window frame', (-2.5, 3.32, 2.65), (2.25, .12, 2.35), dark)
    box('Covered window', (-2.5, 3.22, 2.65), (2.02, .03, 2.12), glass)
    for i in range(22):
        box('Blackout curtain fold', (-3.55 + i * .10, 3.08 + .055 * math.sin(i * 2), 2.6),
            (.13, .11, 2.45), curtain, .04)
    box('Curtain pelmet', (-2.5, 3.0, 3.88), (2.4, .25, .18), wood)
    table(0, 1.2)
    box('Walnut radio cabinet', (0, 1.35, 1.97), (1.55, .55, 1.15), wood, .16)
    box('Radio cloth grille', (0, 1.058, 2.12), (1.24, .025, .60), speaker, .05)
    for x in [-.5, -.25, 0, .25, .5]:
        box('Radio grille rib', (x, 1.025, 2.12), (.035, .035, .62), dark)
    box('Unmarked tuning window', (0, 1.047, 1.69), (.58, .02, .13), paper)
    for x in [-.54, .54]:
        knob = cylinder('Tuning knob', (x, 1.0, 1.69), .085, .07, brass, 24)
        knob.rotation_euler.x = math.pi / 2
    shelves(2.85, 3.0, 0, 1.75)
    for x in [-2.4, 2.4]:
        box('Armchair cushion', (x, -.85, .64), (1.0, 1.0, .26), upholstery, .10)
        box('Armchair back', (x, -.39, 1.12), (1.05, .18, 1.15), upholstery, .08)
        for dx in [-.53, .53]:
            box('Armchair arm', (x + dx, -.8, .93), (.18, 1.03, .17), wood)
            for dy in [-1.2, -.4]:
                box('Armchair leg', (x + dx, dy, .36), (.09, .09, .65), wood)
    light('Domestic lamplight', (0, 1, 3.8), 400, (1, .68, .36), 3, (0, 0, 0))


def kingdom_court():
    stone = material('Warm courtyard stone', (.39, .31, .22), 'noise')
    crimson = material('Ceremonial red cloth', (.39, .055, .035), 'fabric')
    for row in range(15):
        for col in range(13):
            box('Courtyard paving', (-4.8 + col * .8, -1.8 + row * .55, -.07),
                (.76, .51, .12), stone, .012)
    box('Raised ceremonial platform', (0, 2.15, .34), (4.6, 2.15, .65), stone, .035)
    for x in [-1.65, -1.1, -.55, 0, .55, 1.1, 1.65]:
        box('Platform step', (x, 1.05, .10), (.5, .95, .20), stone, .02)
    for x in [-2.0, 2.0]:
        cylinder('Ceremonial column', (x, 2.65, 2.1), .20, 3.2, wood, 32)
        cylinder('Column capital', (x, 2.65, 3.72), .34, .18, brass, 32)
    box('Ceremonial seat back', (0, 2.75, 2.05), (1.45, .22, 2.1), wood, .10)
    box('Ceremonial seat cushion', (0, 2.2, 1.18), (1.3, 1.0, .18), crimson, .06)
    for x in [-.58, .58]:
        box('Ceremonial seat arm', (x, 2.32, 1.62), (.16, .74, .78), wood, .05)
    ring('Ceremonial seat halo', (0, 2.60, 2.75), .46, .035, brass, (math.pi / 2, 0, 0))
    table(-.9, -.1)
    box('Open courtyard backdrop', (0, 4.65, 2.7), (10, .16, 5.4), plaster)
    for x in [-3.85, 3.85]:
        cylinder('Gate tower', (x, 3.85, 1.75), .72, 3.5, stone, 32)
        box('Gate tower cap', (x, 3.85, 3.58), (1.6, 1.5, .22), wood, .05)
    box('Courtyard gate lintel', (0, 4.0, 3.35), (5.7, .5, .40), wood, .04)
    for x in [-2.45, 2.45]:
        cylinder('Gate post', (x, 3.92, 1.65), .18, 3.3, wood, 24)
    for x in [-1.95, 1.95]:
        box('Illustrative hanging banner', (x, 3.68, 2.55), (.82, .05, 1.45), crimson, .015)
    light('Courtyard daylight', (0, -1.5, 6.7), 1500, (1, .79, .52), 5, (0, 2, 0))


def market_port():
    sea = material('Harbor water', (.035, .15, .16), 'noise', .1, .28)
    canvas = material('Sailing canvas', (.47, .42, .31), 'fabric')
    shore = material('Sandy shore', (.40, .35, .23), 'noise')
    sky = material('Open sky daylight', (.47, .66, .92), 'noise', .05, .95)
    sky.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value = (.44, .64, .92, 1)
    sky.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = 1.2
    box('Harbor water', (0, .5, -.3), (13, 13, .5), sea, 0)
    box('Sandy shore bank', (0, 4.4, -.1), (11, 3.2, .6), shore, .02)
    # Pier deck: planks over posts, named for the dock inspection object.
    box('Dermaga', (0, .7, .2), (3.4, 6.8, .22), wood, .01)
    for i in range(8):
        box('Dermaga', (-1.35 + i * .385, .7, .315), (.32, 6.5, .035), wood, .004)
    for x in [-1.45, 0, 1.45]:
        for y in [-1.9, .7, 3.2]:
            cylinder('Dermaga', (x, y, -.95), .09, 2.2, dark, 12)
    for x in [-1.62, 1.62]:
        box('Dermaga', (x, .7, .68), (.08, 6.6, .12), dark)
        for y in [-2.2, -.6, 1.0, 2.6, 3.9]:
            cylinder('Dermaga', (x, y, .5), .04, .4, dark, 10)
    # Three market stalls under canvas awnings, named for the market inspection object.
    def stall(x, y, facing):
        box('Lapak pasar', (x, y, .78), (.95, .5, .95), wood, .05)
        box('Lapak pasar', (x, y, 1.18), (.55, .2, .18), canvas, .04)
        for dx in [-.4, .4]:
            cylinder('Lapak pasar', (x + dx, y, 1.45), .05, 1.05, dark, 12)
        awning = box('Lapak pasar', (x, y + facing * .13, 1.78), (1.2, 1.0, .07), canvas, .03)
        awning.rotation_euler.x = facing * .14
        for dx in [-.5, 0, .5]:
            box('Lapak pasar', (x + dx * .7, y, 1.36), (.17, .2, .16), green, .04)
    stall(0, 2.9, 1)
    stall(-1.1, 1.7, 1)
    stall(1.2, 2.1, -1)
    # Moored trading ship with mast and furled sail.
    box('Moored ship hull', (2.7, -.5, .28), (1.7, 4.6, 1.1), wood, .05)
    box('Ship gunwale trim', (2.7, -.5, .78), (1.86, 4.7, .08), dark, .03)
    box('Ship deck', (2.7, -.5, .9), (1.3, 3.6, .06), wood, .01)
    cylinder('Ship mast', (2.7, -.5, 1.75), .07, 2.0, dark, 12)
    yard = cylinder('Ship yard', (2.7, -.5, 2.1), .05, 1.2, dark, 12)
    yard.rotation_euler.z = math.pi / 2
    furled = cylinder('Furled sail', (2.7, -.5, 1.95), .24, 1.0, canvas, 16)
    furled.rotation_euler.x = math.pi / 2
    # Stacked cargo at the dock edge, named for the cargo inspection object.
    box('Muatan kapal', (.6, -1.7, .55), (.62, .62, .55), wood, .04)
    box('Muatan kapal', (-.15, -2.2, .55), (.62, .62, .55), wood, .04)
    box('Muatan kapal', (.95, -1.6, .52), (.44, .52, .36), canvas, .06)
    box('Muatan kapal', (.95, -1.6, .9), (.4, .48, .3), canvas, .06)
    cylinder('Muatan kapal', (-.5, -1.6, .58), .2, .5, green, 16)
    cylinder('Muatan kapal', (-.95, -1.9, .58), .18, .46, brass, 16)
    box('Distant shore', (0, 5.4, .5), (14, 1.1, 2.6), shore, .05)
    box('Open sky backdrop', (0, 5.6, 3.8), (15, .2, 8), sky, 0)
    box('Open sky canopy', (0, 6.9, 5.2), (15, 7.4, .2), sky, 0)
    light('Harbor sunlight', (2, -4, 7), 1900, (1, .82, .58), 6, (0, 1, 1))


def rural_village():
    soil = material('Field soil', (.28, .21, .11), 'noise')
    paddy = material('Young paddy green', (.13, .33, .15), 'noise')
    paddy_water = material('Paddy water tone', (.18, .29, .24), 'noise', 0, .55)
    granary = material('Granary timber', (.46, .33, .15), 'grain')
    channel = material('Irrigation earth', (.34, .27, .15), 'noise')
    sky = material('Open sky daylight', (.47, .66, .92), 'noise', .05, .95)
    sky.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value = (.44, .64, .92, 1)
    sky.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = 1.2
    box('Village ground', (0, 0, -.08), (14.5, 14.5, .25), soil, 0)
    # Bund paths frame the west paddy band.
    for yp in [-4.6, -2.4, -.2, 2.0, 4.2]:
        box('Field bund path', (-3.6, yp, .02), (1.5, .45, .12), soil, .02)
    # Sawah terraces: raised basins with water and young rice; inspection group 'Sawah'.
    terrace = 0
    for xo in [-5.6, -4.3]:
        for yo in [-.6, 1.3, 3.2]:
            box('Sawah basin bed', (xo, yo, .05), (1.5, 1.35, .22), soil, .02)
            terrace += 1
            box('Sawah', (xo, yo, .18), (1.12, 1.05, .05), paddy_water, .01)
            for ry in range(4):
                for rx in range(5):
                    cx = xo - .45 + rx * .22
                    cz = .36 + (rx + ry) % 2 * .04
                    cylinder('Sawah', (cx, yo - .4 + ry * .28, cz), .016, .3, paddy, 8)
    # Swaying paddy tufts near the enrich pivot stay on the ambient_prop group.
    for dy, dx in [(0, 0), (.5, .25), (-.5, -.2), (.3, -.5), (-.3, .4)]:
        cylinder('Paddy tuft', (-4.5 + dx, 2.6 + dy, .34), .02, .5, paddy, 8)
    # Granary on posts with a gabled roof; inspection group 'Lumbung padi'.
    for dx in [-.85, .85]:
        for dy in [-.65, .65]:
            box('Lumbung padi', (-3.2 + dx, 4.0 + dy, 1.25), (.18, .18, 2.5), granary, .02)
    box('Lumbung padi', (-3.2, 4.0, 2.75), (2.3, 1.9, .14), granary, .03)
    box('Lumbung padi', (-3.2, 4.48, 3.35), (2.2, .12, 1.05), granary, .02)
    box('Lumbung padi', (-3.2, 3.52, 3.35), (2.2, .12, 1.05), granary, .02)
    for sx in [-2.42, -1.98, 1.98, 2.42]:
        box('Lumbung padi', (-3.2 + sx * .45, 4.0, 3.3), (.12, 1.9, 1.0), granary, .02)
    roof_low = box('Lumbung padi', (-3.2, 3.6, 4.05), (2.7, 1.7, .12), granary, .03)
    roof_low.rotation_euler.x = -.42
    roof_high = box('Lumbung padi', (-3.2, 4.4, 4.05), (2.7, 1.7, .12), granary, .03)
    roof_high.rotation_euler.x = .42
    for cx in [-3.9, -2.5]:
        box('Lumbung padi', (cx, 4.0, 4.35), (.18, .14, .5), granary, .02)
    # Irrigation channel with a sluice gate; inspection group 'Saluran irigasi'.
    box('Saluran irigasi', (3.8, -3.9, .28), (3.6, .8, .4), channel, .03)
    box('Saluran irigasi', (3.8, -2.9, .28), (3.6, .8, .4), channel, .03)
    box('Saluran irigasi', (2.1, -3.4, .18), (.5, 1.5, .22), channel, .02)
    box('Saluran irigasi', (5.5, -3.4, .18), (.5, 1.5, .22), channel, .02)
    box('Saluran irigasi', (3.8, -3.4, .3), (2.5, .5, .16), paddy_water, .01)
    for gx in [3.0, 3.6]:
        box('Saluran irigasi', (gx, -3.4, .78), (.24, .8, .7), granary, .02)
    box('Saluran irigasi', (3.3, -3.4, .98), (1.1, .3, .3), granary, .02)
    # Trees and sky frame the open-air setting.
    for tx, ty in [(-1.2, -4.6), (5.2, 2.8), (-6.0, 3.6)]:
        cylinder('Village tree trunk', (tx, ty, .8), .16, 1.6, wood, 10)
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=.95, radius2=.2,
                                        depth=2.1, location=(tx, ty, 2.2))
        finish(bpy.context.object, 'Village tree crown', green)
    box('Distant tree line', (-6.4, 3.2, 2.0), (1.6, 6.5, 3.4), green, .05)
    box('Open sky backdrop', (0, 5.8, 4.0), (15, .2, 8), sky, 0)
    box('Open sky canopy', (0, 7.0, 6.4), (15, 8, .2), sky, 0)
    light('Village morning light', (3, -4, 6), 1700, (1, .80, .55), 6, (0, 1, 1))


if args.input:
    bpy.ops.wm.open_mainfile(filepath=str(args.input.resolve()))
else:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    wood = material('Oiled walnut', (.30, .17, .085))
    dark = material('Recessed walnut', (.08, .045, .025))
    brass = material('Aged brass', (.62, .42, .16), 'noise', .65, .37)
    green = material('Bottle green linen', (.085, .19, .16), 'fabric')
    paper = material('Illustrative parchment', (.76, .66, .44), 'paper')
    plaster = material('Lime plaster', (.50, .48, .39), 'noise')
    glass = material('Window light', (.6, .78, .85), 'noise')
    glass.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value = (.55, .75, 1, 1)
    glass.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = 1.5
    books = [material('Binding ' + str(i), c, 'fabric') for i, c in enumerate([
        (.29, .09, .055), (.13, .22, .18), (.28, .22, .12), (.12, .15, .20)])]
    {'archive': archive, 'ww1-field-station': field_station, 'ww2-radio-room': radio_room,
     'kingdom-court': kingdom_court, 'market-port': market_port,
     'rural-village': rural_village}[args.room]()
    enrich(args.room, box, cylinder, finish, material, wood, paper)
    light('Soft afternoon key', (2, -4, 7), 1800, (1, .80, .57), 6, (0, 1, 1))
    light('Cool fill', (-4, -2, 4), 700, (.58, .72, 1), 5, (0, 1, 1))
    bpy.ops.object.camera_add(location=(7, -10, 6))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((0, 1, 1.6)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.lens = 42
    bpy.context.scene.camera = camera
    # Merge by material: preserve named source objects in the blend, export bounded draw calls.
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
scene.render.filepath = str(out / 'poster.webp')
bpy.ops.wm.save_as_mainfile(filepath=str(source), compress=False)
bpy.ops.render.render(write_still=True)
detail_position, detail_target = {
    'archive': ((6, -9, 5), (-.6, 1, 1.6)),
    'ww1-field-station': ((5.5, -9, 4.7), (-.5, 1, 1.5)),
    'ww2-radio-room': ((5, -9, 4.5), (0, 1.2, 1.5)),
    'kingdom-court': ((6, -10, 4.8), (-.6, 1, 1.6)),
    'market-port': ((7, -11, 4.2), (-.5, 2, 1.2)),
    'rural-village': ((8, -11, 5.4), (-.4, 1, 1.1)),
}[args.room]
scene.camera.location = detail_position
scene.camera.rotation_euler = (Vector(detail_target) - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.render.filepath = str(out / 'poster-detail.webp')
bpy.ops.render.render(write_still=True)
merge_material_groups(scene)
bpy.ops.export_scene.gltf(filepath=str(out / 'room.glb'), export_format='GLB',
                          export_cameras=False, export_lights=False, export_apply=True,
                          export_yup=True, export_image_format='JPEG', export_jpeg_quality=82)
for obj in scene.objects:
    if obj.type == 'MESH':
        obj.data.calc_loop_triangles()
summary = {'room': args.room, 'blender': bpy.app.version_string,
           'triangles': sum(len(o.data.loop_triangles) for o in scene.objects if o.type == 'MESH'),
           'files': {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                     for p in [source, out / 'room.glb', out / 'poster.webp', out / 'poster-detail.webp']}}
(out / 'export-report.json').write_text(json.dumps(summary, indent=2) + '\n')
print('HISTORY_EXPORT ' + json.dumps(summary))
