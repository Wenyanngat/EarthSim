# -*- coding: utf-8 -*-
# Low-poly figurines generator (Blender 4.2+ / 5.x).
#   blender -b --factory-startup -P build_figures.py -- <out_dir> [render]
# Each figure: one mesh, one material, one small palette texture, < 10K tris.
import bpy, sys, os, random
from math import sin, cos, pi, radians, sqrt, hypot, ceil, tan, atan
from mathutils import Vector, Quaternion

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = os.path.abspath(argv[0]) if argv else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'figurki')
DO_RENDER = 'render' in argv
for d in ('', 'textures', 'preview'):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)
random.seed(11)
TRI_LIMIT = 10000


# ----------------------------------------------------------------- utils
def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def lerp(a, b, t):
    return a + (b - a) * t


def clamp(x, a, b):
    return a if x < a else b if x > b else x


def basis(n, up=Vector((0, 0, 1))):
    n = n.normalized()
    t = up.cross(n)
    if t.length < 1e-4:
        t = Vector((1, 0, 0)).cross(n)
    t.normalize()
    return t, n.cross(t), n


class Palette:
    SW, H = 8, 256

    def __init__(self, slots):
        self.slots = slots
        self.names = list(slots)
        w = 16
        while w < len(self.names) * self.SW:
            w *= 2
        self.W = w

    def uv(self, name, t=0.5):
        i = self.names.index(name)
        return ((i * self.SW + self.SW / 2) / self.W, 0.02 + 0.96 * clamp(t, 0, 1))

    def color_at(self, name, t):
        s = self.slots[name]
        if isinstance(s, str):
            return hexc(s)
        for (t0, c0), (t1, c1) in zip(s, s[1:]):
            if t <= t1:
                f = clamp((t - t0) / (t1 - t0), 0, 1)
                a, b = hexc(c0), hexc(c1)
                return tuple(lerp(a[k], b[k], f) for k in range(3))
        return hexc(s[-1][1])

    def image(self, name, path):
        img = bpy.data.images.new(name, self.W, self.H, alpha=False)
        px = []
        for y in range(self.H):
            t = clamp(((y + 0.5) / self.H - 0.02) / 0.96, 0, 1)
            row = []
            for i, nm in enumerate(self.names):
                c = self.color_at(nm, t)
                row += [c[0], c[1], c[2], 1.0] * self.SW
            row += [0.0, 0.0, 0.0, 1.0] * (self.W - len(self.names) * self.SW)
            px += row
        img.pixels.foreach_set(px)
        img.filepath_raw = path
        img.file_format = 'PNG'
        img.save()
        img.pack()
        return img


class Builder:
    def __init__(self, pal):
        self.pal = pal
        self.v, self.f, self.uv = [], [], []

    def _append(self, verts, faces, uvs, flip):
        base = len(self.v)
        if isinstance(uvs, tuple):
            uvs = [uvs] * len(verts)
        assert len(uvs) == len(verts)
        self.v += [tuple(p) for p in verts]
        self.uv += uvs
        for f in faces:
            f = tuple(base + i for i in f)
            self.f.append(f[::-1] if flip else f)

    def solid(self, verts, faces, uvs):
        """closed mesh: orient outward by signed volume"""
        vs = [Vector(p) for p in verts]
        c = sum(vs, Vector()) / len(vs)
        vol = 0.0
        for f in faces:
            a = vs[f[0]] - c
            for k in range(1, len(f) - 1):
                vol += a.dot((vs[f[k]] - c).cross(vs[f[k + 1]] - c))
        self._append(verts, faces, uvs, vol < 0)

    def shell(self, verts, faces, uvs, ref_n, face_i=0):
        """open mesh: face `face_i` must look along ref_n"""
        f = faces[face_i]
        a, b, c = (Vector(verts[i]) for i in f[:3])
        self._append(verts, faces, uvs, (b - a).cross(c - a).dot(ref_n) < 0)

    def tri_count(self):
        return sum(len(f) - 2 for f in self.f)

    def to_object(self, name):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        me.update()
        uvl = me.uv_layers.new(name='UVMap')
        flat = []
        for lp in me.loops:
            flat += self.uv[lp.vertex_index]
        uvl.data.foreach_set('uv', flat)
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        try:
            me.set_sharp_from_angle(angle=radians(50))
        except Exception as e:
            print('sharp-from-angle skipped:', e)
        img = self.pal.image(name + '_palette', os.path.join(OUT, 'textures', name + '_palette.png'))
        mat = bpy.data.materials.new(name + '_mat')
        mat.use_nodes = True
        nt = mat.node_tree
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        tex.location = (-320, 300)
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.5
        me.materials.append(mat)
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        me.calc_loop_triangles()
        return ob, len(me.loop_triangles)


# ------------------------------------------------------------ primitives
def revolve(prof, nseg):
    """prof: [(r,z)...], first & last are poles. returns verts, faces"""
    verts = [(0.0, 0.0, prof[0][1])]
    for r, z in prof[1:-1]:
        for j in range(nseg):
            a = 2 * pi * j / nseg
            verts.append((r * cos(a), r * sin(a), z))
    verts.append((0.0, 0.0, prof[-1][1]))
    nr = len(prof) - 2
    faces = []
    for j in range(nseg):
        faces.append((0, 1 + j, 1 + (j + 1) % nseg))
    for i in range(nr - 1):
        a0 = 1 + i * nseg
        b0 = a0 + nseg
        for j in range(nseg):
            k = (j + 1) % nseg
            faces.append((a0 + k, a0 + j, b0 + j, b0 + k))
    last = len(verts) - 1
    b0 = 1 + (nr - 1) * nseg
    for j in range(nseg):
        faces.append((last, b0 + (j + 1) % nseg, b0 + j))
    return verts, faces


def lathe(B, prof, nseg, slot, vfun=None):
    verts, faces = revolve(prof, nseg)
    uvs = [B.pal.uv(slot, vfun(v[2]) if vfun else 0.5) for v in verts]
    B.solid(verts, faces, uvs)


