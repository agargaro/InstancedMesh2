import { Main, PerspectiveCameraAuto } from '@three.ez/main';
import { MeshStandardMaterial, PointLight, Scene, SphereGeometry } from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';
import { Behaviour, InstanceMesh2Behaviour, InstancedMesh2 } from './InstancedMesh2';

const spawn_size = 5000;
const count = 135000;

const main = new Main({ rendererParameters: { antialias: true } }); // init renderer and other stuff
const scene = new Scene();
const camera = new PerspectiveCameraAuto(70, 0.1, 1000);
const light = new PointLight('white', 15, 0, 0.8);
camera.add(light);

const controls = new FlyControls(camera, main.renderer.domElement);
controls.rollSpeed = Math.PI / 4;
controls.movementSpeed = 50;
scene.on('animate', (e) => controls.update(e.delta));

light.tween<PointLight>().to(2000, { color: 0xffffcc }).yoyoForever().start();

const boxes = new InstancedMesh2({
  geometry: new SphereGeometry(1, 16, 16),
  material: new MeshStandardMaterial({ metalness: 0.5, roughness: 0.6 }),
  count,
  behaviour: Behaviour.static,
  onInstanceCreation: (obj, index) => {
    obj.position
      .random()
      .multiplyScalar(spawn_size)
      .subScalar(spawn_size / 2);
    obj.scale.setScalar(Math.random() * 4 + 0.1);
  },
});

scene.add(boxes);

const onBeforeRender = () => {
  camera.updateMatrixWorld(true);
  boxes.updateCulling(camera);
};

main.createView({ scene, camera, enabled: false, onBeforeRender });
