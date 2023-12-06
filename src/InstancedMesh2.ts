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
    // this.computeBoundingBox();
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

  private setInstancesVisibility(show: number[], hide: number[]): void {
    let idFrom: number, idTo: number;
    const instances = this._internalInstances;
    const hideLengthMinus = hide.length - 1;
    const length = Math.min(show.length, hide.length);

    for (let i = 0; i < length; i++) { //opt
      // idFrom = show[i];
      // idTo = hide[hideLength - i];
      // if (idFrom === idTo) return; questo non serve
      // const instanceFrom = instances[idFrom];
      // const instanceTo = instances[idTo]; // do bench
      // this.swapAttributes(idFrom, idTo);
      // instances[idTo] = instanceFrom;
      // instances[idFrom] = instanceTo;
      // instanceTo._internalId = idFrom;
      // instanceFrom._internalId = idTo;
      this.swapInstance(instances[show[i]], hide[hideLengthMinus - i]);
    }

    if (show.length > hide.length) {
      for (let i = length; i < show.length; i++) {
        this.swapInstance(instances[show[i]], this.count); // OPT
        this.count++;
      }
    } else {
      // OPT SE NASCONDE TUTTI?
      for (let i = length; i < hide.length; i++) {
        this.swapInstance(instances[hide[hideLengthMinus - i]], this.count - 1); // OPT 
        this.count--;
      }
    }
  }

  private swapInstance(instanceFrom: InstancedEntity, idTo: number): boolean {
    const instanceTo = this._internalInstances[idTo];
    if (instanceFrom === instanceTo) return false;
    const idFrom = instanceFrom._internalId;
    this.swapAttributes(idFrom, idTo);
    this._internalInstances[idTo] = instanceFrom;
    this._internalInstances[idFrom] = instanceTo;
    instanceTo._internalId = idFrom;
    instanceFrom._internalId = idTo;
    return true;
  }

  private swapAttributes(idFrom: number, idTo: number): void {
    for (const attr of this.instancedAttributes) {
      this.swapAttribute(attr, idTo, idFrom);
      attr.needsUpdate = true; // consider to force user to update it manually
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
    const instances = this._internalInstances;
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    _frustum.setFromProjectionMatrix(_projScreenMatrix);
    const bSphere = this.geometry.boundingSphere;
    const show: number[] = []; // opt memory allocation
    const hide: number[] = [];

    for (let i = 0, l = instances.length; i < l; i++) { // this can be opt to avoid visible check, using more memory...
      const instance = instances[i];
      if (!instance._visible) continue;
      _sphere.copy(bSphere).translate(instance.position);
      _sphere.radius *= Math.max(instance.scale.x, instance.scale.y, instance.scale.z); // opt
      if (instance._inFrustum !== (instance._inFrustum = _frustum.intersectsSphere(_sphere))) {
        if (instance._inFrustum === true) show.push(i);
        else hide.push(i)
      }
    }

    this.setInstancesVisibility(show, hide);
  }
}

InstancedMesh2.prototype.isInstancedMesh2 = true;
InstancedMesh2.prototype.type = 'InstancedMesh2';
