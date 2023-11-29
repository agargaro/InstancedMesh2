import { Main, PerspectiveCameraAuto, Asset } from '@three.ez/main';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { InstancedEntity } from './InstancedEntity';
import { BufferGeometry, BufferGeometryLoader, MeshNormalMaterial, Scene, Vector3 } from 'three';
import { InstancedMesh2 } from './InstancedMesh2';

// USUAL BORING PART

const main = new Main({ rendererParameters: { antialias: true } }); // init renderer and other stuff
const scene = new Scene();
const camera = new PerspectiveCameraAuto(70).translateZ(30);
new OrbitControls(camera, main.renderer.domElement);
main.createView({ scene, camera, backgroundColor: 'white', enabled: false });

// INTERESTING PART

const monkeyPath = 'https://threejs.org/examples/models/json/suzanne_buffergeometry.json';
const geometry = await Asset.load<BufferGeometry>(BufferGeometryLoader, monkeyPath);
geometry.computeVertexNormals();

class Monkey extends InstancedEntity {
  constructor(parent: InstancedMesh2, index: number) {
    super(parent, index);
    this.position.x += index * 5 - 20;
    this.scale.setScalar(2);
    this.updateMatrix();
  }
}

const monkeys = new InstancedMesh2(geometry, new MeshNormalMaterial(), 10, Monkey);
scene.add(monkeys);

monkeys.instances[2].visible = false;
monkeys.instances[4].rotateOnWorldAxis(new Vector3(1, 0, 0), Math.PI);
monkeys.instances[4].updateMatrix();
monkeys.instances[7].position.y += 2;
monkeys.instances[7].scale.multiplyScalar(1.2);
monkeys.instances[7].updateMatrix();