def sphere_t(nseg, nring):
    prof = [(0, -1)] + [(sin(pi * i / nring), -cos(pi * i / nring)) for i in range(1, nring)] + [(0, 1)]
    return revolve(prof, nseg)


def dome_t(nseg, nring):
    verts = [(0, 0, 1)]
    for i in range(1, nring + 1):
        ph = (pi / 2) * i / nring
        for j in range(nseg):
            a = 2 * pi * j / nseg
            verts.append((sin(ph) * cos(a), sin(ph) * sin(a), cos(ph)))
    faces = [(0, 1 + j, 1 + (j + 1) % nseg) for j in range(nseg)]
    for i in range(nring - 1):
        a0 = 1 + i * nseg
        b0 = a0 + nseg
        for j in range(nseg):
            k = (j + 1) % nseg
            faces.append((a0 + k, a0 + j, b0 + j, b0 + k))
    return verts, faces


def icosa_t():
    t = (1 + 5 ** 0.5) / 2
    v = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t),
         (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    v = [tuple(Vector(p).normalized()) for p in v]
    f = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6),
         (7, 1, 8), (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10),
         (8, 6, 7), (9, 8, 1)]
    return v, f


ICO = icosa_t()


def place(tv, o, ax, ay, az):
    return [o + ax * x + ay * y + az * z for (x, y, z) in tv]


def sphere(B, c, rx, ry, rz, slot, nseg=10, nring=6):
    tv, tf = sphere_t(nseg, nring)
    B.solid(place(tv, Vector(c), Vector((rx, 0, 0)), Vector((0, ry, 0)), Vector((0, 0, rz))), tf, B.pal.uv(slot))


def dome_at(B, o, n, r, h, slot, nseg=8, nring=2):
    t, b, n = basis(n)
    tv, tf = dome_t(nseg, nring)
    B.shell(place(tv, o, t * r, b * r, n * h), tf, B.pal.uv(slot), n)


def bead(B, p, r, slot, tan_=None, stretch=1.0):
    q = Quaternion((random.gauss(0, 1), random.gauss(0, 1), random.gauss(0, 1), random.gauss(0, 1))).normalized()
    m = q.to_matrix()
    verts = []
    for v in ICO[0]:
        w = (m @ Vector(v)) * r
        if tan_ is not None and stretch != 1.0:
            w += tan_ * (w.dot(tan_) * (stretch - 1))
        verts.append(p + w)
    B.solid(verts, ICO[1], B.pal.uv(slot))


def resample(pts, spacing):
    L = [0.0]
    for i in range(1, len(pts)):
        L.append(L[-1] + (pts[i] - pts[i - 1]).length)
    n = max(2, int(round(L[-1] / spacing)) + 1)
    out, j = [], 0
    for k in range(n):
        d = L[-1] * k / (n - 1)
        while j < len(pts) - 2 and L[j + 1] < d:
            j += 1
        seg = L[j + 1] - L[j]
        f = (d - L[j]) / seg if seg > 1e-9 else 0.0
        out.append((pts[j].lerp(pts[j + 1], f), (pts[j + 1] - pts[j]).normalized()))
    return out


def beads(B, pts, r, slot, spacing, stretch=1.0):
    rs = resample(pts, spacing)
    for p, t in rs:
        bead(B, p, r, slot, t, stretch)
    return len(rs)


