"""Authored illustrative room builders; coordinates are Blender Z-up."""
import math

import bpy
from history_scene_primitives import (
    box, cylinder, ring, finish, light, material, table, shelves, create_palette,
)


def initialize_materials():
    globals().update(create_palette())


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
    for x in [-.53, .53]:
        for y in [1.85, 2.65]:
            box('Ceremonial seat leg', (x, y, .88), (.14, .14, .6), wood, .015)
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
    # Connected cross sections taper to a bow and stern without stepped blocks.
    vertices = []
    for y, width in [(-2.8, .12), (-2.1, 1.2), (-1.1, 1.7), (.4, 1.7), (1.5, 1.1), (1.9, .12)]:
        vertices.extend([(2.7 - width / 2, y, .83), (2.7 + width / 2, y, .83),
                         (2.7 + width * .3, y, -.2), (2.7 - width * .3, y, -.2)])
    faces = [(3, 2, 1, 0), (20, 21, 22, 23)]
    for section in range(5):
        for side in range(4):
            a = section * 4 + side
            b = section * 4 + (side + 1) % 4
            faces.append((a, b, b + 4, a + 4))
    mesh = bpy.data.meshes.new('Tapered vessel hull')
    mesh.from_pydata(vertices, [], faces)
    uv = mesh.uv_layers.new(name='Hull grain')
    for loop in mesh.loops:
        point = mesh.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (point.y / 4.7, point.z)
    hull = bpy.data.objects.new('Moored ship hull', mesh)
    bpy.context.collection.objects.link(hull)
    finish(hull, 'Moored ship hull', wood)
    box('Ship deck', (2.7, -.5, .9), (1.3, 3.6, .06), wood, .01)
    cylinder('Ship mast', (2.7, -.5, 1.75), .07, 2.0, dark, 12)
    yard = cylinder('Ship yard', (2.7, -.5, 2.1), .05, 1.2, dark, 12)
    yard.rotation_euler.y = math.pi / 2
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
            box('Sawah basin bed', (xo, yo, .05), (1.24, 1.35, .22), soil, .02)
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
            box('Lumbung padi', (-3.2 + dx, 4.0 + dy, 1.375), (.18, .18, 2.75), granary, .02)
    box('Lumbung padi', (-3.2, 4.0, 2.75), (2.3, 1.9, .14), granary, .03)
    box('Lumbung padi', (-3.2, 4.48, 3.35), (2.2, .12, 1.05), granary, .02)
    box('Lumbung padi', (-3.2, 3.52, 3.35), (2.2, .12, 1.05), granary, .02)
    for sx in [-2.42, -1.98, 1.98, 2.42]:
        box('Lumbung padi', (-3.2 + sx * .45, 4.0, 3.3), (.12, 1.9, 1.0), granary, .02)
    roof_low = box('Lumbung padi', (-3.2, 3.6, 4.05), (2.7, 1.7, .12), granary, .03)
    roof_low.rotation_euler.x = .42
    roof_high = box('Lumbung padi', (-3.2, 4.4, 4.05), (2.7, 1.7, .12), granary, .03)
    roof_high.rotation_euler.x = -.42
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
    box('Saluran irigasi', (3.3, -3.4, 1.23), (1.1, .3, .3), granary, .02)
    # Trees and sky frame the open-air setting.
    for tx, ty in [(-1.2, -4.6), (5.2, 2.8), (-6.0, 3.6)]:
        cylinder('Village tree trunk', (tx, ty, .8), .16, 1.6, wood, 10)
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=.95, radius2=.2,
                                        depth=2.1, location=(tx, ty, 2.2))
        finish(bpy.context.object, 'Village tree crown', green)
    for y in [.5, 2.2, 4.0]:
        cylinder('Distant tree trunk', (-6.4, y, .7), .13, 1.4, wood, 10)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.25, location=(-6.4, y, 2.1))
        finish(bpy.context.object, 'Distant tree crown', green)
    box('Open sky backdrop', (0, 5.8, 4.0), (15, .2, 8), sky, 0)
    box('Open sky canopy', (0, 7.0, 6.4), (15, 8, .2), sky, 0)
    light('Village morning light', (3, -4, 6), 1700, (1, .80, .55), 6, (0, 1, 1))


