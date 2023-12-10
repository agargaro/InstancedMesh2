import { BufferGeometry, Camera, Color, ColorRepresentation, Frustum, InstancedBufferAttribute, InstancedMesh, Material, Matrix4, Sphere } from 'three';
import { InstancedEntity, SharedData } from './InstancedEntity';

type EntityCallback = (obj: InstancedEntity, index: number) => void;

const _color = new Color();
const _frustum = new Frustum();
const _projScreenMatrix = new Matrix4();
const _sphere = new Sphere();

export class InstancedMesh2<G extends BufferGeometry = BufferGeometry, M extends Material = Material> extends InstancedMesh<G, M> {
  public declare type: 'InstancedMesh2';
  public declare isInstancedMesh2: true;
  public instances: InstancedEntity[];
  public instancedAttributes: InstancedBufferAttribute[];
  public perObjectFrustumCulled = true;
  /** @internal */ public _internalInstances: InstancedEntity[];

  constructor(geometry: G, material: M, count: number, onCreateEntity?: EntityCallback, color?: ColorRepresentation, shared: SharedData[] = [], visible = true) {
    super(geometry, material, count);
    if (color !== undefined) color = _color.set(color);
    if (visible === false) this.count = 0;
    this.instances = new Array(count);
    this._internalInstances = new Array(count);

    for (let i = 0; i < count; i++) {
      const instance = new InstancedEntity(this, i, color, shared[i], visible);
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
  public setInstanceVisibility(instance: InstancedEntity, value: boolean): void {
    if (value === instance._visible && instance._inFrustum) return;
    if (value === true) {
      this.swapInstance(instance, this.count);
      this.count++;
    } else {
      this.swapInstance(instance, this.count - 1);
      this.count--;
    }
  }

  private setInstancesVisibility(show: InstancedEntity[], hide: InstancedEntity[]): void {
    // const instances = this._internalInstances;
    const hideLengthMinus = hide.length - 1;
    const length = Math.min(show.length, hide.length);

    show = show.sort((a, b) => a._internalId - b._internalId);
    hide = hide.sort((a, b) => a._internalId - b._internalId);
    // let idFrom: number, idTo: number;

    for (let i = 0; i < length; i++) { //opt
      this.swapInstance(show[i], hide[hideLengthMinus - i]._internalId);
    }

    this.instanceMatrix.needsUpdate = true; // TODO test

    if (show.length === hide.length) return;

    if (show.length > hide.length) {
      for (let i = length; i < show.length; i++) {
        this.swapInstance(show[i], this.count); // OPT
        this.count++;
      }
    } else {
      this.hideInstances(hide, hide.length - length);
    }
  }

  private hideInstances(entities: InstancedEntity[], count: number): void {     // OPT SE NASCONDE TUTTI?
    const instances = this._internalInstances;
    let idFrom: number, idTo: number;
    let instanceFrom: InstancedEntity, instanceTo: InstancedEntity;
    let startIndex = 0;
    let endIndex = count - 1;

    while (endIndex >= startIndex) {
      if (entities[endIndex]._internalId === this.count - 1) {
        endIndex--;
      } else {
        idFrom = entities[startIndex]._internalId;
        idTo = this.count - 1;
        if (idTo !== idFrom) { // opt
          instanceFrom = instances[idFrom];
          instanceTo = instances[idTo];
          this.swapAttributes(idFrom, idTo);
          instanceTo._internalId = idFrom;
          instanceFrom._internalId = idTo;
          instances[idTo] = instanceFrom;
          instances[idFrom] = instanceTo;
        }
        startIndex++;
      }
      this.count--;
    }
  }

  private swapInstance(instanceFrom: InstancedEntity, idTo: number): void {
    const instanceTo = this._internalInstances[idTo];
    if (instanceFrom === instanceTo) return;
    const idFrom = instanceFrom._internalId;
    this.swapAttributes(idFrom, idTo);
    this._internalInstances[idTo] = instanceFrom;
    this._internalInstances[idFrom] = instanceTo;
    instanceTo._internalId = idFrom;
    instanceFrom._internalId = idTo;
  }

  private swapAttributes(idFrom: number, idTo: number): void {
    for (const attr of this.instancedAttributes) {
      this.swapAttribute(attr, idTo, idFrom);
      // attr.needsUpdate = true; // consider to force user to update it manually
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
    const instances = this.instances;
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    _frustum.setFromProjectionMatrix(_projScreenMatrix);
    const bSphere = this.geometry.boundingSphere;
    const show: InstancedEntity[] = []; // opt memory allocation
    const hide: InstancedEntity[] = [];

    // console.time('update');
    for (let i = 0, l = instances.length; i < l; i++) { // this can be opt to avoid visible check, using more memory...
      const instance = instances[i];
      if (!instance._visible) continue;
      _sphere.copy(bSphere).translate(instance.position);
      _sphere.radius *= Math.max(instance.scale.x, instance.scale.y, instance.scale.z); // opt
      if (instance._inFrustum !== (instance._inFrustum = _frustum.intersectsSphere(_sphere))) {
        if (instance._inFrustum === true) show.push(instance);
        else hide.push(instance)
      }
    }
    // console.timeEnd('update');

    if (show.length > 0 || hide.length > 0) this.setInstancesVisibility(show, hide);
  }
}

InstancedMesh2.prototype.isInstancedMesh2 = true;
InstancedMesh2.prototype.type = 'InstancedMesh2';