def tube(B, pts, radii, nsides, slot):
    """tapered tube; last point is a tip"""
    n = len(pts)
    T = [(pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(n)]
    N = T[0].orthogonal().normalized()
    verts = [pts[0]]
    for i in range(n - 1):
        N = (N - T[i] * N.dot(T[i])).normalized()
        Bn = T[i].cross(N)
        for j in range(nsides):
            a = 2 * pi * j / nsides
            verts.append(pts[i] + (N * cos(a) + Bn * sin(a)) * radii[i])
    verts.append(pts[-1])
    nr = n - 1
    faces = [(0, 1 + j, 1 + (j + 1) % nsides) for j in range(nsides)]
    for i in range(nr - 1):
        a0 = 1 + i * nsides
        b0 = a0 + nsides
        for j in range(nsides):
            k = (j + 1) % nsides
            faces.append((a0 + k, a0 + j, b0 + j, b0 + k))
    last = len(verts) - 1
    b0 = 1 + (nr - 1) * nsides
    for j in range(nsides):
        faces.append((last, b0 + (j + 1) % nsides, b0 + j))
    B.solid(verts, faces, B.pal.uv(slot))


def bipyramid(B, outl, top, bot, slot):
    n = len(outl)
    verts = list(outl) + [top, bot]
    faces = []
    for i in range(n):
        j = (i + 1) % n
        faces.append((n, i, j))
        faces.append((n + 1, j, i))
    B.solid(verts, faces, B.pal.uv(slot))


def prism(B, o, n, r, h0, h1, slot, nseg=8):
    t, b, n = basis(n)
    verts = []
    for h in (h0, h1):
        for j in range(nseg):
            a = 2 * pi * j / nseg
            verts.append(o + (t * cos(a) + b * sin(a)) * r + n * h)
    faces = [tuple(range(nseg - 1, -1, -1)), tuple(range(nseg, 2 * nseg))]
    for j in range(nseg):
        k = (j + 1) % nseg
        faces.append((j, k, nseg + k, nseg + j))
    B.solid(verts, faces, B.pal.uv(slot))


# -------------------------------------------------------------- surfaces
class Body:
    """thimble: tapered side + elliptic dome. front is -Y."""

    def __init__(s, R0, Rt, Hs, Hd, bev=0.06):
        s.R0, s.Rt, s.Hs, s.Hd, s.bev = R0, Rt, Hs, Hd, bev
        s.top = Hs + Hd

    def r(s, z):
        z = clamp(z, 0.0, s.top)
        if z <= s.Hs:
            return s.R0 + (s.Rt - s.R0) * (z / s.Hs)
        q = (z - s.Hs) / s.Hd
        return s.Rt * sqrt(max(0.0, 1 - q * q))

    def profile(s, side_rings=3, dome_rings=8):
        rb = s.r(s.bev)
        pts = [(0, 0), (rb - s.bev, 0)]
        for k in range(side_rings + 1):
            z = s.bev + (s.Hs - s.bev) * k / side_rings
            pts.append((s.r(z), z))
        for k in range(1, dome_rings):
            a = pi / 2 * k / dome_rings
            pts.append((s.Rt * cos(a), s.Hs + s.Hd * sin(a)))
        pts.append((0, s.top))
        return pts

    def _n(s, z):
        z1, z0 = min(z + 1e-3, s.top - 1e-4), z - 1e-3
        dr = (s.r(z1) - s.r(z0)) / (z1 - z0)
        l = hypot(1, dr)
        return 1 / l, -dr / l

    def at(s, th, z, off=0.0):
        z = clamp(z, 0.002, s.top - 0.002)
        nr, nz = s._n(z)
        rr = s.r(z) + off * nr
        return Vector((rr * sin(th), -rr * cos(th), z + off * nz))

    def normal_at(s, th, z):
        z = clamp(z, 0.002, s.top - 0.002)
        nr, nz = s._n(z)
        return Vector((nr * sin(th), -nr * cos(th), nz))

    def point(s, x, z, off=0.0):  # arc-length mapping of front-view x
        return s.at(x / max(s.r(z), 0.05), z, off)

    def normal(s, x, z):
        return s.normal_at(x / max(s.r(z), 0.05), z)


class Sheet:
    """paraboloid plate in front of the body (mask)"""

    def __init__(s, y0, a, b, zc):
        s.y0, s.a, s.b, s.zc = y0, a, b, zc

    def normal(s, x, z):
        return Vector((2 * s.a * x, -1, 2 * s.b * (z - s.zc))).normalized()

    def point(s, x, z, off=0.0):
        y = s.y0 + s.a * x * x + s.b * (z - s.zc) ** 2
        return Vector((x, y, z)) + s.normal(x, z) * off


# -------------------------------------------------------------- outlines
def subdiv(o, maxlen):
    out = []
    n = len(o)
    for i in range(n):
        a, b = o[i], o[(i + 1) % n]
        k = max(1, int(ceil(hypot(b[0] - a[0], b[1] - a[1]) / maxlen)))
        for j in range(k):
            out.append((lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)))
    return out


def circle_o(cx, cz, r, n):
    return [(cx + r * cos(2 * pi * i / n), cz + r * sin(2 * pi * i / n)) for i in range(n)]


def almond_fn(cx, cz, w, hu, hl, p):
    def up(x):
        u = clamp((x - cx) / (w / 2), -1, 1)
        return cz + hu * (1 - u * u) ** p

    def lo(x):
        u = clamp((x - cx) / (w / 2), -1, 1)
        return cz - hl * (1 - u * u) ** p

    return up, lo


def almond_o(cx, cz, w, hu, hl, n, p):
    up, lo = almond_fn(cx, cz, w, hu, hl, p)
    pts = []
    for i in range(n + 1):
        x = cx - cos(pi * i / n) * w / 2
        pts.append((x, up(x)))
    for i in range(1, n):
        x = cx + cos(pi * i / n) * w / 2
        pts.append((x, lo(x)))
    return pts


def rrect_o(x0, z0, x1, z1, rtl, rtr, rbr, rbl, k=4):
    pts = []
    for (cx, cz, r, a0) in ((x0 + rtl, z1 - rtl, rtl, pi), (x1 - rtr, z1 - rtr, rtr, pi / 2),
                            (x1 - rbr, z0 + rbr, rbr, 0.0), (x0 + rbl, z0 + rbl, rbl, -pi / 2)):
        for i in range(k + 1):
            a = a0 - (pi / 2) * i / k
            pts.append((cx + r * cos(a), cz + r * sin(a)))
    return pts


def catmull(ctrl, per, closed=False):
    pts, n = [], len(ctrl)
    for i in range(n if closed else n - 1):
        p0 = ctrl[(i - 1) % n] if closed else ctrl[max(i - 1, 0)]
        p1 = ctrl[i]
        p2 = ctrl[(i + 1) % n] if closed else ctrl[i + 1]
        p3 = ctrl[(i + 2) % n] if closed else ctrl[min(i + 2, n - 1)]
        for k in range(per):
            t = k / per
            pts.append(tuple(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t +
                                    (-a + 3 * b - 3 * c + d) * t ** 3) for a, b, c, d in zip(p0, p1, p2, p3)))
    if not closed:
        pts.append(tuple(ctrl[-1]))
    return pts


def scale_o(o, c, s):
    return [(c[0] + (x - c[0]) * s, c[1] + (z - c[1]) * s) for x, z in o]


# --------------------------------------------------------------- patches
def polar_patch(B, surf, outline, off, slot, center=None, rings=2, bulge=0.0, skirt=-0.012, vfun=None, back=False):
    n = len(outline)
    if center is None:
        center = (sum(p[0] for p in outline) / n, sum(p[1] for p in outline) / n)
    cx, cz = center
    verts, uvs = [], []

    def add(x, z, o):
        verts.append(surf.point(x, z, o))
        uvs.append(B.pal.uv(slot, vfun(x, z) if vfun else 0.5))

    add(cx, cz, off + bulge)
    for k in range(1, rings + 1):
        f = k / rings
        for (x, z) in outline:
            add(cx + f * (x - cx), cz + f * (z - cz), off + bulge * (1 - f * f))
    faces = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    for k in range(rings - 1):
        a0 = 1 + k * n
        b0 = a0 + n
        for i in range(n):
            j = (i + 1) % n
            faces.append((a0 + j, a0 + i, b0 + i, b0 + j))
    if skirt is not None:
        a0 = 1 + (rings - 1) * n
        b0 = len(verts)
        for (x, z) in outline:
            add(x, z, skirt)
        for i in range(n):
            j = (i + 1) % n
            faces.append((a0 + j, a0 + i, b0 + i, b0 + j))
        if back:
            cb = len(verts)
            add(cx, cz, skirt)
            for i in range(n):
                faces.append((cb, b0 + (i + 1) % n, b0 + i))
    B.shell(verts, faces, uvs, surf.normal(cx, cz))


