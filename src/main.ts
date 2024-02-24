import { Asset, Main, PerspectiveCameraAuto } from '@three.ez/main';
import { ACESFilmicToneMapping, AmbientLight, BufferGeometry, DirectionalLight, FogExp2, Mesh, MeshStandardMaterial, PlaneGeometry, Scene, Vector3 } from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Sky } from 'three/examples/jsm/objects/Sky';
import { Behaviour, InstancedMesh2 } from './InstancedMesh2';
// import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';

const terrainSize = 10000;
const count = 10000;

const main = new Main({ rendererParameters: { antialias: true } }); // init renderer and other stuff
main.renderer.toneMapping = ACESFilmicToneMapping;
main.renderer.toneMappingExposure = 0.5;

const camera = new PerspectiveCameraAuto(70, 0.1, 4000).translateY(300).translateZ(-900);
const scene = new Scene();

const treeGLTF = (await Asset.load<GLTF>(GLTFLoader, 'tree.glb')).scene.children[0] as Mesh<BufferGeometry, MeshStandardMaterial>;

const trees = new InstancedMesh2({
  geometry: treeGLTF.geometry,
  material: treeGLTF.material,
  count,
  behaviour: Behaviour.static,
  onInstanceCreation: (obj, index) => {
    obj.position.setX(Math.random() * terrainSize - terrainSize / 2).setZ(Math.random() * terrainSize - terrainSize / 2);
    obj.scale.setScalar(Math.random() * 0.1 + 0.1);
    obj.rotateY(Math.random() * Math.PI * 2).rotateZ(Math.random() * 0.3 - 0.15);
  },
});

const terrain = new Mesh(new PlaneGeometry(terrainSize, terrainSize, 10, 10), new MeshStandardMaterial({ color: 0x4d7e47, roughness: 1, metalness: 0 }));
terrain.rotateX(Math.PI / -2);

const sun = new Vector3();
const sky = new Sky();
sky.scale.setScalar(450000);
const uniforms = sky.material.uniforms;
uniforms['turbidity'].value = 10;
uniforms['rayleigh'].value = 3;
uniforms['mieCoefficient'].value = 0.005;
uniforms['mieDirectionalG'].value = 0.7;

sky.on('animate', (e) => {
  sun.setFromSphericalCoords(1, Math.PI / -1.9 + e.total * 0.02, Math.PI / 1.4);
  uniforms['sunPosition'].value.copy(sun);
});

const dirLight = new DirectionalLight('white');
dirLight.on('animate', (e) => {
  dirLight.intensity = 15 - (1 - sun.y) * 15;
  dirLight.position.copy(sun).multiplyScalar(terrainSize);
  dirLight.target.position.copy(sun).multiplyScalar(-terrainSize);
});

scene.add(sky, trees, terrain, new AmbientLight('white', 1.5), dirLight, dirLight.target);

scene.fog = new FogExp2('white', 0.0005);
scene.on('animate', (e) => scene.fog.color.setHSL(0, 0, sun.y));

main.createView({
  scene, camera, enabled: false, backgroundColor: 0x005e2f, onBeforeRender: () => {
    camera.updateMatrixWorld(true);
    trees.updateCulling(camera);
    document.getElementById("count").innerText = trees.count;
  }
});

const controls = new MapControls(camera, main.renderer.domElement);
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 100;
controls.maxDistance = 1000;
