import { Box3, Quaternion, Vector3 } from 'three';
import { InstancedMesh2 } from './InstancedMesh2';

// NON CREARE NODI VUOTI?
// USARE ARRAY CON DIMENSIONI FISSE?

export interface Entity {
  id: number;
  position: Vector3;
  scale: Vector3;
  quaternion: Quaternion;
}

export interface Node {
  left?: Node;
  right?: Node;
  leaves: Entity[];
  bbox: Box3;
}

export enum BVHStrategy {
  center,
  average,
  SAH,
}

type Axis = 'x' | 'y' | 'z';

const _size = new Vector3();
const _center = new Vector3();

// renderlo compatibile con un array di target
export class InstancedMeshBVH {
  public target: InstancedMesh2;
  public root: Node;
  private _maxLeaves: number;
  private _maxDepth: number;
  private _bboxCache: Box3[];

  constructor(instancedMesh: InstancedMesh2) {
    this.target = instancedMesh;
  }

  public build(strategy = BVHStrategy.center, maxLeaves = 10, maxDepth = 40): this {
    this._maxLeaves = maxLeaves;
    this._maxDepth = maxDepth;

    if (!this.target.boundingBox) this.target.computeBoundingBox();
    if (!this.target.geometry.boundingBox) this.target.geometry.computeBoundingBox();

    this.updateBoundingBoxCache();
    this.root = { leaves: this.target.instances, bbox: this.target.boundingBox };

    switch (strategy) {
      case BVHStrategy.center:
        this.buildCenter(this.root, 0);
        break;
      case BVHStrategy.average:
        //   this.buildAverage(this.root, 0);
        break;
    }

    this._bboxCache = undefined;

    return this;
  }

  private updateBoundingBoxCache(): void {
    const instances = this.target.instances;
    const count = instances.length;
    const bboxCache = new Array(count);
    const bboxGeometry = this.target.geometry.boundingBox;

    for (let i = 0; i < count; i++) {
      bboxCache[i] = bboxGeometry.clone().translate(instances[i].position); // TODO è incompleto
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

    const leavesLeft: Entity[] = [];
    const leavesRight: Entity[] = [];
    const bboxLeft = new Box3();
    const bboxRight = new Box3();

    node.left = { leaves: leavesLeft, bbox: bboxLeft };
    node.right = { leaves: leavesRight, bbox: bboxRight };

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
}
