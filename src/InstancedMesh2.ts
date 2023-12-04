import { Box3, BufferGeometry, Camera, Color, ColorRepresentation, Frustum, InstancedBufferAttribute, InstancedMesh, Material, Matrix4, Sphere, Vector3 } from 'three';
import { InstancedEntity, SharedData } from './InstancedEntity';

type EntityType = typeof InstancedEntity & (new (parent: InstancedMesh2, index: number, color?: ColorRepresentation, sharedData?: SharedData, visible?: boolean) => InstancedEntity);
type EntityCallback = (obj: InstancedEntity, index: number) => void;
type Entity = EntityType | EntityCallback;

const _c = new Color();
const _frustum = new Frustum();
const _projScreenMatrix = new Matrix4();
const _sphere = new Sphere();

export class InstancedMesh2<G extends BufferGeometry = BufferGeometry, M extends Material = Material> extends InstancedMesh<G, M> {
  public declare type: 'InstancedMesh2';
  public declare isInstancedMesh2: true;
  public instances: InstancedEntity[];
  public instancedAttributes: InstancedBufferAttribute[];
  /** @internal */ public _internalInstances: InstancedEntity[];

  constructor(geometry: G, material: M, count: number, type?: EntityType, color?: ColorRepresentation, shared?: SharedData[], visible?: boolean);
  constructor(geometry: G, material: M, count: number, type?: EntityCallback, color?: ColorRepresentation, shared?: SharedData[], visible?: boolean);
  constructor(geo: G, mat: M, count: number, type: Entity = InstancedEntity, color?: ColorRepresentation, shared: SharedData[] = new Array(0), visible = true) {
    super(geo, mat, count);
    if (color !== undefined) color = _c.set(color);
    if (visible === false) this.count = 0;
    this.instances = new Array(count);
    this._internalInstances = new Array(count);
    //cannnot handle visible in cosntructor.. fix

    if (type.prototype) {
      for (let i = 0; i < count; i++) {
        const instance = new (type as EntityType)(this, i, color, shared[i], visible);
        this._internalInstances[i] = instance;
        this.instances[i] = instance;
      }
    } else {
      for (let i = 0; i < count; i++) {
        const instance = new InstancedEntity(this, i, color, shared[i], visible);
        (type as EntityCallback)(instance, i);
        this._internalInstances[i] = instance;
        this.instances[i] = instance;
      }
    }

    this.updateInstancedAttributes();
    if (!this.geometry.boundingSphere) this.geometry.computeBoundingSphere();
    // this.computeBoundingBox();
    // this.frustumCulled = false; SOLO SE ATTIVANO IL FRUSTUM CULLING CUSTOM
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

  private swapInstance(instance: InstancedEntity, idTo: number): void {
    const lastInstance = this._internalInstances[idTo];
    if (instance === lastInstance) return;
    const idFrom = instance._internalId;
    this.swapAttributes(idFrom, idTo);
    this._internalInstances[idTo] = instance;
    this._internalInstances[idFrom] = lastInstance;
    lastInstance._internalId = idFrom;
    instance._internalId = idTo;
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

  public update(camera: Camera): void {
    const instances = this._internalInstances;
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    _frustum.setFromProjectionMatrix(_projScreenMatrix);
    const bSphere = this.geometry.boundingSphere;

    for (let i = 0, l = instances.length; i < l; i++) {
      const instance = instances[i];
      if (!instance._visible) continue;
      _sphere.copy(bSphere).translate(instance.position);
      _sphere.radius *= Math.max(instance.scale.x, instance.scale.y, instance.scale.z);
      instance._inFrustum = _frustum.intersectsSphere(_sphere);
      // this.setInstanceVisibility(instance, instance._inFrustum); // opt
    }
  }
}

InstancedMesh2.prototype.isInstancedMesh2 = true;
InstancedMesh2.prototype.type = 'InstancedMesh2';

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
