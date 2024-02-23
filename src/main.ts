import { Asset, Main, PerspectiveCameraAuto } from '@three.ez/main';
import { BufferGeometry, Fog, Mesh, MeshPhongMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, Scene } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Behaviour, InstancedMesh2 } from './InstancedMesh2';

const spawn_size = 50000;
const count = 500000;

const main = new Main({ rendererParameters: { antialias: true } }); // init renderer and other stuff
const scene = new Scene();
const camera = new PerspectiveCameraAuto(70, 0.1, 4000).translateY(300).translateX(500);
scene.fog = new Fog('gray', 500, 3000);
const light = new PointLight('white', 10, 0, 0.1);
camera.add(light);

const treeGLTF = (await Asset.load<GLTF>(GLTFLoader, 'tree.glb')).scene.children[0] as Mesh<BufferGeometry, MeshStandardMaterial>;

const trees = new InstancedMesh2({
  geometry: treeGLTF.geometry,
  material: treeGLTF.material,
  count,
  behaviour: Behaviour.static,
  onInstanceCreation: (obj, index) => {
    obj.position.setX(Math.random() * spawn_size - spawn_size / 2).setZ(Math.random() * spawn_size - spawn_size / 2);
    obj.scale.setScalar(Math.random() * 0.1 + 0.1);
    obj.rotateY(Math.random() * Math.PI * 2);
  },
});

const terrain = new Mesh(new PlaneGeometry(spawn_size, spawn_size, 10, 10), new MeshPhongMaterial({ color: 0x4d7e47 }));
terrain.rotateX(Math.PI / -2);

scene.add(trees, terrain);

main.createView({
  scene, camera, enabled: false, backgroundColor: 0xb7d9ea, onBeforeRender: () => {
    camera.updateMatrixWorld(true);
    trees.updateCulling(camera);
  }
});

const controls = new MapControls(camera, main.renderer.domElement);
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 100;
controls.maxDistance = 1000;
