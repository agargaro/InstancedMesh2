import { Main, PerspectiveCameraAuto, Asset } from '@three.ez/main';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BoxGeometry, InstancedBufferAttribute, NearestFilter, Scene, Texture, TextureLoader } from 'three';
import { InstancedMesh2 } from './InstancedMesh2';
import { TileMaterial } from './TileMaterial';

const main = new Main({ rendererParameters: { antialias: true } }); // init renderer and other stuff
const scene = new Scene();
const camera = new PerspectiveCameraAuto(70).translateZ(30);
new OrbitControls(camera, main.renderer.domElement);
main.createView({ scene, camera, backgroundColor: 'white', enabled: false });

const texture = await Asset.load<Texture>(TextureLoader, 'https://4.bp.blogspot.com/-WPxag7btKpI/TdmNj2tROcI/AAAAAAAAA00/twH8y--dQ24/s1600/terrain.png');
texture.magFilter = NearestFilter;

const size = 64;
const count = size ** 2;
const geometry = new BoxGeometry();
const offset = new Uint16Array(count * 2);
geometry.setAttribute('offset', new InstancedBufferAttribute(offset, 2));

const boxes = new InstancedMesh2(geometry, new TileMaterial(texture, 16, 16), count, (obj, index) => {
  obj.position.x = Math.floor((index - count / 2) / size);
  obj.position.z = (index % size) - size / 2;
  obj.position.y = Math.floor(Math.cos(index / 10) * 4);
  obj.updateMatrix();
  offset[index * 2] = Math.floor(Math.random() * 2);
  offset[index * 2 + 1] = 14 + Math.floor(Math.random() * 2);
});

scene.add(boxes);
