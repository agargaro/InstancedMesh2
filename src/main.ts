import { Asset, Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BufferGeometry, BufferGeometryLoader, MeshNormalMaterial, Scene, Vector3 } from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';
import { InstancedMesh2 } from './InstancedMesh2';
import { InstancedEntity } from './InstancedEntity';

const main = new Main({ rendererParameters: { antialias: true } }); // init renderer and other stuff
const scene = new Scene();
const camera = new PerspectiveCameraAuto(70);
main.createView({ scene, camera, backgroundColor: 'white', enabled: false });

const controls = new FlyControls(camera, main.renderer.domElement);
controls.rollSpeed = Math.PI / 10;
controls.movementSpeed = 10;
scene.on('animate', (e) => controls.update(e.delta));

const monkeyPath = 'https://threejs.org/examples/models/json/suzanne_buffergeometry.json';
const geometry = await Asset.load<BufferGeometry>(BufferGeometryLoader, monkeyPath);
geometry.computeVertexNormals();

const monkeys = new InstancedMesh2<InstancedEntity & { test: boolean }>(geometry, new MeshNormalMaterial(), 50000, (obj, index) => {
  obj.position.random().multiplyScalar(500).subScalar(250);
  obj.quaternion.random();
  obj.updateMatrix();
});

const zAxis = new Vector3(0, 0, 1);

monkeys.on('animate', (e) => {
  const instances = monkeys.instances;
  for (let i = 0, l = instances.length; i < l; i++) {
    instances[i].rotateOnAxis(zAxis, e.delta); //example how to handle instances
    instances[i].updateMatrix();
  }
  monkeys.instanceMatrix.needsUpdate = true;
});

monkeys.on('afteranimate', () => monkeys.updateCulling(camera));

scene.add(monkeys);

// monkeys.perObjectFrustumCulled = false; default is true