def grid_patch(B, surf, secs, off, slot, bulge=0.0, skirt=-0.012):
    ns, m = len(secs), len(secs[0])
    verts, uvs = [], []
    for i, row in enumerate(secs):
        for j, (x, z) in enumerate(row):
            o = off + bulge * sin(pi * i / (ns - 1)) * sin(pi * j / (m - 1))
            verts.append(surf.point(x, z, o))
            uvs.append(B.pal.uv(slot))
    idx = lambda i, j: i * m + j
    faces = []
    for i in range(ns - 1):
        for j in range(m - 1):
            faces.append((idx(i, j), idx(i, j + 1), idx(i + 1, j + 1), idx(i + 1, j)))
    loop = [(0, j) for j in range(m)] + [(i, m - 1) for i in range(1, ns)] + \
           [(ns - 1, j) for j in range(m - 2, -1, -1)] + [(i, 0) for i in range(ns - 2, 0, -1)]
    b0 = len(verts)
    for (i, j) in loop:
        x, z = secs[i][j]
        verts.append(surf.point(x, z, skirt))
        uvs.append(B.pal.uv(slot))
    L = len(loop)
    for k in range(L):
        k2 = (k + 1) % L
        faces.append((idx(*loop[k2]), idx(*loop[k]), b0 + k, b0 + k2))
    mi, mj = ns // 2, m // 2
    B.shell(verts, faces, uvs, surf.normal(*secs[mi][mj]), face_i=min(mi, ns - 2) * (m - 1) + min(mj, m - 2))


def eye(B, surf, cx, cz, w, hu, hl, base, rim_slot, scl_slot, discs, p=1.0, rim=0.022, rim_up=0.0, n=10):
    up, lo = almond_fn(cx, cz, w, hu, hl, p)
    polar_patch(B, surf, almond_o(cx, cz + rim_up / 2, w + 2.6 * rim, hu + rim + rim_up / 2, hl + rim - rim_up / 2, n, p),
                base + 0.010, rim_slot, center=(cx, cz), rings=2, bulge=0.006, skirt=base - 0.006)
    polar_patch(B, surf, almond_o(cx, cz, w, hu, hl, n, p), base + 0.019, scl_slot, center=(cx, cz), rings=2,
                bulge=0.012, skirt=base + 0.008)
    for k, (dx, dz, r, slot) in enumerate(discs):
        pts = []
        for i in range(14):
            a = 2 * pi * i / 14
            x = clamp(cx + dx + r * cos(a), cx - w * 0.46, cx + w * 0.46)
            z = clamp(cz + dz + r * sin(a), lo(x) + 0.006, up(x) - 0.006)
            pts.append((x, z))
        ccx = cx + dx
        ccz = clamp(cz + dz, lo(ccx) + 0.012, up(ccx) - 0.012)
        polar_patch(B, surf, pts, base + 0.036 + 0.007 * k, slot, center=(ccx, ccz), rings=1, skirt=base + 0.02)


def dome_on(B, surf, x, z, r, h, slot, nseg=12, nring=3, sink=0.0):
    dome_at(B, surf.point(x, z, -sink), surf.normal(x, z), r, h, slot, nseg, nring)


# =============================================================== FIGURE 1
def fig1():
    pal = Palette({'body': '#161616', 'face': '#6E76B2', 'horn': '#D9A94F', 'rim': '#0B0B0B',
                   'sclera': '#F7E08A', 'iris': '#E2603A', 'iris2': '#F8D968', 'pupil': '#0A0A0A'})
    B = Builder(pal)
    body = Body(1.0, 0.55, 2.75, 0.45)
    lathe(B, body.profile(4, 9), 64, 'body')

    hw, zw, zt, zb = 0.69, 2.2, 2.56, 1.06
    o = [(hw * cos(pi * i / 26), zw + (zt - zw) * sin(pi * i / 26)) for i in range(27)]
    side = lambda t: hw * cos(t * pi / 2) ** 0.85
    o += [(-side(i / 18), zw - (zw - zb) * i / 18) for i in range(1, 19)]
    o += [(side(i / 18), zw - (zw - zb) * i / 18) for i in range(17, 0, -1)]
    polar_patch(B, body, o, 0.014, 'face', center=(0, 2.02), rings=7, skirt=-0.012)

    for sx in (-1, 1):
        eye(B, body, sx * 0.335, 2.25, 0.45, 0.105, 0.105, 0.014, 'rim', 'sclera',
            [(0, 0, 0.066, 'iris'), (0, 0, 0.043, 'iris2'), (0, 0, 0.023, 'pupil')], p=1.0, rim=0.024, n=12)

    ctrl = [(-0.28, 2.86, 0.13), (-0.39, 2.93, 0.125), (-0.60, 3.07, 0.088), (-0.745, 3.265, 0.058),
            (-0.835, 3.47, 0.030), (-0.875, 3.64, 0.0)]
    sm = catmull(ctrl, 4)
    for sx in (-1, 1):
        pts = [Vector((sx * abs(x), -0.03 * i / len(sm), z)) for i, (x, z, r) in enumerate(sm)]
        tube(B, pts, [r * 1.12 for x, z, r in sm], 12, 'horn')
    return B, 'fig1_rogatyi'


