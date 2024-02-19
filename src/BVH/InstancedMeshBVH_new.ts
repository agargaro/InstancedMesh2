import { Box3, Camera, Matrix4 } from 'three';
import { InstancedEntity } from '../InstancedEntity';
import { InstancedMesh2 } from '../InstancedMesh2';
import { Frustum, VisibilityState } from './Frustum';

export interface Node {
  bbox: Float32Array;
  visibility: VisibilityState;
  left?: Node;
  right?: Node;
  leaves?: InstancedEntity[];
}

export enum BVHStrategy {
  center,
  average,
  SAH,
}

export class InstancedMeshBVH_2 {
  public root: Node;
  private _target: InstancedMesh2;
  private _maxLeaves: number;
  private _maxDepth: number;
  private _indexes: Uint32Array;
  private _positions: Float32Array;
  private _boundingBoxes: Float32Array;
  private _splitFunction: () => void;
  private _frustum = new Frustum();
  private _show: InstancedEntity[];
  private _hide: InstancedEntity[];

  constructor(instancedMesh: InstancedMesh2) {
    this._target = instancedMesh;
  }

  public build(strategy = BVHStrategy.center, maxLeaves = 10, maxDepth = 40): this {
    this._maxLeaves = maxLeaves;
    this._maxDepth = maxDepth;

    const bbox = this.setup();
    this.root = { bbox, visibility: VisibilityState.in };

    this.buildCenter(this.root, 0, this._target.instances.length, 0);

    delete this._boundingBoxes;
    delete this._indexes;
    delete this._positions;

    return this;
  }

  private setup(): Float32Array {
    const instances = this._target.instances;
    const count = instances.length;
    const indexes = new Uint32Array(count);
    const positions = new Float32Array(count * 3);
    const bboxes = new Float32Array(count * 6);

    if (!this._target.boundingBox) this._target.computeBoundingBox();
    const bboxGeometry = this._target.geometry.boundingBox;

    let xMin = Number.MAX_SAFE_INTEGER;
    let yMin = Number.MAX_SAFE_INTEGER;
    let zMin = Number.MAX_SAFE_INTEGER;
    let xMax = Number.MIN_SAFE_INTEGER;
    let yMax = Number.MIN_SAFE_INTEGER;
    let zMax = Number.MIN_SAFE_INTEGER;

    for (let i = 0; i < count; i++) {
      indexes[i] = i;

      const bbox = _box.copy(bboxGeometry).applyMatrix4(instances[i].matrix);
      const min = bbox.min;
      const max = bbox.max;
      bboxes[i * 6] = min.x;
      bboxes[i * 6 + 1] = min.y;
      bboxes[i * 6 + 2] = min.z;
      bboxes[i * 6 + 3] = max.x;
      bboxes[i * 6 + 4] = max.y;
      bboxes[i * 6 + 5] = max.z;

      const position = instances[i].position;
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      if (xMin > min.x) xMin = min.x;
      if (yMin > min.y) yMin = min.y;
      if (zMin > min.z) zMin = min.z;
      if (xMax < max.x) xMax = max.x;
      if (yMax < max.y) yMax = max.y;
      if (zMax < max.z) zMax = max.z;
    }

    this._boundingBoxes = bboxes;
    this._indexes = indexes;
    this._positions = positions;

    return new Float32Array([xMin, yMin, zMin, xMax, yMax, zMax]); // can be done faster
  }

  private buildCenter(node: Node, offset: number, count: number, depth: number): void {
    if (depth++ >= this._maxDepth || count <= this._maxLeaves) {
      node.leaves = this.getLeaves(offset, count);
      return;
    }

    const bbox = node.bbox;
    const axis = this.getLongestAxis(bbox);
    const bboxLeft = new Float32Array(6);
    const bboxRight = new Float32Array(6);
    const center = (bbox[axis] + bbox[axis + 3]) / 2;

    bboxLeft[0] = Number.MAX_SAFE_INTEGER;
    bboxLeft[1] = Number.MAX_SAFE_INTEGER;
    bboxLeft[2] = Number.MAX_SAFE_INTEGER;
    bboxLeft[3] = Number.MIN_SAFE_INTEGER;
    bboxLeft[4] = Number.MIN_SAFE_INTEGER;
    bboxLeft[5] = Number.MIN_SAFE_INTEGER;

    bboxRight[0] = Number.MAX_SAFE_INTEGER;
    bboxRight[1] = Number.MAX_SAFE_INTEGER;
    bboxRight[2] = Number.MAX_SAFE_INTEGER;
    bboxRight[3] = Number.MIN_SAFE_INTEGER;
    bboxRight[4] = Number.MIN_SAFE_INTEGER;
    bboxRight[5] = Number.MIN_SAFE_INTEGER;

    const leftEndOffset = this.split(axis, offset, count, center, bboxLeft, bboxRight);

    node.left = { bbox: bboxLeft, visibility: VisibilityState.in };
    node.right = { bbox: bboxRight, visibility: VisibilityState.in };

    this.buildCenter(node.left, offset, leftEndOffset - offset, depth);
    this.buildCenter(node.right, leftEndOffset, count - leftEndOffset + offset, depth);
  }

