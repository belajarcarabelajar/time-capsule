"""Small authored details using the existing palette and bounded geometry."""
import math

import bpy
from history_scene_primitives import box, cylinder, ring, finish, materials


def enrich_surfaces(room):
    wood = materials['Oiled walnut']
    dark = materials['Recessed walnut']
    brass = materials['Aged brass']
    paper = materials['Illustrative parchment']
    green = materials['Bottle green linen']
    if room in ('archive', 'ancient-library'):
        for x in ([-4.3] if room == 'ancient-library' else [-4.3, 4.3]):
            for z in [.25, 4.05]:
                box('Library perimeter moulding', (x, 1.4, z), (.13, 5.3, .12), wood)
        for x in [-3.7, -1.6, .5, 2.6]:
            box('Library carved cornice', (x, 3.35, 4.0), (1.8, .28, .14), wood)
            for dx in [-.55, 0, .55]:
                box('Library cornice dentil', (x + dx, 3.2, 3.91), (.13, .13, .18), brass, .006)
        for i in range(3):
            book = box('Closed reference folio', (.5, .15, 1.41 + i * .075),
                       (.48, .65, .065), green if i % 2 else wood, .008)
            book.rotation_euler.z = i * .09
        cylinder('Writing ink pot', (-.95, .45, 1.45), .07, .14, dark, 16)
        ring('Writing ink pot rim', (-.95, .45, 1.53), .06, .012, brass)
        if room == 'ancient-library':
            cylinder('Library reading rug', (0, 1, .018), 2.65, .025, green, 64)
            ring('Library rug border', (0, 1, .034), 2.45, .014, brass)
    elif room == 'ww1-field-station':
        for x in [2.25, 2.8, 3.35]:
            for z in [.48, 1.28, 2.08]:
                box('Parcel tie vertical', (x, 2.116, z), (.025, .015, .38), dark, 0)
                box('Parcel tie horizontal', (x, 2.105, z), (.43, .02, .025), dark, 0)
        for x in [-3.9, -2, 0, 2, 3.9]:
            for z in [.5, 1.7, 2.9]:
                pin = cylinder('Retaining wall peg', (x, 2.91, z), .04, .06, brass, 8)
                pin.rotation_euler.x = math.pi / 2
        for i in range(4):
            box('Dispatch envelope stack', (.55, .5, 1.39 + i * .016), (.65, .45, .012), paper, 0)
    elif room == 'ww2-radio-room':
        for x in [-3.85, 3.85]:
            box('Wall picture frame', (x, 3.35, 2.7), (.65, .08, .85), wood)
            box('Unmarked framed fabric', (x, 3.30, 2.7), (.5, .025, .68), green)
        for x in [-.23, -.12, 0, .12, .23]:
            box('Radio tuning tick', (x, 1.03, 1.69), (.012, .014, .07), dark, 0)
        for x in [-2.4, 2.4]:
            for dx in [-.3, 0, .3]:
                box('Armchair stitched seam', (x + dx, -.83, .775), (.012, .8, .01), paper, 0)
    elif room == 'kingdom-court':
        for x in [-2, 2]:
            for z in [.57, .75, 3.4]:
                cylinder('Ceremonial column collar', (x, 2.65, z), .24, .1, brass, 24)
        for x in [-3.85, 3.85]:
            for z in [.18, .38, 3.2]:
                cylinder('Gate masonry course', (x, 3.85, z), .76, .12, materials['Warm courtyard stone'], 24)
        for x in [-1.95, 1.95]:
            for dx in [-.35, .35]:
                box('Illustrative hanging banner border', (x + dx, 3.64, 2.55), (.04, .015, 1.40), brass, 0)
        for i in range(3):
            box('Manuscript folio stack', (-1.4, -.1, 1.4 + i * .035), (.55, .6, .03), paper, .005)
    elif room == 'market-port':
        # Cargo at the existing inspection target sits on a side landing.
        box('Cargo side landing', (2.45, 2.0, .2), (2.0, 2.0, .22), wood, .015)
        for x, y, z in [(2.2, 2.0, .65), (2.85, 2.1, .65), (2.5, 2.0, 1.32)]:
            box('Cargo inspection stack', (x, y, z), (.62, .62, .65), wood, .04)
            for dx in [-.22, .22]:
                box('Cargo stack binding', (x + dx, y - .32, z), (.04, .02, .65), dark, 0)
        for x, y in [(.6, -1.7), (-.15, -2.2)]:
            for dx in [-.23, .23]:
                box('Cargo binding', (x + dx, y, .84), (.04, .63, .02), dark, 0)
            for dz in [-.16, 0, .16]:
                box('Cargo plank seam', (x, y - .318, .55 + dz), (.6, .012, .012), dark, 0)
        for x, y in [(-1.4, -.8), (1.4, 1.0)]:
            for radius in [.11, .16, .21]:
                ring('Coiled mooring rope', (x, y, .37), radius, .018, paper)
        for i in range(6):
            box('Ship deck plank seam', (2.2 + i * .2, -.5, .935), (.012, 3.5, .008), dark, 0)
    elif room == 'rural-village':
        for x in [-4.05, -2.35]:
            for z in [1.0, 2.5]:
                cylinder('Granary post collar', (x, 3.35, z), .16, .08, dark, 12)
        for x in [-4.1, -3.7, -3.3, -2.9, -2.5]:
            box('Granary wall slat', (x, 3.448, 3.35), (.04, .02, .96), dark, 0)
        for i in range(6):
            box('Granary access step', (-3.2, 2.9 - i * .25, 2.6 - i * .45),
                (.85, .3, .10), wood, .01)
        for x in [-3.65, -2.75]:
            rail = box('Granary stair stringer', (x, 2.2, 1.4), (.12, .12, 3.05), wood, .01)
            rail.rotation_euler.x = -.55
        for x in [3.8, 4.2, 4.6]:
            box('Sluice water ripple', (x, -3.4, .39), (.02, .35, .006), paper, 0)
    elif room == 'resistance-outpost':
        for x in [-4.8, -3.6]:
            for z in [1, 2.5, 3.2]:
                ring('Watch post rope lashing', (x, -.2, z), .11, .018, paper)
        for i in range(6):
            box('Watch post ladder rung', (-3.3, .4, .4 + i * .35), (.12, .8, .07), wood, .008)
        for x, y in [(-5.5, 2.3), (5.7, 2.7), (4.8, 4.2), (-5.1, 4.4)]:
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.9, location=(x, y, 2.7))
            crown = finish(bpy.context.object, 'Forest layered crown', materials['Dense forest green'])
            crown.scale = (1, .8, 1.3)