# =============================================================== FIGURE 2
def fig2():
    pal = Palette({'body': '#231C23', 'gold': '#F7C21A',
                   'face': [(0, '#F6835A'), (0.10, '#F28A62'), (0.20, '#C79AAE'), (0.34, '#33AEF2'),
                            (0.50, '#2F86EA'), (0.70, '#5B50C8'), (0.88, '#7B30A8'), (1, '#782B9E')],
                   'collar': '#F0603A', 'red': '#D8304F', 'orange': '#F68B1F', 'white': '#F5EFDC',
                   'black': '#0D0B0D'})
    B = Builder(pal)
    body = Body(1.0, 0.72, 2.6, 1.05)
    lathe(B, body.profile(3, 8), 40, 'body')

    # collar under the face
    o = [(-0.5, 1.6), (0.5, 1.6)] + [(0.5 - 1.0 * i / 10, 0.90 - 0.13 * sin(pi * i / 10)) for i in range(11)]
    polar_patch(B, body, subdiv(o, 0.16), 0.012, 'collar', center=(0, 1.22), rings=3)

    # face
    hw, zt, zs, zb, rc = 0.66, 2.52, 1.75, 1.02, 0.28
    o = [(-hw + rc + rc * cos(pi - pi / 2 * i / 5), zt - rc + rc * sin(pi - pi / 2 * i / 5)) for i in range(6)]
    o += [(hw - rc + rc * cos(pi / 2 - pi / 2 * i / 5), zt - rc + rc * sin(pi / 2 - pi / 2 * i / 5)) for i in range(6)]
    o += [(hw * cos(-pi * i / 20), zs + (zs - zb) * sin(-pi * i / 20)) for i in range(21)]
    polar_patch(B, body, subdiv(o, 0.15), 0.024, 'face', center=(0, 1.85), rings=5, skirt=-0.012,
                vfun=lambda x, z: (z - zb) / (zt - zb))

    for sx in (-1, 1):
        eye(B, body, sx * 0.35, 2.25, 0.44, 0.088, 0.088, 0.024, 'black', 'white', [(0, 0, 0.05, 'black')],
            p=1.0, rim=0.02, n=9)
        # red crescent
        cx, z0, hwc = sx * 0.33, 2.79, 0.225
        secs = []
        for i in range(11):
            u = -1 + 2 * i / 10
            q = 1 - u * u
            zl, zu = z0 - 0.17 * q - 0.007, z0 - 0.07 * q + 0.007
            secs.append([(cx + u * hwc, zl), (cx + u * hwc, (zl + zu) / 2), (cx + u * hwc, zu)])
        grid_patch(B, body, secs, 0.014, 'red', bulge=0.012)
        dome_on(B, body, sx * 0.34, 2.9, 0.115, 0.075, 'orange', 12, 3)

    # cross
    a, f = 0.042, 0.062
    o = [(-f, 3.0), (f, 3.0), (a, 2.925), (0.125, 2.942), (0.125, 2.818), (a, 2.835), (a, 2.5), (f, 2.38),
         (-f, 2.38), (-a, 2.5), (-a, 2.835), (-0.125, 2.818), (-0.125, 2.942), (-a, 2.925)]
    polar_patch(B, body, subdiv(o, 0.13), 0.05, 'gold', center=(0, 2.88), rings=2, skirt=-0.01)

    # beads
    br, sp = 0.05, 0.107
    nb = 0

    def merid(th, z0, z1):
        return [body.at(th, lerp(z0, z1, i / 40), br * 0.8) for i in range(41)]

    nb += beads(B, merid(0, 3.58, 3.07), br, 'gold', sp)
    for th in (48, 88, 135):
        for s in (-1, 1):
            nb += beads(B, merid(radians(s * th), 3.58, 2.93), br, 'gold', sp)
    nb += beads(B, merid(pi, 3.58, 2.93), br, 'gold', sp)
    bead(B, Vector((0, 0, body.top + 0.03)), 0.08, 'gold')
    for s in (-1, 1):
        for th, ze in zip((50, 61, 72, 83, 94, 105, 116, 127), (1.95, 1.62, 1.28, 1.12, 1.16, 1.42, 1.66, 1.95)):
            nb += beads(B, merid(radians(s * th), 2.84, ze), br, 'gold', sp)
        pts = []
        for i in range(31):
            fr = i / 30
            pts.append(body.point(s * lerp(0.10, 0.64, fr), 2.68 - 0.2 * 4 * fr * (1 - fr), 0.024 + 0.035))
        nb += beads(B, pts, 0.04, 'gold', 0.085)
    print('fig2 beads:', nb)
    return B, 'fig2_namysto'