  private getLeaves(offset: number, count: number): InstancedEntity[] {
    const array = new Array(count);
    const instances = this._target.instances;

    for (let i = 0; i < count; i++) {
      array[i] = instances[this._indexes[offset + i]];
    }

    return array;
  }

  private getLongestAxis(bbox: Float32Array): number {
    const xSize = bbox[3] - bbox[0];
    const ySize = bbox[4] - bbox[1];
    const zSize = bbox[5] - bbox[2];
    if (xSize > ySize) return xSize > zSize ? 0 : 2;
    return ySize > zSize ? 1 : 2;
  }

  private split(axis: number, offset: number, count: number, center: number, bboxLeft: Float32Array, bboxRight: Float32Array) {
    const pos = this._positions;
    let left = offset;
    let right = offset + count - 1;

    while (left <= right) {
      if (pos[left * 3 + axis] > center) {
        while (true) {
          if (pos[right * 3 + axis] < center) {
            this.swap(left, right);
            this.unionBBox(right, bboxRight);
            right--;
            break;
          }
          this.unionBBox(right, bboxRight);
          right--;
          if (right < left) return left;
        }
      }
      this.unionBBox(left, bboxLeft);
      left++;
    }

    return left;
  }

  private swap(left: number, right: number): void {
    const pos = this._positions;
    const index = this._indexes;

    let temp = pos[left * 3];
    pos[left * 3] = pos[right * 3];
    pos[right * 3] = temp;

    temp = pos[left * 3 + 1];
    pos[left * 3 + 1] = pos[right * 3 + 1];
    pos[right * 3 + 1] = temp;

    temp = pos[left * 3 + 2];
    pos[left * 3 + 2] = pos[right * 3 + 2];
    pos[right * 3 + 2] = temp;

    temp = index[left];
    index[left] = index[right];
    index[right] = temp;
  }

  private unionBBox(index: number, bboxSide: Float32Array): void {
    const bboxIndex = this._indexes[index];
    const bbox = this._boundingBoxes;

    if (bboxSide[0] > bbox[bboxIndex * 6]) bboxSide[0] = bbox[bboxIndex * 6];
    if (bboxSide[1] > bbox[bboxIndex * 6 + 1]) bboxSide[1] = bbox[bboxIndex * 6 + 1];
    if (bboxSide[2] > bbox[bboxIndex * 6 + 2]) bboxSide[2] = bbox[bboxIndex * 6 + 2];
    if (bboxSide[3] < bbox[bboxIndex * 6 + 3]) bboxSide[3] = bbox[bboxIndex * 6 + 3];
    if (bboxSide[4] < bbox[bboxIndex * 6 + 4]) bboxSide[4] = bbox[bboxIndex * 6 + 4];
    if (bboxSide[5] < bbox[bboxIndex * 6 + 5]) bboxSide[5] = bbox[bboxIndex * 6 + 5];
  }

  public updateCulling(camera: Camera, show: InstancedEntity[], hide: InstancedEntity[]): void {
    this._show = show;
    this._hide = hide;

    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    this._frustum.setFromProjectionMatrix(_projScreenMatrix);

    console.time("culling...");
    this.checkBoxVisibility(this.root);
    console.timeEnd("culling...");

    this._show = undefined;
    this._hide = undefined;
  }

  private checkBoxVisibility(node: Node, force?: VisibilityState): void {
    const visibility = force ?? this._frustum.intesectsBox(node.bbox);

    if (visibility === VisibilityState.intersect || visibility !== node.visibility) {

      if (node.leaves) {
        if (node.visibility === VisibilityState.out) {
          this._show.push(...node.leaves); // TODO use push for better performance?
        } else if (visibility === VisibilityState.out) {
          this._hide.push(...node.leaves); // TODO use push for better performance?
        }
      } else {
        const force = visibility === VisibilityState.intersect ? undefined : visibility;
        this.checkBoxVisibility(node.left, force);
        this.checkBoxVisibility(node.right, force);
      }

      node.visibility = visibility;
    }
  }
}

const _box = new Box3();
const _projScreenMatrix = new Matrix4();
