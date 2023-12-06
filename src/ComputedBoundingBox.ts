import { Box3, Matrix4, Vector3 } from "three";
import { InstancedMesh2 } from "./InstancedMesh2";

const _center = new Vector3();
const _dir = new Vector3();
const _bbox = new Box3();
const _matrix = new Matrix4();

export function computeBoundingBox2(instancedMesh: InstancedMesh2): void {
  const geometry = instancedMesh.geometry;
  const count = instancedMesh.count;

  if (instancedMesh.boundingBox === null) {
    instancedMesh.boundingBox = new Box3();
  }
  if (geometry.boundingBox === null) {
    geometry.computeBoundingBox();
  }
  instancedMesh.boundingBox.makeEmpty();

  _bbox.copy(geometry.boundingBox);
  _bbox.getCenter(_center);
  _dir.subVectors(_bbox.max, _center);
  const max = Math.max(_dir.x, _dir.y, _dir.z);
  _dir.set(max, max, max);
  _bbox.min.subVectors(_center, _dir); // _bboxMax opt
  _bbox.max.addVectors(_center, _dir);

  const objToCheck: number[] = new Array(count); // array di count size?
  let objToCheckCount = 0;
  let found = false;

  const _bboxMax_max_x = _bbox.max.x;
  const _bboxMax_max_y = _bbox.max.y;
  const _bboxMax_max_z = _bbox.max.z;
  const _bboxMax_min_x = _bbox.min.x;
  const _bboxMax_min_y = _bbox.min.y;
  const _bboxMax_min_z = _bbox.min.z;

  let xMax = Number.MIN_SAFE_INTEGER,
    yMax = Number.MIN_SAFE_INTEGER,
    zMax = Number.MIN_SAFE_INTEGER,
    xMin = Number.MAX_SAFE_INTEGER,
    yMin = Number.MAX_SAFE_INTEGER,
    zMin = Number.MAX_SAFE_INTEGER;

  // all instances, not all visible one
  for (let i = 0; i < count; i++) {
    const p = instancedMesh.instances[i].position;
    const s = instancedMesh.instances[i].scale;

    if (p.x + _bboxMax_max_x * s.x > xMax) {
      xMax = Math.max(p.x + _bboxMax_min_x * s.x);
      found = true;
    }

    if (p.y + _bboxMax_max_y * s.y > yMax) {
      yMax = Math.max(p.y + _bboxMax_min_y * s.y);
      found = true;
    }

    if (p.z + _bboxMax_max_z * s.z > zMax) {
      zMax = Math.max(p.z + _bboxMax_min_z * s.z);
      found = true;
    }

    if (p.x + _bboxMax_min_x * s.x < xMin) {
      xMin = Math.min(p.x + _bboxMax_max_x * s.x);
      found = true;
    }

    if (p.y + _bboxMax_min_y * s.y < yMin) {
      yMin = Math.min(p.y + _bboxMax_max_y * s.y);
      found = true;
    }

    if (p.z + _bboxMax_min_z * s.z < zMin) {
      zMin = Math.min(p.z + _bboxMax_max_z * s.z);
      found = true;
    }

    if (found === true) {
      objToCheck[objToCheckCount++] = i; // levare push
      found = false;
    }
  }

  for (let i = 0; i < objToCheckCount; i++) {
    const index = objToCheck[i];
    const p = instancedMesh.instances[index].position;
    const s = instancedMesh.instances[index].scale;
    if (
      p.x + _bboxMax_max_x * s.x > xMax ||
      p.y + _bboxMax_max_y * s.y > yMax ||
      p.z + _bboxMax_max_z * s.z > zMax ||
      p.x + _bboxMax_min_x * s.x < xMin ||
      p.y + _bboxMax_min_y * s.y < yMin ||
      p.z + _bboxMax_min_z * s.z < zMin
    ) {
      instancedMesh.getMatrixAt(index, _matrix);
      _bbox.copy(geometry.boundingBox).applyMatrix4(_matrix);
      instancedMesh.boundingBox.union(_bbox);
    }
  }
}
