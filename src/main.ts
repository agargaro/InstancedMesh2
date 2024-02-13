import { Asset, Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BufferGeometry, BufferGeometryLoader, MeshNormalMaterial, Scene } from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';
import { InstancedMesh2 } from './InstancedMesh2';

const main = new Main({ rendererParameters: { antialias: true } }); // init renderer and other stuff
const scene = new Scene();
const camera = new PerspectiveCameraAuto(70);

const controls = new FlyControls(camera, main.renderer.domElement);
controls.rollSpeed = Math.PI / 10;
controls.movementSpeed = 10;
scene.on('animate', (e) => controls.update(e.delta));

const monkeyPath = 'https://threejs.org/examples/models/json/suzanne_buffergeometry.json';
const monkeyGeometry = await Asset.load<BufferGeometry>(BufferGeometryLoader, monkeyPath);
monkeyGeometry.computeVertexNormals();

const monkeys = new InstancedMesh2({
  geometry: monkeyGeometry,
  material: new MeshNormalMaterial(),
  count: 100000,
  onCreateEntity: (obj, index) => {
    obj.position.random().multiplyScalar(500).subScalar(250);
    obj.quaternion.random();
  }
});

scene.add(monkeys);

main.createView({
  scene,
  camera,
  enabled: false,
  backgroundColor: 'white',
  onBeforeRender: () => {
    camera.updateMatrixWorld(true);
    monkeys.updateCulling(camera);
  },
});
