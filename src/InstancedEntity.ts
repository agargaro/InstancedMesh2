import { Color, ColorRepresentation, Matrix4, Quaternion, Vector3 } from 'three';
import { InstancedMesh2 } from './InstancedMesh2';

export class InstancedEntity {
  public isInstanceEntity = true;
  public readonly parent: InstancedMesh2;
  public readonly id: number;
  public readonly position: Vector3;
  public readonly scale: Vector3;
  public readonly quaternion: Quaternion;
  /** @internal */ public _internalId: number;
  /** @internal */ public _visible = true;
  /** @internal */ public _inFrustum = true;
  /** @internal */ public _matrixNeedsUpdate = false;

  public get internalId(): number { return this._internalId }

  public get visible(): boolean { return this._visible }
  public set visible(value: boolean) {
    if (value !== this._visible) {
      this.parent.setInstanceVisibility(this, value);
      this._visible = value;
    }
  }

  public get matrix(): Matrix4 {
    if (this._matrixNeedsUpdate) this.forceUpdateMatrix();
    this.parent.getMatrixAt(this._internalId, _m);
    return _m;
  }

  constructor(parent: InstancedMesh2, index: number, color?: ColorRepresentation) {
    this.id = index;
    this._internalId = index;
    this.parent = parent;

    if (color !== undefined) this.setColor(color);

    this.position = new Vector3();
    this.scale = new Vector3(1, 1, 1);
    this.quaternion = new Quaternion();
  }

  public updateMatrix(): void { //TODO this can be improved checking also visibility === false
    if (this.parent._perObjectFrustumCulled === true) {
      this._matrixNeedsUpdate = true;
    } else {
      this.forceUpdateMatrix();
    }
  }

  public forceUpdateMatrix(): void {
    this.parent.composeToArray(this.position, this.scale, this.quaternion, this._internalId);
    this._matrixNeedsUpdate = false;
  }

  public setColor(color: ColorRepresentation): void {
    this.parent.setColorAt(this._internalId, _c.set(color));
  }

  public getColor(color = _c): Color {
    this.parent.getColorAt(this._internalId, color);
    return color;
  }

  public applyMatrix4(m: Matrix4): this {
    this.matrix.premultiply(m).decompose(this.position, this.quaternion, this.scale);
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

  public rotateX(angle: number) {
    return this.rotateOnAxis(_xAxis, angle);
  }

  public rotateY(angle: number) {
    return this.rotateOnAxis(_yAxis, angle);
  }

  public rotateZ(angle: number) {
    return this.rotateOnAxis(_zAxis, angle);
  }

  // add other Object3D methods
}

const _q = new Quaternion();
const _m = new Matrix4();
const _c = new Color();
const _xAxis = new Vector3(1, 0, 0);
const _yAxis = new Vector3(0, 1, 0);
const _zAxis = new Vector3(0, 0, 1);