# =============================================================== FIGURE 3
def fig3():
    pal = Palette({'body': '#111111', 'gold': '#F5BE2B', 'black': '#0B0B0B',
                   'gradT': [(0, '#F4725B'), (0.30, '#F07E68'), (0.55, '#A99C8C'), (0.80, '#3FAFA6'), (1, '#2FA59D')],
                   'gradB': [(0, '#1B776F'), (0.25, '#23827A'), (0.50, '#9C8272'), (0.72, '#F0705A'), (1, '#F6705A')],
                   'white': '#F7F0DC', 'teal': '#2FA39A'})
    B = Builder(pal)
    body = Body(1.0, 0.66, 2.4, 0.4)
    lathe(B, body.profile(3, 4), 40, 'body')
    sphere(B, (0, 0, 2.55), 0.95, 0.95, 0.95, 'body', 28, 14)
    # hair lobes: sides + back
    for (z, rr, lr) in ((2.95, 0.78, 0.27), (2.48, 0.89, 0.31), (2.0, 0.84, 0.30)):
        for k in range(7):
            th = radians(90 + 30 * k)
            sphere(B, (rr * sin(th), -rr * cos(th), z), lr, lr, lr * 0.92, 'body', 12, 6)

    sheet = Sheet(-0.985, 0.33, 0.10, 2.35)
    R = [(0, 3.34), (0.30, 3.33), (0.55, 3.25), (0.73, 3.05), (0.82, 2.75), (0.845, 2.42), (0.81, 2.08),
         (0.73, 1.78), (0.59, 1.50), (0.40, 1.30), (0.20, 1.17), (0, 1.11)]
    ctrl = R + [(-x, z) for (x, z) in reversed(R[1:-1])]
    mc = (0, 2.3)
    outl = catmull(ctrl, 3, closed=True)
    polar_patch(B, sheet, outl, 0.0, 'gold', center=mc, rings=3, skirt=-0.075, back=True)
    polar_patch(B, sheet, scale_o(outl, mc, 0.972), 0.008, 'black', center=mc, rings=3, skirt=-0.004)
    polar_patch(B, sheet, scale_o(outl, mc, 0.935), 0.016, 'gold', center=mc, rings=3, skirt=0.004)

    # lace scallops
    dense = [Vector((x, z, 0)) for x, z in catmull(ctrl, 10, closed=True)]
    dense.append(dense[0])
    rs = resample(dense, 0.121)[:-1]
    for p, _ in rs:
        o = sheet.point(p.x, p.y, 0.0)
        n = sheet.normal(p.x, p.y)
        prism(B, o, n, 0.066, -0.072, 0.004, 'gold', 8)
        t_, b_, n_ = basis(n)
        B.shell([o + n_ * 0.009 + (t_ * cos(pi * q / 3) + b_ * sin(pi * q / 3)) * 0.021 for q in range(6)],
                [tuple(range(6))], pal.uv('black'), n_)
    print('fig3 scallops:', len(rs))

    def panel(x0, z0, x1, z1, radii, slot, zlo, zhi):
        zlo, zhi = z0, z1
        o = rrect_o(x0, z0, x1, z1, *radii, k=4)
        g = 0.02
        ob = rrect_o(x0 - g, z0 - g, x1 + g, z1 + g, *[r + g for r in radii], k=4)
        polar_patch(B, sheet, ob, 0.024, 'black', rings=1, skirt=0.01)
        polar_patch(B, sheet, o, 0.032, slot, rings=2, bulge=0.022, skirt=0.018,
                    vfun=lambda x, z: (z - zlo) / (zhi - zlo))

    zt0, zt1 = 2.54, 3.235
    panel(-0.205, zt0, 0.205, zt1, (0.17, 0.17, 0.05, 0.05), 'gradT', zt0, zt1)
    panel(-0.635, zt0, -0.255, 3.16, (0.25, 0.12, 0.05, 0.05), 'gradT', zt0, zt1)
    panel(0.255, zt0, 0.635, 3.16, (0.12, 0.25, 0.05, 0.05), 'gradT', zt0, zt1)
    zb0, zb1 = 1.30, 2.15
    panel(-0.205, zb0, 0.205, zb1, (0.05, 0.05, 0.19, 0.19), 'gradB', zb0, zb1)
    panel(-0.63, 1.56, -0.255, zb1, (0.05, 0.05, 0.12, 0.27), 'gradB', zb0, zb1)
    panel(0.255, 1.56, 0.63, zb1, (0.05, 0.05, 0.27, 0.12), 'gradB', zb0, zb1)

    for cx in (-0.45, 0.0, 0.45):
        eye(B, sheet, cx, 2.34, 0.35, 0.105, 0.085, 0.016, 'black', 'white',
            [(0.045, -0.005, 0.088, 'black'), (0.045, -0.005, 0.072, 'teal'), (0.06, -0.01, 0.04, 'black')],
            p=0.62, rim=0.018, rim_up=0.03, n=9)
    for cx in (-0.228, 0.228):
        polar_patch(B, sheet, [(cx, 2.42), (cx + 0.028, 2.345), (cx, 2.27), (cx - 0.028, 2.345)], 0.026, 'black',
                    rings=1, skirt=0.012)
    return B, 'fig3_maska'


# =============================================================== FIGURE 4
PETALS = {
    'poppy': dict(n=5, o=[(0.0, 0.0), (0.3, -0.45), (0.75, -0.6), (1.0, -0.32), (1.03, 0.0), (1.0, 0.32), (0.75, 0.6),
                          (0.3, 0.45)], cup=0.20, mid=0.55, th=0.05, slot='red'),
    'daisy': dict(n=9, o=[(0.12, 0), (0.45, -0.16), (0.85, -0.16), (1.0, 0), (0.85, 0.16), (0.45, 0.16)],
                  cup=0.10, mid=0.6, th=0.04, slot='white'),
    'corn': dict(n=10, o=[(0.1, 0), (0.6, -0.11), (1.0, -0.2), (0.85, 0.0), (1.0, 0.2), (0.6, 0.11)],
                 cup=0.18, mid=0.5, th=0.04, slot='blue'),
}


def flower(B, c, n, kind, R, roll=0.0):
    t, b, nn = basis(n)
    P = PETALS[kind]
    for i in range(P['n']):
        phi = roll + 2 * pi * i / P['n']
        e = t * cos(phi) + b * sin(phi)
        l = nn.cross(e)
        lift = (0.035 if i % 2 else 0.0) * R

        def pt(u, v, w):
            return c + e * (u * R) + l * (v * R) + nn * (w * R + lift + 0.12 * v * R)

        cup, m = P['cup'], P['mid']
        bipyramid(B, [pt(u, v, cup * u * u) for (u, v) in P['o']], pt(m, 0, cup * m * m + P['th']),
                  pt(m, 0, cup * m * m - P['th']), P['slot'])
    if kind == 'poppy':
        dome_at(B, c + nn * 0.02 * R, nn, 0.2 * R, 0.12 * R, 'dark', 8, 2)
        dome_at(B, c + nn * 0.11 * R, nn, 0.08 * R, 0.06 * R, 'yellow', 6, 1)
    elif kind == 'daisy':
        dome_at(B, c + nn * 0.01 * R, nn, 0.26 * R, 0.15 * R, 'yellow', 8, 2)
    else:
        dome_at(B, c + nn * 0.02 * R, nn, 0.2 * R, 0.13 * R, 'purple', 8, 2)
        dome_at(B, c + nn * 0.12 * R, nn, 0.075 * R, 0.05 * R, 'yellow', 6, 1)


