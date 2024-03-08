import { Matrix4, Plane, Vector3, WebGLCoordinateSystem, WebGPUCoordinateSystem } from "three";

/** @internal @LASTREV 162 Frustum */
export class Frustum {
  public planes: Plane[];

  constructor(p0 = new Plane(), p1 = new Plane(), p2 = new Plane(), p3 = new Plane(), p4 = new Plane(), p5 = new Plane()) {
    this.planes = [p0, p1, p2, p3, p4, p5];
  }

  public setFromProjectionMatrix(m: Matrix4, coordinateSystem = WebGLCoordinateSystem): this {
    const planes = this.planes;
    const me = m.elements;
    const me0 = me[0], me1 = me[1], me2 = me[2], me3 = me[3];
    const me4 = me[4], me5 = me[5], me6 = me[6], me7 = me[7];
    const me8 = me[8], me9 = me[9], me10 = me[10], me11 = me[11];
    const me12 = me[12], me13 = me[13], me14 = me[14], me15 = me[15];

    planes[0].setComponents(me3 - me0, me7 - me4, me11 - me8, me15 - me12).normalize();
    planes[1].setComponents(me3 + me0, me7 + me4, me11 + me8, me15 + me12).normalize();
    planes[2].setComponents(me3 + me1, me7 + me5, me11 + me9, me15 + me13).normalize();
    planes[3].setComponents(me3 - me1, me7 - me5, me11 - me9, me15 - me13).normalize();
    planes[4].setComponents(me3 - me2, me7 - me6, me11 - me10, me15 - me14).normalize();

    if (coordinateSystem === WebGLCoordinateSystem) {
      planes[5].setComponents(me3 + me2, me7 + me6, me11 + me10, me15 + me14).normalize();
    } else if (coordinateSystem === WebGPUCoordinateSystem) {
      planes[5].setComponents(me2, me6, me10, me14).normalize();
    } else {
      throw new Error('THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: ' + coordinateSystem);
    }

    return this;
  }

  /** returns -1 = OUT, 0 = IN, > 0 = INTERSECT. */
  public intesectsBox(box: Float32Array): number {
    const planes = this.planes;
    let xMin: number, yMin: number, zMin: number, xMax: number, yMax: number, zMax: number;
    let plane: Plane, planeNormal: Vector3;

    for (let i = 0; i < 6; i++) {
      plane = planes[i];
      planeNormal = plane.normal;

      if (planeNormal.x > 0) {
        xMin = box[3];
        xMax = box[0];
      } else {
        xMin = box[0];
        xMax = box[3];
      }

      if (planeNormal.y > 0) {
        yMin = box[4];
        yMax = box[1];
      } else {
        yMin = box[1];
        yMax = box[4];
      }

      if (planeNormal.z > 0) {
        zMin = box[5];
        zMax = box[2];
      } else {
        zMin = box[2];
        zMax = box[5];
      }

      if ((planeNormal.x * xMin) + (planeNormal.y * yMin) + (planeNormal.z * zMin) < -plane.constant) return -1;

      if ((planeNormal.x * xMax) + (planeNormal.y * yMax) + (planeNormal.z * zMax) <= -plane.constant) { // intersect
        while (++i < 6) {
          plane = planes[i];
          planeNormal = plane.normal;

          xMin = planeNormal.x > 0 ? box[3] : box[0];
          yMin = planeNormal.y > 0 ? box[4] : box[1];
          zMin = planeNormal.z > 0 ? box[5] : box[2];

          if ((planeNormal.x * xMin) + (planeNormal.y * yMin) + (planeNormal.z * zMin) < -plane.constant) return -1;
        }

        return 1;
      }
    }

    return 0;
  }

  /** returns -1 = OUT, 0 = IN, > 0 = INTERSECT. */
  public intesectsBoxMask(box: Float32Array, mask: number): number {
    const planes = this.planes;
    let xMin: number, yMin: number, zMin: number, xMax: number, yMax: number, zMax: number;

    for (let i = 0; i < 6; i++) {
      if ((mask & (0b100000 >> i)) === 0) continue; // if byte i is 0

      const plane = planes[i];
      const planeNormal = plane.normal;

      if (planeNormal.x > 0) {
        xMin = box[3];
        xMax = box[0];
      } else {
        xMin = box[0];
        xMax = box[3];
      }

      if (planeNormal.y > 0) {
        yMin = box[4];
        yMax = box[1];
      } else {
        yMin = box[1];
        yMax = box[4];
      }

      if (planeNormal.z > 0) {
        zMin = box[5];
        zMax = box[2];
      } else {
        zMin = box[2];
        zMax = box[5];
      }

      if ((planeNormal.x * xMin) + (planeNormal.y * yMin) + (planeNormal.z * zMin) < -plane.constant) return -1; // is out

      if ((planeNormal.x * xMax) + (planeNormal.y * yMax) + (planeNormal.z * zMax) > -plane.constant) { // is full in
        mask ^= 0b100000 >> i; // set byte i to 0
      }
    }

    return mask;
  }
}
