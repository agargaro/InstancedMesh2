import { BufferGeometry, Camera, Material, Object3D } from 'three';
import { InstancedEntity, SharedData } from './InstancedEntity';
import { CreateEntityCallback, InstanceMesh2Behaviour, InstancedMesh2 } from './InstancedMesh2';

export interface Level<G, M> {
  geometry: G;
  material: M;
  distance: number;
}

export interface InstancedLODParams<G, M> {
  levels: Level<G, M>[];
  count: number;
  onCreateEntity?: CreateEntityCallback<InstancedEntity>; //TODO migliorare questo generic
  // color?: ColorRepresentation;
  behaviour?: InstanceMesh2Behaviour;
  shared?: SharedData[];
}

export class InstancedLOD<G extends BufferGeometry = BufferGeometry, M extends Material = Material> extends Object3D {
  public declare type: 'InstancedLOD';
  public declare isLOD: true;
  public declare isInstancedLOD: true;
  public autoUpdate = true;
  public instancedMesh: InstancedMesh2[];
  // public instances: SharedData[]; //TODO craere classe
  /** @internal */ public _perObjectFrustumCulled = true;
  // private _bvh: InstancedMeshBVH;
  private _behaviour: InstanceMesh2Behaviour;

  constructor(params: InstancedLODParams<G, M>) {
    if (params === undefined) throw (new Error("params is mandatory"));
    if (params.levels?.length > 1) throw (new Error("levels are mandatory"));
    if (params.count === undefined) throw (new Error("count is mandatory"));

    super();

    const count = params.count;
    const levels = params.levels;
    const onCreateEntity = params.onCreateEntity;
    // const color = params.color !== undefined ? _color.set(params.color) : undefined;
    const shared = params.shared;
    const behaviour = this._behaviour = params.behaviour ?? InstanceMesh2Behaviour.static;

    // this.instances = new Array(count);

    //ottimizzare condividendo entities
    for (const level of levels) {
      this.instancedMesh.push(new InstancedMesh2({
        geometry: level.geometry,
        material: level.material,
        count,
        behaviour,
        shared,
        visible: false,
        // color: 
        // onCreateEntity: 
      }));
    }

    this.frustumCulled = false;  // capire

    // if (this._behaviour === InstanceMesh2Behaviour.static) {
    //   this._bvh = new InstancedMeshBVH(this).build(visible);
    // }
  }

  public update(camera: Camera) {
    // implement
  }
}

InstancedLOD.prototype.isInstancedLOD = true;
InstancedLOD.prototype.isLOD = true;
InstancedLOD.prototype.type = 'InstancedLOD';

//TODO not swap matrix if needsUpdate = true