def leaf(B, base, d, m, L, slot, W=1.0):
    d = d.normalized()
    m = (m - d * m.dot(d)).normalized()
    lat = m.cross(d)
    o = [(0, 0), (0.3, -0.2), (0.7, -0.17), (1, 0), (0.7, 0.17), (0.3, 0.2)]

    def pt(u, v, w):
        return base + d * (u * L) + lat * (v * L * W) + m * ((0.5 * u * (1 - u) + w) * L)

    bipyramid(B, [pt(u, v, 0) for u, v in o], pt(0.5, 0, 0.05), pt(0.5, 0, -0.04), slot)


def ribbon(B, body, th, z_top, zA, zB, width, off, slot, amp, k, phase, drift=0.0, M=12, thick=0.024):
    secs = []
    for j in range(M + 1):
        f = j / M
        row = {}
        for e, zend in ((-1, zA), (1, zB)):
            z = lerp(z_top, zend, f)
            te = th + drift * f + e * (width / 2) / body.r(z)
            o = off + amp * sin(k * f * 2 * pi + phase + e * 0.45) * f + 0.10 * f * f
            row[e] = (body.at(te, z, o + thick / 2), body.at(te, z, o - thick / 2))
        secs.append([row[-1][0], row[1][0], row[1][1], row[-1][1]])
    verts = [p for s in secs for p in s]
    faces = [(3, 2, 1, 0)]
    for j in range(M):
        a, b = 4 * j, 4 * (j + 1)
        for q in range(4):
            q2 = (q + 1) % 4
            faces.append((a + q, a + q2, b + q2, b + q))
    e0 = 4 * M
    faces.append((e0, e0 + 1, e0 + 2, e0 + 3))
    B.solid(verts, faces, B.pal.uv(slot))


def fig4():
    pal = Palette({'body': [(0, '#48D8F6'), (0.22, '#3399EA'), (0.45, '#3F5FD6'), (0.65, '#6A35C0'),
                            (0.85, '#6A2AA8'), (1, '#4A1A78')],
                   'black': '#0D0B10', 'white': '#F7F2E4', 'orange': '#EC5A1E', 'gold': '#F5C02C',
                   'red': '#E23A22', 'blue': '#2F63C8', 'yellow': '#F8C51C', 'dark': '#16131A',
                   'purple': '#7A45B8', 'leaf': '#6E9440', 'leaf2': '#4D7A33', 'rib_red': '#E0401F',
                   'rib_yel': '#FBC212', 'rib_blue': '#2E6FC8'})
    B = Builder(pal)
    body = Body(1.0, 0.6, 2.45, 0.42)
    lathe(B, body.profile(3, 7), 48, 'body', vfun=lambda z: z / body.top)

    for sx, pdx in ((-1, 0.07), (1, 0.03)):
        eye(B, body, sx * 0.335, 2.0, 0.5, 0.066, 0.088, 0.0, 'black', 'white', [(pdx, 0.03, 0.078, 'black')],
            p=1.0, rim=0.022, n=10)
        dome_on(B, body, sx * 0.35, 2.55, 0.13, 0.11, 'orange', 12, 3)
        for sag, r0 in ((0.13, 0.03), (0.22, 0.032)):
            pts = []
            for i in range(31):
                fr = i / 30
                pts.append(body.point(sx * 0.35 + lerp(-0.27, 0.27, fr), 2.43 - sag * 4 * fr * (1 - fr), r0 * 0.8))
            rs = resample(pts, 0.072)
            for q, (p, tn) in enumerate(rs):
                if q in (0, len(rs) - 1):
                    up = body.normal(sx * 0.35, 2.43).cross(tn).cross(body.normal(sx * 0.35, 2.43))
                    upv = Vector((0, 0, 1))
                    bead(B, p + upv * 0.03, r0 * 0.85, 'white', upv, 2.4)
                else:
                    bead(B, p, r0, 'gold', tn, 1.45)

    # ribbons
    for s in (-1, 1):
        ribbon(B, body, radians(s * 97), 2.70, 1.22, 1.05, 0.27, 0.075, 'rib_blue', 0.035, 1.3, 0.3 + s, drift=s * 0.07)
        ribbon(B, body, radians(s * 77), 2.70, 0.72, 0.52, 0.22, 0.055, 'rib_yel', 0.03, 1.6, 1.7 + s, drift=s * 0.02)
        ribbon(B, body, radians(s * 59), 2.70, 0.30, 0.48, 0.19, 0.035, 'rib_red', 0.025, 1.9, 3.0 + s, drift=-s * 0.02)

    # wreath base ring
    Rm, rt, zc = 0.50, 0.09, 2.75
    verts, faces = [], []
    NS, NT = 20, 6
    for i in range(NS):
        a = 2 * pi * i / NS
        for j in range(NT):
            bq = 2 * pi * j / NT
            rr = Rm + rt * cos(bq)
            verts.append(Vector((rr * cos(a), rr * sin(a), zc + rt * sin(bq))))
    for i in range(NS):
        for j in range(NT):
            i2, j2 = (i + 1) % NS, (j + 1) % NT
            faces.append((i * NT + j, i2 * NT + j, i2 * NT + j2, i * NT + j2))
    B.solid(verts, faces, pal.uv('leaf2'))

    def ring_pos(th_deg, rho, z, tilt_deg):
        th, tl = radians(th_deg), radians(tilt_deg)
        rad = Vector((sin(th), -cos(th), 0))
        return Vector((rho * sin(th), -rho * cos(th), z)), (rad * cos(tl) + Vector((0, 0, 1)) * sin(tl)), rad

    rowA = [(-28, 'corn', 0.21), (28, 'daisy', 0.21), (-60, 'daisy', 0.22), (60, 'corn', 0.21),
            (-95, 'poppy', 0.30), (95, 'poppy', 0.30), (-130, 'daisy', 0.22), (130, 'daisy', 0.22),
            (-160, 'corn', 0.21), (160, 'corn', 0.21), (180, 'poppy', 0.28)]
    for i, (th, kind, R) in enumerate(rowA):
        c, n, rad = ring_pos(th, 0.61 + 0.02 * (i % 3), 2.80 + 0.02 * ((i * 7) % 3 - 1), 42)
        flower(B, c, n, kind, R, roll=0.7 * i)
    c, n, rad = ring_pos(0, 0.44, 2.97, 58)
    flower(B, c, n, 'poppy', 0.34, roll=0.3)
    for th, kind in ((-75, 'daisy'), (75, 'corn'), (-150, 'corn'), (150, 'daisy')):
        c, n, rad = ring_pos(th, 0.30, 3.02, 66)
        flower(B, c, n, kind, 0.18, roll=th)
    flower(B, Vector((0, 0.13, 3.07)), Vector((0, 0.1, 1)), 'daisy', 0.2, roll=0.4)

    # leaves between the flowers
    angs = sorted(a for a, _, _ in rowA) + [0]
    angs = sorted(angs)
    for i in range(len(angs)):
        a0, a1 = angs[i], angs[(i + 1) % len(angs)]
        if a1 < a0:
            a1 += 360
        thm = (a0 + a1) / 2
        c, n, rad = ring_pos(thm, 0.60, 2.79, 42)
        t, b, nn = basis(n)
        for q, beta in enumerate((-32, -148)):
            d = t * cos(radians(beta)) + b * sin(radians(beta))
            leaf(B, c - nn * 0.035 + d * 0.05, d + nn * 0.15, nn, 0.25 + 0.03 * ((i + q) % 2), 'leaf' if (i + q) % 2 else 'leaf2')
    for i, th in enumerate((-38, 38, -112, 112, 180)):
        c, n, rad = ring_pos(th, 0.34, 3.0, 60)
        t, b, nn = basis(n)
        leaf(B, c - nn * 0.03, t * (0.5 if i % 2 else -0.5) - b * 0.6 + nn * 0.1, nn, 0.27, 'leaf')

    # hanging white buds
    for s in (-1, 1):
        for dth, z, o in ((92, 2.46, 0.17), (101, 2.33, 0.17), (84, 2.27, 0.16), (111, 2.44, 0.16)):
            p = body.at(radians(s * dth), z, o)
            bead(B, p, 0.05, 'white', Vector((0, 0, 1)), 1.7)
            leaf(B, p + Vector((0, 0, 0.07)), Vector((0, 0, 1)), body.normal_at(radians(s * dth), z), 0.11, 'leaf', 1.3)
    return B, 'fig4_vinok'


