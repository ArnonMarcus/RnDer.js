import Direction4D from "../linalng/4D/direction.js";
import Position4D from "../linalng/4D/position.js";
import Position3D from "../linalng/3D/position.js";
import Vertex from "./vertex.js";
import Color3D, { rgb } from "../linalng/3D/color.js";
const triangleLine1 = new Direction4D();
const triangleLine2 = new Direction4D();
export class Triangle {
    constructor(v0 = new Vertex(), v1 = new Vertex(), v2 = new Vertex()) {
        this.asNDC = (new_triangle = new Triangle()) => new_triangle.setTo(this).toNDC();
        this.toNDC = () => {
            this.vertices[0].toNDC();
            this.vertices[1].toNDC();
            this.vertices[2].toNDC();
            return this;
        };
        this.transformedBy = (matrix, new_triangle = new Triangle()) => new_triangle.setTo(this).transformTo(matrix);
        this.sendToNearClippingPlane = (from_index, to_index, near = 0) => {
            const from = this.vertices[from_index];
            const from_z = from.position.buffer[2];
            if (from_z === near)
                return;
            const to = this.vertices[to_index];
            const to_z = to.position.buffer[2];
            const distance = from_z - to_z;
            if (distance) {
                const by = (from_z - near) / distance;
                if (by === 1)
                    from.setTo(to);
                else
                    from.lerp(to, by, to);
            }
        };
        this.copy = (new_triangle = new Triangle()) => new_triangle.setTo(this);
        this.vertices = [v0, v1, v2];
    }
    get color() {
        return this.vertices[0].color;
    }
    set color(color) {
        this.vertices[0].color.setTo(color);
        this.vertices[1].color.setTo(color);
        this.vertices[2].color.setTo(color);
    }
    isInView(near = 0, far = 1) {
        return (this.vertices[0].isInView(near, far) &&
            this.vertices[1].isInView(near, far) &&
            this.vertices[2].isInView(near, far));
    }
    isOutOfView(near = 0, far = 1) {
        return (this.vertices[0].isOutOfView(near, far) &&
            this.vertices[1].isOutOfView(near, far) &&
            this.vertices[2].isOutOfView(near, far));
    }
    normal(normal = new Direction4D()) {
        // Get lines either side of triangle
        this.vertices[0].position.to(this.vertices[1].position, triangleLine1);
        this.vertices[0].position.to(this.vertices[2].position, triangleLine2);
        // Take cross product of lines to get normal to triangle surface
        return triangleLine1.cross(triangleLine2, normal).normalize();
    }
    transformTo(matrix) {
        this.vertices[0].position.mul(matrix);
        this.vertices[1].position.mul(matrix);
        this.vertices[2].position.mul(matrix);
        return this;
    }
    clipToNearClippingPlane(near, extra_triangle) {
        const v0_is_outside = this.vertices[0].position.buffer[2] < near;
        const v1_is_outside = this.vertices[1].position.buffer[2] < near;
        const v2_is_outside = this.vertices[2].position.buffer[2] < near;
        // Early return if the triangle is fully outside/inside the frustum
        if (v0_is_outside && v1_is_outside && v2_is_outside)
            return 0;
        if (!v0_is_outside && !v1_is_outside && !v2_is_outside)
            return 1;
        let i1; // An index of the first vertex inside the frustum
        let i2; // An index of the second vertex inside the frustum
        let o1; // An index of the first vertex outside the frustum
        let o2; // An index of the second vertex outside the frustum
        if (v0_is_outside) {
            o1 = 0;
            if (v1_is_outside) {
                o2 = 1;
                i1 = 2;
            }
            else {
                i1 = 1;
                if (v2_is_outside)
                    o2 = 2;
                else
                    i2 = 2;
            }
        }
        else {
            i1 = 0;
            if (v1_is_outside) {
                o1 = 1;
                if (v2_is_outside)
                    o2 = 2;
                else
                    i2 = 2;
            }
            else {
                i2 = 1;
                o1 = 2;
            }
        }
        // Break the input triangle into smaller output triangle(s).
        // There are 2 possible cases left (when not returning early above):
        if (i2 === undefined) {
            // Only one vertex is inside the frustum.
            // The triangle just needs to get smaller.
            // The two new vertices need to be on the near clipping plane:
            this.sendToNearClippingPlane(i1, o1, near);
            this.sendToNearClippingPlane(i1, o2, near);
            this.color = rgb(1, 0, 0);
            return 1; // A single (smaller)triangle
        }
        else {
            extra_triangle.setTo(this);
            // Two vertices are inside the frustum.
            // Clipping forms a quad which needs to be split into 2 triangles.
            // The first is the original (only smaller, as above).
            this.sendToNearClippingPlane(i1, o1, near);
            this.color = rgb(0, 1, 0);
            // The second is a new extra triangle, sharing 2 vertices
            extra_triangle.vertices[i1].setTo(this.vertices[o1]);
            extra_triangle.sendToNearClippingPlane(i2, o1, near);
            return 2; // Two adjacent triangles
        }
    }
    setTo(p0, p1, p2, uv0, uv1, uv2, color) {
        if (p0 instanceof Triangle) {
            this.vertices[0].position.setTo(p0.vertices[0].position);
            this.vertices[1].position.setTo(p0.vertices[1].position);
            this.vertices[2].position.setTo(p0.vertices[2].position);
            this.vertices[0].uv_coords.setTo(p0.vertices[0].uv_coords);
            this.vertices[1].uv_coords.setTo(p0.vertices[1].uv_coords);
            this.vertices[2].uv_coords.setTo(p0.vertices[2].uv_coords);
            this.color = p0.color;
        }
        else if (p0 instanceof Position4D) {
            this.vertices[0].position.setTo(p0);
            if (p1 instanceof Position4D)
                this.vertices[1].position.setTo(p1);
            if (p2 instanceof Position4D)
                this.vertices[2].position.setTo(p2);
            if (uv0 instanceof Position3D)
                this.vertices[0].uv_coords.setTo(uv0);
            if (uv1 instanceof Position3D)
                this.vertices[1].uv_coords.setTo(uv1);
            if (uv2 instanceof Position3D)
                this.vertices[2].uv_coords.setTo(uv2);
        }
        if (color instanceof Color3D)
            this.color = color;
        return this;
    }
}
export const tri = (v0 = new Vertex(), v1 = new Vertex(), v2 = new Vertex()) => {
    if (v0 instanceof Triangle)
        return new Triangle(v0.vertices[0].copy(), v0.vertices[1].copy(), v0.vertices[2].copy());
    else if (v0 instanceof Position4D &&
        v1 instanceof Position4D &&
        v2 instanceof Position4D)
        return new Triangle(new Vertex(v0), new Vertex(v1), new Vertex(v2));
    else if (v0 instanceof Vertex &&
        v1 instanceof Vertex &&
        v2 instanceof Vertex)
        return new Triangle(v0, v1, v2);
};
//# sourceMappingURL=triangle.js.map