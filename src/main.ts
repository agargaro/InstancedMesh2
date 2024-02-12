import { Asset, Main, OrthographicCameraAuto } from '@three.ez/main';
import { Box3Helper, BufferGeometry, BufferGeometryLoader, MeshNormalMaterial, Scene } from 'three';
import { InstancedMesh2 } from './InstancedMesh2';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new Scene().activeSmartRendering();
const camera = new OrthographicCameraAuto(100).translateZ(10);
const main = new Main();

const monkeyPath = 'https://threejs.org/examples/models/json/suzanne_buffergeometry.json';
const geometry = await Asset.load<BufferGeometry>(BufferGeometryLoader, monkeyPath);
geometry.computeVertexNormals();

const monkeys = new InstancedMesh2(geometry, new MeshNormalMaterial(), 1000000, (obj, index) => {
  obj.position.randomDirection().multiplyScalar(Math.random() * 1000 + 10);
  // obj.scale.setScalar(2);
  obj.forceUpdateMatrix();
});
scene.add(monkeys);

main.createView({
  scene, camera, enabled: false, onBeforeRender: () => {
    camera.updateMatrixWorld(true);
    monkeys.updateCulling(camera);
  }
});

const controls = new OrbitControls(camera, main.renderer.domElement);
scene.on(['pointerdown', 'pointerup', 'dragend'], (e) => (controls.enabled = e.type === 'pointerdown' ? e.target === scene : true));

// function traverse(node: Node): void {
//   if (!node) return;
//   monkeys.add(new Box3Helper(node.bbox, 0xffff00));
//   traverse(node.left);
//   traverse(node.right);
// }

// traverse(monkeys._bvh.root);