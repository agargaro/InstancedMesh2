import { AnimateEvent, Asset, Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BufferGeometry, BufferGeometryLoader, MeshNormalMaterial, Scene, Vector3 } from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';
import { InstancedMesh2 } from './InstancedMesh2';

const main = new Main({ rendererParameters: { antialias: true } }); // init renderer and other stuff
const scene = new Scene();
const camera = new PerspectiveCameraAuto(70);
main.createView({ scene, camera, backgroundColor: 'white', enabled: false });

const controls = new FlyControls(camera, main.renderer.domElement);
controls.rollSpeed = Math.PI / 10;
controls.movementSpeed = 10;
scene.on('animate', (e) => controls.update(e.delta));

const maxCount = 200000;
const config = {
  animate: false,
  count: 10000
};

const monkeyPath = 'https://threejs.org/examples/models/json/suzanne_buffergeometry.json';
const geometry = await Asset.load<BufferGeometry>(BufferGeometryLoader, monkeyPath);
geometry.computeVertexNormals();

const monkeys = new InstancedMesh2(geometry, new MeshNormalMaterial(), maxCount, (obj, index) => {
  obj.position.random().multiplyScalar(500).subScalar(250);
  obj.quaternion.random();
  obj.forceUpdateMatrix();
});

monkeys.setCount(config.count);

monkeys.on('afteranimate', () => monkeys.updateCulling(camera));
scene.add(monkeys);

const zAxis = new Vector3(0, 0, 1);

function animate(e: AnimateEvent) {
  const instances = monkeys.instances;
  for (let i = 0, l = monkeys.internalCount; i < l; i++) {
    const instance = instances[i];
    instance.rotateOnAxis(zAxis, e.delta);
    monkeys.updateInstanceMatrix(instance);
  }
  monkeys.instanceMatrix.needsUpdate = true;
}

const gui = new GUI();
gui.add(config, 'count', 1, maxCount, 10).onChange((value) => monkeys.setCount(value));
gui.add(config, 'animate').onChange((value) => value ? monkeys.on('animate', animate) : monkeys.off('animate', animate));
gui.add(monkeys, 'perObjectFrustumCulled');
