// import { Color, ColorRepresentation, EventDispatcher, Matrix4, Quaternion, Vector3 } from 'three';
// import { InstancedMesh2 } from './InstancedMesh2';
// import { InstancedEntity } from './InstancedEntity';

// const _q = new Quaternion();
// const _m = new Matrix4();
// const _c = new Color();

// export class SharedInstancedEntity extends InstancedEntity {
//   public declare type: 'SharedInstancedEntity';
//   public declare isSharedInstancedEntity: true;
//   public parent: InstancedMesh2;
//   public readonly id: number;
//   public readonly position: Vector3;
//   public readonly scale: Vector3;
//   public readonly quaternion: Quaternion;
//   /** @internal */ public _internalId: number;
//   /** @internal */ public _visible: boolean;
//   /** @internal */ public _inFrustum = true;
//   /** @internal */ public _needsUpdate = false;

//   public get visible(): boolean { return this._visible }
//   public set visible(value: boolean) {
//     this.parent.setInstanceVisibility(this, value);
//     this._visible = value;
//   }

//   //TODO si può migliorare vedendo il flag need update
//   public get matrix(): Matrix4 { return _m.compose(this.position, this.quaternion, this.scale) }

//   constructor(parent: InstancedMesh2, index: number, color?: ColorRepresentation, sharedData?: SharedData, visible = true) {
//     super();
//     this.id = index;
//     this.parent = parent;
//     this._internalId = index;
//     this._visible = visible;
//     if (color !== undefined) this.setColor(color);

//     if (sharedData) {
//       // used by InstancedLOD
//       this.position = sharedData.position;
//       this.scale = sharedData.scale;
//       this.quaternion = sharedData.quaternion;
//     } else {
//       this.position = new Vector3();
//       this.scale = new Vector3(1, 1, 1);
//       this.quaternion = new Quaternion();
//     }
//   }

//   public updateMatrix(): void {
//     this.parent.updateInstanceMatrix(this);
//   }

//   public forceUpdateMatrix(): void {
//     this.parent.forceUpdateInstanceMatrix(this);
//   }

//   public setColor(color: ColorRepresentation): void {
//     this.parent.setColorAt(this._internalId, _c.set(color));
//   }

//   public getColor(color = _c): Color {
//     this.parent.getColorAt(this._internalId, color);
//     return color;
//   }

//   public applyMatrix4(m: Matrix4): this {
//     _m.compose(this.position, this.quaternion, this.scale); // or get it from array but is not updated
//     _m.premultiply(m);
//     _m.decompose(this.position, this.quaternion, this.scale);
//     this.parent.setMatrixAt(this._internalId, _m);
//     return this;
//   }
// }

// SharedInstancedEntity.prototype.isSharedInstancedEntity = true;
// SharedInstancedEntity.prototype.type = 'SharedInstancedEntity';
