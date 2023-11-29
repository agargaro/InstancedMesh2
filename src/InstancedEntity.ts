import { Color, ColorRepresentation, EventDispatcher, Matrix4, Quaternion, Vector3 } from 'three';
import { InstancedMesh2 } from './InstancedMesh2';

// Used by InstancedLOD
export interface SharedData {
  position: Vector3;
  scale: Vector3;
  quaternion: Quaternion;
  index: number;
}

const _q = new Quaternion();
const _m = new Matrix4();
const _c = new Color();

export class InstancedEntity extends EventDispatcher {
  public declare type: 'InstancedEntity';
  public declare isInstanceEntity: true;
  public parent: InstancedMesh2;
  public instanceId: number;
  public readonly position: Vector3;
  public readonly scale: Vector3;
  public readonly quaternion: Quaternion;
  /** @internal */ public _visible: boolean;

  public get visible(): boolean {
    return this._visible;
  }
  public set visible(value: boolean) {
    this.parent.setInstanceVisibility(this, value);
  }

  constructor(parent: InstancedMesh2, index: number, color?: ColorRepresentation, sharedData?: SharedData, visible = true) {
    super();
    this.parent = parent;
    this.instanceId = index;
    this._visible = visible;
    if (color !== undefined) this.setColor(color);

    if (sharedData) {
      // used by InstancedLOD
      this.position = sharedData.position;
      this.scale = sharedData.scale;
      this.quaternion = sharedData.quaternion;
    } else {
      this.position = new Vector3();
      this.scale = new Vector3(1, 1, 1);
      this.quaternion = new Quaternion();
    }
  }

  public setColor(color: ColorRepresentation): void {
    const parent = this.parent;
    parent.setColorAt(this.instanceId, _c.set(color));
    parent.instanceColor.needsUpdate = true;
  }

  public getColor(color = _c): Color {
    this.parent.getColorAt(this.instanceId, color);
    return color;
  }

  public updateMatrix(): void {
    this.composeToArray();
    this.parent.instanceMatrix.needsUpdate = true;
  }

  // updated to r158 Matrix4.ts
  protected composeToArray(): void {
    const te = this.parent.instanceMatrix.array;
    const position = this.position;
    const quaternion = this.quaternion as any;
    const scale = this.scale;
    const offset = this.instanceId * 16;

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

  public applyMatrix4(m: Matrix4): this {
    const parent = this.parent;
    _m.compose(this.position, this.quaternion, this.scale); // or get it from array but is not updated
    _m.premultiply(m);
    _m.decompose(this.position, this.quaternion, this.scale);
    parent.setMatrixAt(this.instanceId, _m);
    parent.instanceMatrix.needsUpdate = true;
    return this;
  }

  public applyQuaternion(q: Quaternion): this {
    this.quaternion.premultiply(q);
    return this;
  }

  public rotateOnAxis(axis: Vector3, angle: number): this {
    _q.setFromAxisAngle(axis, angle);
    this.quaternion.multiply(_q);
    return this;
  }

  public rotateOnWorldAxis(axis: Vector3, angle: number): this {
    _q.setFromAxisAngle(axis, angle);
    this.quaternion.premultiply(_q);
    return this;
  }

  // add other Object3D methods
}

InstancedEntity.prototype.isInstanceEntity = true;
InstancedEntity.prototype.type = 'InstancedEntity';
