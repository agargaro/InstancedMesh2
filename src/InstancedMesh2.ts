import { BufferGeometry, Color, ColorRepresentation, InstancedMesh, Material } from 'three';
import { InstancedEntity, SharedData } from './InstancedEntity';

type EntityType = typeof InstancedEntity & {
  new (parent: InstancedMesh2, index: number, color?: ColorRepresentation, sharedData?: SharedData, visible?: boolean): InstancedEntity;
};

const _c = new Color();

export class InstancedMesh2 extends InstancedMesh {
  public declare type: 'InstancedMesh2';
  public declare isInstancedMesh2: true;
  public _matrixInstances: InstancedEntity[];
  public instances: InstancedEntity[];

  constructor(
    geometry: BufferGeometry,
    material: Material,
    count: number,
    entityType: EntityType = InstancedEntity,
    color?: ColorRepresentation,
    shared?: SharedData[], // used for InstancedLOD
    visible = true
  ) {
    super(geometry, material, count);
    color = _c.set(color); // improve this.. will always instance color array
    if (visible === false) this.count = 0; // set also this.visible = false?
    this.instances = new Array(count);
    this._matrixInstances = new Array(count);

    if (shared) {
      for (let i = 0; i < count; i++) {
        const instance = new entityType(this, i, color, shared[i], visible);
        this._matrixInstances[i] = instance;
        this.instances[i] = instance;
      }
    } else {
      for (let i = 0; i < count; i++) {
        const instance = new entityType(this, i, color, undefined, visible);
        this._matrixInstances[i] = instance;
        this.instances[i] = instance;
      }
    }
  }

  public setInstanceVisibility(instance: InstancedEntity, value: boolean): void {
    if (value === instance._visible) return;
    if (value === true) {
      //TODO this can me improved
      this.swapInstance(instance, this.count);
      this.count++;
    } else {
      this.swapInstance(instance, this.count - 1);
      this.count--;
    }
    instance._visible = value;
  }

  private swapInstance(instance: InstancedEntity, idTo: number): void {
    const lastInstance = this._matrixInstances[idTo];
    if (instance === lastInstance) return;
    const idFrom = instance.instanceId;

    this.swapMatrixInArray(idTo, idFrom);
    this.instanceMatrix.needsUpdate = true; // consider to force user to update it manually

    if (this.instanceColor) {
      this.swapColorInArray(idTo, idFrom);
      this.instanceColor.needsUpdate = true; // consider to force user to update it manually
    }

    this._matrixInstances[idTo] = instance;
    this._matrixInstances[idFrom] = lastInstance;
    lastInstance.instanceId = idFrom;
    instance.instanceId = idTo;
  }

  private swapMatrixInArray(from: number, to: number): void {
    const array = this.instanceMatrix.array;
    let fromOffset = from * 16;
    let toOffset = to * 16;

    for (let i = 0; i < 16; i++) {
      const temp = array[fromOffset];
      array[fromOffset++] = array[toOffset];
      array[toOffset++] = temp;
    }
  }

  private swapColorInArray(from: number, to: number): void {
    const array = this.instanceColor.array;
    let fromOffset = from * 3;
    let toOffset = to * 3;

    for (let i = 0; i < 3; i++) {
      const temp = array[fromOffset];
      array[fromOffset++] = array[toOffset];
      array[toOffset++] = temp;
    }
  }
}

InstancedMesh2.prototype.isInstancedMesh2 = true;
InstancedMesh2.prototype.type = 'InstancedMesh2';
