import { Main, PerspectiveCameraAuto, Asset } from '@three.ez/main';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BoxGeometry, InstancedBufferAttribute, NearestFilter, Scene, Texture, TextureLoader } from 'three';
import { InstancedMesh2 } from './InstancedMesh2';
import { TileMaterial } from './TileMaterial';
import { InstancedEntity } from './InstancedEntity';

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
const offset = new Uint8Array(count * 2);
geometry.setAttribute('offset', new InstancedBufferAttribute(offset, 2));

const boxes = new InstancedMesh2(geometry, new TileMaterial(texture, 16, 16), count, (obj: InstancedEntity, index: number) => {
  obj.position.set(Math.floor((index - count / 2) / size), Math.floor(Math.cos(index / 10) * 4), (index % size) - size / 2);
  // obj.position.set(index, 0, 0);
  obj.updateMatrix();
  offset[index * 2] = Math.floor(Math.random() * 2);
  offset[index * 2 + 1] = 14 + Math.floor(Math.random() * 2);
});

// boxes.on('animate', (e) => boxes.instances[Math.floor(Math.random() * count)].visible = false); // three.ez event
boxes.on('animate', (e) => boxes.updateCulling(camera));

scene.add(boxes);
