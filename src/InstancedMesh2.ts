import { BufferGeometry, Camera, Color, ColorRepresentation, Frustum, InstancedBufferAttribute, InstancedMesh, Material, Matrix4, Sphere, Vector3 } from 'three';
import { InstancedEntity, SharedData } from './InstancedEntity';

type EntityCallback<T> = (obj: T, index: number) => void;

const _color = new Color();
const _frustum = new Frustum();
const _projScreenMatrix = new Matrix4();
const _sphere = new Sphere();
const _m = new Matrix4();

export class InstancedMesh2<T extends InstancedEntity = InstancedEntity, G extends BufferGeometry = BufferGeometry, M extends Material = Material> extends InstancedMesh<G, M> {
  public declare type: 'InstancedMesh2';
  public declare isInstancedMesh2: true;
  public instances: T[];
  public instancedAttributes: InstancedBufferAttribute[];
  public perObjectFrustumCulled = true;
  /** @internal */ public _internalInstances: T[];
  private _sortComparer = (a: InstancedEntity, b: InstancedEntity) => a._internalId - b._internalId;

  constructor(geometry: G, material: M, count: number, onCreateEntity?: EntityCallback<T>, color?: ColorRepresentation, shared: SharedData[] = [], visible = true) {
    super(geometry, material, count);
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
    this.frustumCulled = false; // SOLO SE ATTIVANO IL FRUSTUM CULLING CUSTOM
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
    if (value === (instance._visible && instance._inFrustum)) return; // check this
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

    this.needsUpdate();

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
    if (this.perObjectFrustumCulled === false) return;

    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    const instances = this.instances;
    const bSphere = this.geometry.boundingSphere;
    const radius = bSphere.radius;
    const center = bSphere.center;

    const show: T[] = []; // opt memory allocation
    const hide: T[] = [];

    // console.time('update');

    for (let i = 0, l = instances.length; i < l; i++) {
      const instance = instances[i];
      if (instance._visible === false) continue;

      // _sphere.center.copy(center).applyQuaternion(instance.quaternion).add(instance.position);

      _sphere.center.addVectors(center, instance.position);
      _sphere.radius = radius * this.getMax(instance.scale);

      // this.getMatrixAt(instance._internalId, _m);
      // _sphere.copy(bSphere).applyMatrix4(_m);

      if (instance._inFrustum !== (instance._inFrustum = _frustum.intersectsSphere(_sphere))) {
        if (instance._inFrustum === true) show[show.length] = instance;
        else hide[hide.length] = instance;
      }
    }

    // console.timeEnd('update');

    if (show.length > 0 || hide.length > 0) this.setInstancesVisibility(show, hide);
  }

  // this is faster than Math.max(scale.x, scale.y, scale.z)
  private getMax(scale: Vector3): number {
    if (scale.x > scale.y) {
      return scale.x > scale.z ? scale.x : scale.z;
    }
    return scale.y > scale.z ? scale.y : scale.z;
  }

  private needsUpdate(): void {
    for (const attr of this.instancedAttributes) {
      attr.needsUpdate = true;
    }
  }
}

InstancedMesh2.prototype.isInstancedMesh2 = true;
InstancedMesh2.prototype.type = 'InstancedMesh2';