# ================================================================ scene
def export(ob, name):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', use_selection=True)
    try:
        bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, name + '.fbx'), use_selection=True, path_mode='COPY',
                                 embed_textures=True, mesh_smooth_type='EDGE')
    except Exception as e:
        print('FBX export failed:', e)


def setup_render():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 40
    sc.cycles.use_denoising = True
    sc.cycles.device = 'CPU'
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('W')
    w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (0.62, 0.63, 0.66, 1)
    bg.inputs[1].default_value = 0.75
    sc.world = w
    for name, loc, energy, size in (('key', (-4, -6, 7), 420, 5), ('rim', (5, 4, 5), 300, 4), ('fill', (5, -5, 2), 90, 6)):
        l = bpy.data.lights.new(name, 'AREA')
        l.energy, l.size = energy, size
        o = bpy.data.objects.new(name, l)
        o.location = loc
        o.rotation_euler = (Vector((0, 0, 1.5)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.collection.objects.link(o)
    cam = bpy.data.cameras.new('cam')
    cam.lens = 70
    co = bpy.data.objects.new('cam', cam)
    sc.collection.objects.link(co)
    sc.camera = co
    return sc, co


def shoot(sc, co, target, height, az, el, path, res=(640, 800), widen=1.0):
    sc.render.resolution_x, sc.render.resolution_y = res
    fit = max(height * 1.22, widen)
    fov = 2 * atan(18 / 70)
    aspect = res[0] / res[1]
    d = (fit / 2) / tan(fov / 2) * (1 if aspect <= 1 else aspect * 1.0)
    a, e = radians(az), radians(el)
    co.location = target + Vector((sin(a) * cos(e), -cos(a) * cos(e), sin(e))) * d
    co.rotation_euler = (target - co.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = []
    for i, fn in enumerate((fig1, fig2, fig3, fig4)):
        B, name = fn()
        ob, tris = B.to_object(name)
        zs = [v[2] for v in B.v]
        xs = [v[0] for v in B.v]
        print('RESULT %s: tris=%d verts=%d height=%.2f width=%.2f' % (name, tris, len(B.v), max(zs), max(xs) - min(xs)))
        assert tris < TRI_LIMIT, name + ' over budget'
        export(ob, name)
        objs.append((ob, max(zs)))
    for i, (ob, h) in enumerate(objs):
        ob.location.x = (i - 1.5) * 2.9
    if DO_RENDER:
        sc, co = setup_render()
        for ob, h in objs:
            for o2, _ in objs:
                o2.hide_render = o2 is not ob
            tgt = Vector((ob.location.x, 0, h / 2))
            for tag, az, el in (('front', 0, 6), ('34', 35, 14), ('back', 155, 12)):
                shoot(sc, co, tgt, h, az, el, os.path.join(OUT, 'preview', '%s_%s.png' % (ob.name, tag)))
        for o2, _ in objs:
            o2.hide_render = False
        shoot(sc, co, Vector((0, 0, 1.75)), 3.9, 18, 10, os.path.join(OUT, 'preview', 'all.png'), res=(1600, 800), widen=6.6)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'figurki.blend'))
    print('DONE ->', OUT)


main()
