import { Box3, Camera, Matrix4, Vector3 } from 'three';
import { InstancedEntity } from '../InstancedEntity';
import { InstancedMesh2 } from '../InstancedMesh2';
import { Frustum, VisibilityState } from './Frustum';

// NON CREARE NODI VUOTI?
// USARE ARRAY CON DIMENSIONI FISSE?

export interface Node {
  left?: Node;
  right?: Node;
  leaves: InstancedEntity[];
  bbox: Box3;
  visibility: VisibilityState;
}

export enum BVHStrategy {
  center,
  average,
  SAH,
}

type Axis = 'x' | 'y' | 'z';

const _size = new Vector3();
const _center = new Vector3();
const _projScreenMatrix = new Matrix4();

// renderlo compatibile con un array di target
export class InstancedMeshBVH {
  public root: Node;
  private _target: InstancedMesh2;
  private _maxLeaves: number;
  private _maxDepth: number;
  private _bboxCache: Box3[];
  private _frustum = new Frustum();
  private _show: InstancedEntity[];
  private _hide: InstancedEntity[];

  constructor(instancedMesh: InstancedMesh2) {
    this._target = instancedMesh;
  }

  //TODO gesteire default
  public build(visible: boolean, strategy = BVHStrategy.center, maxLeaves = 10, maxDepth = 40): this {
    this._maxLeaves = maxLeaves;
    this._maxDepth = maxDepth;

    if (!this._target.boundingBox) this._target.computeBoundingBox();
    if (!this._target.geometry.boundingBox) this._target.geometry.computeBoundingBox();

    this.updateBoundingBoxCache();
    this.root = { leaves: this._target.instances, bbox: this._target.boundingBox, visibility: VisibilityState.in };

    switch (strategy) {
      case BVHStrategy.center:
        this.buildCenter(this.root, 0);
        break;
      default:
        console.error("Not implemented yet.");
        break;
    }

    this._bboxCache = undefined;

    return this;
  }

  private updateBoundingBoxCache(): void {
    const instances = this._target.instances;
    const count = instances.length;
    const bboxCache = new Array(count);
    const bboxGeometry = this._target.geometry.boundingBox;

    for (let i = 0; i < count; i++) {
      bboxCache[i] = bboxGeometry.clone().applyMatrix4(instances[i].matrix);
    }

    this._bboxCache = bboxCache;
  }

  private getLongestAxis(node: Node): Axis {
    node.bbox.getSize(_size);
    if (_size.x > _size.y) return _size.x > _size.z ? 'x' : 'z';
    return _size.y > _size.z ? 'y' : 'z';
  }

  private buildCenter(node: Node, depth: number): void {
    const axis = this.getLongestAxis(node);
    const leaves = node.leaves;
    const center = node.bbox.getCenter(_center)[axis];

    const leavesLeft: InstancedEntity[] = [];
    const leavesRight: InstancedEntity[] = [];
    const bboxLeft = new Box3();
    const bboxRight = new Box3();

    node.left = { leaves: leavesLeft, bbox: bboxLeft, visibility: VisibilityState.in };
    node.right = { leaves: leavesRight, bbox: bboxRight, visibility: VisibilityState.in };

    for (let i = 0, c = leaves.length; i < c; i++) {
      const obj = leaves[i];

      if (obj.position[axis] <= center) {
        leavesLeft.push(obj);
        bboxLeft.union(this._bboxCache[obj.id]);
      } else {
        leavesRight.push(obj);
        bboxRight.union(this._bboxCache[obj.id]);
      }
    }

    node.leaves = undefined;

    if (++depth >= this._maxDepth) return;
    if (leavesLeft.length > this._maxLeaves) this.buildCenter(node.left, depth);
    if (leavesRight.length > this._maxLeaves) this.buildCenter(node.right, depth);
  }

  public updateCulling(camera: Camera, show: InstancedEntity[], hide: InstancedEntity[]): void {
    this._show = show;
    this._hide = hide;

    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    this._frustum.setFromProjectionMatrix(_projScreenMatrix);

    this.checkBoxVisibility(this.root);

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

Vector3.prototype.min = function (v) {
  if (this.x > v.x) this.x = v.x;
  if (this.y > v.y) this.y = v.y;
  if (this.z > v.z) this.z = v.z;
  return this;
};

Vector3.prototype.max = function (v) {
  if (this.x < v.x) this.x = v.x;
  if (this.y < v.y) this.y = v.y;
  if (this.z < v.z) this.z = v.z;
  return this;
};
