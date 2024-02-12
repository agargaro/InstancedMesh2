import { BufferGeometry, Camera, Color, ColorRepresentation, Frustum, InstancedBufferAttribute, InstancedMesh, Material, Matrix4, Sphere, Vector3 } from 'three';
import { InstancedEntity, SharedData } from './InstancedEntity';
import { InstancedMeshBVH } from './BVH/InstancedMeshBVH';

type EntityCallback<T> = (obj: T, index: number) => void;

const _color = new Color();
const _frustum = new Frustum();
const _projScreenMatrix = new Matrix4();
const _sphere = new Sphere();

export class InstancedMesh2<T extends InstancedEntity = InstancedEntity, G extends BufferGeometry = BufferGeometry, M extends Material = Material> extends InstancedMesh<G, M> {
  public declare type: 'InstancedMesh2';
  public declare isInstancedMesh2: true;
  public internalCount: number;
  public instances: T[];
  public instancedAttributes: InstancedBufferAttribute[];
  /** @internal */ public _perObjectFrustumCulled = true;
  /** @internal */ public _internalInstances: T[];
  private _sortComparer = (a: InstancedEntity, b: InstancedEntity) => a._internalId - b._internalId;
  private _bvh = new InstancedMeshBVH(this);

  public get perObjectFrustumCulled() { return this._perObjectFrustumCulled }
  public set perObjectFrustumCulled(value: boolean) {
    if (this._perObjectFrustumCulled === value) return;
    if (value) {
      this.enablePerObjectFrustumCulled();
    } else {
      this.disablePerObjectFrustumCulled();
    }
    this.frustumCulled = !value;
    this._perObjectFrustumCulled = value;
  }

  constructor(geometry: G, material: M, count: number, onCreateEntity?: EntityCallback<T>, color?: ColorRepresentation, shared: SharedData[] = [], visible = true) {
    super(geometry, material, count);
    this.internalCount = count;
    if (color !== undefined) color = _color.set(color);
    if (visible === false) this.count = 0;
    this.instances = new Array(count);
    this._internalInstances = new Array(count);

    for (let i = 0; i < count; i++) {
      const instance = new InstancedEntity(this, i, color, shared[i], visible) as T;
      if (onCreateEntity) onCreateEntity(instance, i);
      //handle visible in onCreateEntity.. fix
      this._internalInstances[i] = instance;
      this.instances[i] = instance;
    }

    this.updateInstancedAttributes();
    if (!this.geometry.boundingSphere) this.geometry.computeBoundingSphere();
    this.frustumCulled = false;

    this._bvh.build();
  }

  private updateInstancedAttributes(): void {
    const array = [this.instanceMatrix];
    if (this.instanceColor) array.push(this.instanceColor);

    const attributes = this.geometry.attributes;
    for (const key in attributes) {
      if ((attributes[key] as InstancedBufferAttribute as any).isInstancedBufferAttribute === true)
        // FIX d.ts and remove any
        array.push(attributes[key] as InstancedBufferAttribute);
    }

    this.instancedAttributes = array;
  }

  /** @internal */
  public setInstanceVisibility(instance: T, value: boolean): void {
    if (value === (instance._visible && (!this._perObjectFrustumCulled || instance._inFrustum))) return;
    if (value === true) {
      this.swapInstance(instance, this.count);
      this.count++;
    } else {
      this.swapInstance(instance, this.count - 1);
      this.count--;
    }
  }

  private setInstancesVisibility(show: T[], hide: T[]): void {
    const hideLengthMinus = hide.length - 1;
    const length = Math.min(show.length, hide.length);

    show = show.sort(this._sortComparer); // check if this sort is good
    hide = hide.sort(this._sortComparer);

    for (let i = 0; i < length; i++) {
      this.swapInstance2(show[i], hide[hideLengthMinus - i]);
    }

    this.needsUpdate(); // TODO usare anche altrove

    if (show.length === hide.length) return;

    if (show.length > hide.length) this.showInstances(show, length);
    else this.hideInstances(hide, hide.length - length);

  }

  private showInstances(entities: T[], count: number): void {
    // add opt if needs to show all?
    let startIndex = count;
    let endIndex = entities.length - 1;

    while (endIndex >= startIndex) {
      if (entities[startIndex]._internalId === this.count) {
        startIndex++;
      } else {
        this.swapInstance(entities[endIndex], this.count);
        endIndex--;
      }
      this.count++;
    }
  }

  private hideInstances(entities: T[], count: number): void {
    // add opt if needs to hide all?
    let startIndex = 0;
    let endIndex = count - 1;

    while (endIndex >= startIndex) {
      if (entities[endIndex]._internalId === this.count - 1) {
        endIndex--;
      } else {
        this.swapInstance(entities[startIndex], this.count - 1);
        startIndex++;
      }
      this.count--;
    }
  }

  private swapInstance(instanceFrom: T, idTo: number): void {
    const instanceTo = this._internalInstances[idTo];
    if (instanceFrom === instanceTo) return;
    const idFrom = instanceFrom._internalId;
    this.swapAttributes(idFrom, idTo);
    this._internalInstances[idTo] = instanceFrom;
    this._internalInstances[idFrom] = instanceTo;
    instanceTo._internalId = idFrom;
    instanceFrom._internalId = idTo;
  }

  private swapInstance2(instanceFrom: T, instanceTo: T): void {
    // if (instanceFrom === instanceTo) return this // this is always false in the only scenario when it's used
    const idFrom = instanceFrom._internalId;
    const idTo = instanceTo._internalId;
    this.swapAttributes(idFrom, idTo);
    this._internalInstances[idTo] = instanceFrom;
    this._internalInstances[idFrom] = instanceTo;
    instanceTo._internalId = idFrom;
    instanceFrom._internalId = idTo;
  }

