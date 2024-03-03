import { Main, OrthographicCameraAuto } from '@three.ez/main';
import { BoxGeometry, MeshBasicMaterial, Scene, Vector3 } from 'three';
import { BehaviourStatic, InstancedMesh2 } from './InstancedMesh2';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const main = new Main({ rendererParameters: { antialias: true } });
const camera = new OrthographicCameraAuto(10).translateZ(0.1);
const scene = new Scene();

const yAxis = new Vector3(0, 1, 0);
const boxes = new InstancedMesh2(new BoxGeometry(), new MeshBasicMaterial({ color: 'red' }), 4, {
  behaviour: BehaviourStatic,
  onInstanceCreation: (obj, index) => {
    obj.position.set(0, 0, 5).applyAxisAngle(yAxis, Math.PI / 2 * index);
  }
});

boxes.instances[2].visible = false;

scene.add(boxes);

main.createView({
  scene, camera, backgroundColor: 'white', onBeforeRender: () => {
    camera.updateMatrixWorld(true);
    boxes.updateCulling(camera);
  }
});

const controls = new OrbitControls(camera, main.renderer.domElement);
