import { Asset, Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BoxGeometry, BufferGeometry, BufferGeometryLoader, MeshNormalMaterial, Scene } from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';
import { InstanceMesh2Behaviour, InstancedMesh2 } from './InstancedMesh2';

const main = new Main({ rendererParameters: { antialias: true } }); // init renderer and other stuff
const scene = new Scene();
const camera = new PerspectiveCameraAuto(70);

const controls = new FlyControls(camera, main.renderer.domElement);
controls.rollSpeed = Math.PI / 4;
controls.movementSpeed = 50;
scene.on('animate', (e) => controls.update(e.delta));

const monkeyPath = 'https://threejs.org/examples/models/json/suzanne_buffergeometry.json';
const monkeyGeometry = await Asset.load<BufferGeometry>(BufferGeometryLoader, monkeyPath);
monkeyGeometry.computeVertexNormals();

const monkeys = new InstancedMesh2({
  geometry: new BoxGeometry(),
  material: new MeshNormalMaterial(),
  count: 90000,
  behaviour: InstanceMesh2Behaviour.static,
  onCreateEntity: (obj, index) => {
    obj.position.randomDirection().multiplyScalar(Math.random() * 5000 + 100);
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
