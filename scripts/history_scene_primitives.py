"""Shared local Blender materials, geometry and lighting."""
import math
import random

import bpy
import numpy as np
from mathutils import Vector

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


def create_palette():
    global wood, dark, brass, green, paper, plaster, glass, books
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
    return {name: globals()[name] for name in ('wood', 'dark', 'brass', 'green',
                                               'paper', 'plaster', 'glass', 'books')}