def resistance_outpost():
    soil = material('Clearing soil', (.30, .25, .15), 'noise')
    timber = material('Rough palisade timber', (.33, .22, .10), 'grain')
    thatch = material('Dry grass thatch', (.37, .31, .14), 'fabric')
    foliage = material('Dense forest green', (.08, .17, .10), 'noise')
    sky = material('Open sky daylight', (.47, .66, .92), 'noise', .05, .95)
    sky.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value = (.44, .64, .92, 1)
    sky.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = 1.2
    box('Clearing ground', (0, 0, -.1), (16, 16, .2), soil, 0)
    # Bamboo-timber palisade line along the back of the clearing; inspection group 'Pagar bambu'.
    palisade_y = 4.0
    for i in range(27):
        px = -6.5 + i * .5
        tilt = .12 * math.sin(i * .9)
        post = box('Pagar bambu', (px, palisade_y - tilt, 1.0), (.3, .22, 2.0), timber, .03)
        post.rotation_euler.z = tilt * .4
        for j in range(2):
            cylinder('Pagar bambu', (px, palisade_y - tilt + .25 + j * .5, .7 + j), .045, 2.2, timber, 10)
    for xr in [-6.2, -4.6, -3.0, -1.4, .2, 1.8, 3.4, 5.0, 6.2]:
        for zr in [.45, 1.75]:
            box('Pagar bambu', (xr, palisade_y - .18, zr), (1.65, .16, .12), timber, .015)
    # Gap opening in the middle of the palisade line, framed by two sturdy gate posts.
    for gx in [-.9, .9]:
        cylinder('Pagar bambu', (gx, palisade_y + .1, 1.15), .13, 2.3, timber, 14)
        for z in [.5, 1.8]:
            box('Pagar bambu', (gx, palisade_y - .35, z), (.14, .5, .1), timber, .01)
    # Raised bamboo watch post; inspection group 'Menara jaga'.
    watch_x, watch_y = -4.2, .4
    for dx in [-.6, .6]:
        for dy in [-.6, .6]:
            cylinder('Menara jaga', (watch_x + dx, watch_y + dy, 1.35), .09, 2.7, timber, 12)
            cylinder('Menara jaga', (watch_x + dx, watch_y + dy, 2.9), .12, .16, dark, 12)
    box('Menara jaga', (watch_x, watch_y, 2.55), (1.5, 1.5, .14), timber, .02)
    for dx in [-.55, .55]:
        for dy in [-.55, .55]:
            for z in [2.72, 3.3]:
                cylinder('Menara jaga', (watch_x + dx, watch_y + dy, z), .05, .5, timber, 10)
    for dy in [-.55, .55]:
        box('Menara jaga', (watch_x, watch_y + dy, 3.05), (1.35, .09, .09), dark, .01)
    for dx in [-.55, .55]:
        box('Menara jaga', (watch_x + dx, watch_y, 3.05), (.09, 1.35, .09), dark, .01)
    for dz in [2.0, 2.2]:
        box('Menara jaga', (watch_x + .7, watch_y, dz), (.09, 1.1, .09), dark, .01)
    roof = box('Menara jaga', (watch_x, watch_y, 3.62), (1.7, 1.7, .12), thatch, .03)
    roof.rotation_euler.x = .1
    # Lean-to shelter between the signal fire and the palisade, roofed with dry grass.
    for px in [-1.1, 1.1]:
        cylinder('Lean-to post', (px, 2.5, 1.0), .07, 2.0, timber, 10)
    for px in [-1.1, 1.1]:
        cylinder('Lean-to brace', (px, 3.7, .7), .06, 1.4, timber, 10)
    for z in [1.4, 1.9]:
        roof_slope = box('Lean-to roof', (0, 3.15, z), (2.8, 1.5, .1), thatch, .02)
        roof_slope.rotation_euler.x = -.32
    # Low signal fire; inspection group 'Api isyarat'.
    for dx, dy in [(-.5, -.5), (.5, -.5), (-.5, .5), (.5, .5), (0, .72), (0, -.72), (-.72, 0), (.72, 0)]:
        box('Api isyarat', (dx, dy + 1.2, .12), (.3, .3, .24), dark, .05)
    for i, ang in enumerate([.4, 1.4, 2.4]):
        log = box('Api isyarat', (math.sin(ang) * .3, math.cos(ang) * .3 + 1.2, .42),
                  (1.1, .12, .12), dark, .05)
        log.rotation_euler.z = ang
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=.16, radius2=.05, depth=.6,
                                    location=(0, 1.2, .95))
    finish(bpy.context.object, 'Api isyarat', brass)
    # Woven storage baskets beside the lean-to.
    for i, bs in enumerate([.46, .58, .4]):
        bx = 1.8 + i * .75
        basket = cylinder('Storage basket', (bx, 3.1, .42), bs, .8, thatch, 20)
        basket.scale.z = .6
        cylinder('Storage basket', (bx, 3.1, .85), bs * .9, .16, green, 20)
    # Grass tufts at the clearing edge form the swaying ambient prop.
    for gx, gy in [(-2.9, 1.4), (-2.5, .9), (-2.1, 1.2), (-2.7, .5), (-1.7, .8), (-2.3, 1.7)]:
        cylinder('Grass tuft', (gx, gy, .12), .03, .5, green, 8)
    # Forest fringe and a sky backdrop bound the clearing.
    for x in [-6.4, 6.4]:
        for y in [2.4, 3.8, 5.2]:
            cylinder('Forest fringe trunk', (x, y, .9), .15, 1.8, wood, 10)
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.1, location=(x, y, 2.5))
            crown = finish(bpy.context.object, 'Forest fringe crown', foliage)
            crown.scale = (1, .9, 1.6)
    for tx, ty in [(-5.4, 2.6), (5.6, 2.4)]:
        cylinder('Forest trunk', (tx, ty, .6), .16, 1.2, wood, 10)
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=.9, radius2=.15,
                                        depth=2.2, location=(tx, ty, 2.1))
        finish(bpy.context.object, 'Forest crown', foliage)
    box('Open sky backdrop', (0, 6.6, 4.6), (15.5, .2, 9.2), sky, 0)
    box('Open sky canopy', (0, 7.4, 7.0), (15.5, 9.4, .2), sky, 0)
    light('Clearing warm light', (0, 1.2, 2.2), 260, (1, .56, .2), 2, (0, 1.2, .6))


