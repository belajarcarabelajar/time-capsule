"""Locally authored illustrative people and rigid ambient-motion groups."""
import math

import bpy
from mathutils import Vector


def motion_group(name, objects, pivot):
    group = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(group)
    group.location = pivot
    for obj in objects:
        obj.parent = group
        obj.location -= Vector(pivot)
    return group


def enrich(room, box, cylinder, finish, material, wood, paper):
    prop_names, pivot = {
        'archive': (('Armillary celestial ring', 'Armillary central sphere'), (-2.2, 1, 1.72)),
        'market-port': (('Moored ship', 'Ship ', 'Furled sail'), (2.7, -.5, .3)),
        'ww1-field-station': (('Illustrative blank notice',), (-2.5, 3.07, 2.45)),
        'ww2-radio-room': (('Blackout curtain fold',), (-2.5, 3.08, 3.8)),
        'kingdom-court': (('Illustrative hanging banner',), (0, 3.68, 3.27)),
        'rural-village': (('Paddy tuft',), (-4.5, 2.6, .35)),
    }[room]
    motion_group('ambient_prop', [obj for obj in bpy.context.scene.objects
                                 if obj.type == 'MESH' and obj.name.startswith(prop_names)], pivot)
    x, y, floor = {
        'archive': (2.35, 1.55, .03),
        'market-port': (-.75, .25, .35),
        'ww1-field-station': (-2.25, 1.4, .07),
        'ww2-radio-room': (2.8, .55, .05),
        'kingdom-court': (2.9, 1.2, 0),
        'rural-village': (2.6, .5, .06),
    }[room]
    coat = material('Illustrative figure indigo cloth', (.12, .20, .25), 'fabric')
    skin = material('Illustrative figure warm clay', (.49, .29, .17), 'noise')
    hair = material('Illustrative figure dark umber', (.075, .055, .04), 'noise')
    before = set(bpy.context.scene.objects)

    def segment(name, start, end, radius, mat):
        a, b = Vector(start), Vector(end)
        obj = cylinder(name, (a + b) / 2, radius, (b - a).length, mat, 8)
        obj.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
        return obj

    for side in [-1, 1]:
        box('Figure shoe', (x + side * .105, y - .05, floor + .06), (.15, .28, .12), hair, .025)
        segment('Figure trouser', (x + side * .105, y, floor + .12),
                (x + side * .105, y, floor + .74), .085, coat)
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=.24, radius2=.19, depth=.58,
                                   location=(x, y, floor + .98))
    finish(bpy.context.object, 'Figure unmarked tunic', coat)
    cylinder('Figure collar', (x, y, floor + 1.30), .075, .13, skin, 10)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=.16,
                                        location=(x, y - .025, floor + 1.49))
    head = finish(bpy.context.object, 'Figure anonymous head', skin)
    head.scale = (.88, .95, 1.17)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=.155,
                                        location=(x, y + .012, floor + 1.58))
    cap = finish(bpy.context.object, 'Figure simple hair', hair)
    cap.scale = (.95, .97, .65)
    for side in [-1, 1]:
        shoulder = (x + side * .18, y, floor + 1.21)
        elbow = (x + side * .28, y - .10, floor + .96)
        hand = (x + side * .15, y - .30, floor + 1.04)
        segment('Figure upper sleeve', shoulder, elbow, .075, coat)
        segment('Figure lower sleeve', elbow, hand, .065, coat)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=.068, location=hand)
        finish(bpy.context.object, 'Figure hand', skin)
    carried = box('Figure illustrative blank folio', (x, y - .32, floor + 1.04),
                  (.40, .28, .045), paper, .008)
    carried.rotation_euler.x = .22
    group = motion_group('ambient_figure', list(set(bpy.context.scene.objects) - before), (x, y, floor))
    group.rotation_euler.z = -.22 if room != 'market-port' else .20


def merge_material_groups(scene):
    # Merge only siblings so runtime motion pivots survive the draw-call reduction.
    buckets = {}
    for obj in scene.objects:
        if obj.type == 'MESH' and obj.data.materials:
            buckets.setdefault((obj.parent, obj.data.materials[0]), []).append(obj)
    for (parent, _), objects in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.convert(target='MESH')
        bpy.ops.object.join()