  private swapAttributes(idFrom: number, idTo: number): void {
    for (const attr of this.instancedAttributes) {
      this.swapAttribute(attr, idTo, idFrom);
    }
  }

  private swapAttribute(attr: InstancedBufferAttribute, from: number, to: number): void {
    const array = attr.array;
    const size = attr.itemSize;
    const fromOffset = from * size;
    const toOffset = to * size;

    const temp = array[fromOffset];
    array[fromOffset] = array[toOffset];
    array[toOffset] = temp;
    for (let i = 1; i < size; i++) {
      const temp = array[fromOffset + i];
      array[fromOffset + i] = array[toOffset + i];
      array[toOffset + i] = temp;
    }
  }

  public updateCulling(camera: Camera): void {
    //put it on beforeRenderer

    if (this._perObjectFrustumCulled === false) return;

    const show: T[] = []; // opt memory allocation
    const hide: T[] = [];

    // console.time("culling");

    this._bvh.updateCulling(camera, show, hide);

    // console.timeEnd("culling");

    // console.log(show);
    // console.log(hide);

    // return;

    // _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    // _frustum.setFromProjectionMatrix(_projScreenMatrix);

    // const instances = this.instances;
    // const bSphere = this.geometry.boundingSphere;
    // const radius = bSphere.radius;
    // const center = bSphere.center;

    // for (let i = 0, l = this.internalCount; i < l; i++) {
    //   const instance = instances[i];
    //   if (instance._visible === false) continue;

    //   // _sphere.center.copy(center).applyQuaternion(instance.quaternion).add(instance.position);

    //   _sphere.center.addVectors(center, instance.position); // this works if geometry bsphere center is 0,0,0
    //   _sphere.radius = radius * this.getMax(instance.scale);

    //   if (instance._inFrustum !== (instance._inFrustum = _frustum.intersectsSphere(_sphere))) {
    //     if (instance._inFrustum === true) show.push(instance);
    //     else hide.push(instance);
    //   }

    //   if (instance._inFrustum && instance._needsUpdate) {
    //     this.composeToArray(instance);
    //     instance._needsUpdate = false;
    //   }
    // }

    // console.timeEnd("culling");

    if (show.length > 0 || hide.length > 0) this.setInstancesVisibility(show, hide);
  }

  // this is faster than Math.max(scale.x, scale.y, scale.z)
  private getMax(scale: Vector3): number {
    if (scale.x > scale.y) return scale.x > scale.z ? scale.x : scale.z;
    return scale.y > scale.z ? scale.y : scale.z;
  }

  private needsUpdate(): void {
    for (const attr of this.instancedAttributes) {
      attr.needsUpdate = true;
    }
  }

  public updateInstanceMatrix(instance: InstancedEntity): void {
    if (this._perObjectFrustumCulled === true || instance._visible === false) {
      instance._needsUpdate = true;
    } else {
      this.composeToArray(instance);
    }
  }

  public forceUpdateInstanceMatrix(instance: InstancedEntity): void {
    this.composeToArray(instance);
    instance._needsUpdate = false;
  }

  /** @internal updated to r159 Matrix4.ts */
  public composeToArray(instance: InstancedEntity): void {
    const te = this.instanceMatrix.array;
    const position = instance.position;
    const quaternion = instance.quaternion as any;
    const scale = instance.scale;
    const offset = instance._internalId * 16;

    const x = quaternion._x,
      y = quaternion._y,
      z = quaternion._z,
      w = quaternion._w;
    const x2 = x + x,
      y2 = y + y,
      z2 = z + z;
    const xx = x * x2,
      xy = x * y2,
      xz = x * z2;
    const yy = y * y2,
      yz = y * z2,
      zz = z * z2;
    const wx = w * x2,
      wy = w * y2,
      wz = w * z2;

    const sx = scale.x,
      sy = scale.y,
      sz = scale.z;

    te[offset] = (1 - (yy + zz)) * sx;
    te[offset + 1] = (xy + wz) * sx;
    te[offset + 2] = (xz - wy) * sx;
    te[offset + 3] = 0;

    te[offset + 4] = (xy - wz) * sy;
    te[offset + 5] = (1 - (xx + zz)) * sy;
    te[offset + 6] = (yz + wx) * sy;
    te[offset + 7] = 0;

    te[offset + 8] = (xz + wy) * sz;
    te[offset + 9] = (yz - wx) * sz;
    te[offset + 10] = (1 - (xx + yy)) * sz;
    te[offset + 11] = 0;

    te[offset + 12] = position.x;
    te[offset + 13] = position.y;
    te[offset + 14] = position.z;
    te[offset + 15] = 1;
  }

  public setCount(value: number): void {
    // rifare meglio
    for (let i = 0, l = this.instances.length; i < l; i++) {
      const instance = this.instances[i];
      if (instance._visible !== i < value) {
        if (i < value) {
          instance.visible = true;
          instance._inFrustum = true;
        } else {
          instance.visible = false;
        }
      }
    }
    this.internalCount = value;
    this.needsUpdate();
  }

  public enablePerObjectFrustumCulled(): void {
    for (let i = 0, l = this.instances.length; i < l; i++) {
      this.instances[i]._inFrustum = true;
    }
  }

  public disablePerObjectFrustumCulled(): void {
    const show: T[] = [];
    for (let i = 0, l = this.instances.length; i < l; i++) {
      const instance = this.instances[i];
      if (!instance._inFrustum && instance.visible) show.push(instance);
    }
    this.setInstancesVisibility(show, []);
  }
}

InstancedMesh2.prototype.isInstancedMesh2 = true;
InstancedMesh2.prototype.type = 'InstancedMesh2';

//TODO not swap matrix if needsUpdate = true