def ancient_library():
    # Three inspection anchors at the runtime scroll, instrument and shelf targets.
    for i in range(24):
        box('Library stone paving', (-4.6 + i * .4, .8, -.06),
            (.38, 9, .12), plaster, .008)
    box('Library rear wall', (0, 4.2, 2.8), (10, .18, 5.6), plaster)
    box('Library shaded side', (-4.8, 1.5, 2.8), (.18, 5.4, 5.6), plaster)
    table(0, 1)
    for x in [-.7, .45]:
        scroll = cylinder('Scroll table rolled parchment', (x, 1, 1.43), .085, .85, paper, 16)
        scroll.rotation_euler.y = math.pi / 2
        for dx in [-.46, .46]:
            end = cylinder('Scroll table spindle', (x + dx, 1, 1.43), .025, .14, wood, 12)
            end.rotation_euler.y = math.pi / 2
    cylinder('Astrolabe plinth', (-1.5, 1.5, .65), .28, 1.3, wood, 24)
    cylinder('Astrolabe support', (-1.5, 1.5, 1.5), .035, .45, brass, 12)
    for radius in [.34, .43]:
        ring('Astrolabe rotating ring', (-1.5, 1.5, 1.8), radius, .018,
             brass, (math.pi / 2, 0, 0))
    pointer = box('Astrolabe rotating pointer', (-1.5, 1.48, 1.8), (.72, .03, .025), brass, 0)
    pointer.rotation_euler.y = .45
    for x in [-3, -.9, 1.2, 3.2]:
        shelves(x, 3.55, 0, 1.6)
    # Shelf bay beside the third inspection target carries scrolls, not writing.
    for z in [.65, 1.5, 2.35]:
        box('Manuscript shelf ledge', (3, 2.5, z), (1.65, .65, .09), wood)
        for x in [2.4, 2.7, 3, 3.3, 3.6]:
            scroll = cylinder('Manuscript shelf scroll', (x, 2.5, z + .14), .10, .48, paper, 12)
            scroll.rotation_euler.x = math.pi / 2
    for x in [2.15, 3.85]:
        box('Manuscript shelf upright', (x, 2.5, 1.5), (.10, .65, 3), dark)
    box('Library clerestory recess', (0, 4.05, 4.8), (3.6, .1, 1.1), dark)
    box('Library clerestory light', (0, 3.98, 4.8), (3.4, .035, .95), glass)
    for x in [-1.6, -.8, 0, .8, 1.6]:
        box('Library window divider', (x, 3.92, 4.8), (.055, .08, 1), wood)
    light('Library window wash', (0, 3.3, 5.1), 1000, (.75, .85, 1), 3, (0, 1, 1))


ROOM_BUILDERS = {
    'archive': archive,
    'ww1-field-station': field_station,
    'ww2-radio-room': radio_room,
    'kingdom-court': kingdom_court,
    'market-port': market_port,
    'rural-village': rural_village,
    'resistance-outpost': resistance_outpost,
    'ancient-library': ancient_library,
}
