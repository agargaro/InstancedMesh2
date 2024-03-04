# three.ez - InstancedMesh2

[![npm](https://img.shields.io/npm/v/@three.ez/instanced-mesh)](https://www.npmjs.com/package/@three.ez/instanced-mesh)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=agargaro_three.ez&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=agargaro_three.ez)
[![DeepScan grade](https://deepscan.io/api/teams/21196/projects/25445/branches/796375/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=21196&pid=25445&bid=796375)
[![Stars](https://badgen.net/github/stars/agargaro/three.ez)](https://github.com/agargaro/three.ez)
[![BundlePhobia](https://badgen.net/bundlephobia/min/@three.ez/instanced-mesh)](https://bundlephobia.com/package/@three.ez/instanced-mesh)
[![Discord](https://img.shields.io/discord/1150091562227859457)](https://discord.gg/MVTwrdX3JM)

`InstancedMesh2` extends the functionality of `InstancedMesh`, providing streamlined control over instance **transformations and visibility**, while also integrating **frustum culling** for enhanced performance.

```typescript
import { CullingDynamic, InstancedMesh2 } from '@three.ez/instanced-mesh';

const myInstancedMesh = new InstancedMesh2(geometry, material, 100000, {
  behaviour: CullingDynamic,
  onInstanceCreation: (obj, index) => {
    obj.position.random();
    obj.scale.setScalar(2);
    obj.quaternion.random();
  }
});

myInstancedMesh.instances[0].visible = false;

myInstancedMesh.instances[1].rotateX(Math.PI);
myInstancedMesh.instances[1].updateMatrix();
```

This library has only one dependency: `three.js r151+`.

## 🔑 Key Features

### ✨ [Event Programming](https://stackblitz.com/edit/three-ez-events?file=src%2Fmain.ts)
Add interactions to `Object3D` through programmable events, similar to `DOM events`, including a propagation system. <br />
See events list here: [Interaction](https://agargaro.github.io/three.ez/docs/tutorial/events/interaction), [Miscellaneous](https://agargaro.github.io/three.ez/docs/tutorial/events/misc), [Update](https://agargaro.github.io/three.ez/docs/tutorial/events/update).

```typescript
const box = new Mesh(geometry, material);
box.on('click', (e) => e.stopPropagation());
box.on('animate', (e) => console.log('animate'));
box.on('positionchange', () => console.log('position changed'));
```     

### 🔥 Drag and Drop
Integrate drag and drop functionality. The drag is cancelled by pressing *ESC*.

```typescript
const box = new Mesh(geometry, material);
box.draggable = true;
box.findDropTarget = true;
box.on('drag', (e) => console.log(`new position: ${e.position}`));

const plane = new Mesh(geometry, material);
plane.on('drop', (e) => console.log(`obj dropped on this: ${e.relatedTarget}`));
```     

### 🚀 Focus and Blur
Enhance interactivity with focus and blur events.   

```typescript
const box = new Mesh(geometry, material);
box.focusable = true; // default is true
box.on('focus', (e) => console.log('focused'));
box.on('blur', (e) => console.log('focus lost'));
``` 

## ⬇️ Installation

You can install it via npm using the following command:

```bash
npm install @three.ez/instanced-mesh
```

Or can import it from CDN:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.162.0/build/three.module.js",
    "three/examples/jsm": "https://unpkg.com/three@0.162.0/examples/jsm/",
    "@three.ez/instanced-mesh": "https://unpkg.com/@three.ez/instanced-mesh@0.0.1/bundle.js"
  }
}
</script>
```

## 🧑‍💻 Live Examples

These examples use `vite`, and some mobile devices may run out of memory.

- [Forest with 1kk trees]([https://stackblitz.com/edit/three-ez-template?file=src%2Fmain.ts](https://stackblitz.com/edit/three-ez-instancedmesh2-forest-1kk-trees?file=src%2Fmain.ts))

## 📚 Documentation

The tutorial is available [here](https://agargaro.github.io/three.ez/docs/tutorial) *(work in progress)*. <br />
The API documentation is available [here](https://agargaro.github.io/three.ez/docs/api). 

## 🤝 Contributing

Any help is highly appreciated. If you would like to contribute to this package or report problems, feel free to open a bug or pull request.

## ❔ Questions?

If you have questions or need assistance, you can ask on our [discord server](https://discord.gg/MVTwrdX3JM).

## ⭐ Like it?

If you find this project helpful, I would greatly appreciate it if you could leave a star on this repository! <br />
This helps me know that you appreciate my work and encourages me to continue improving it. <br />
Thank you so much for your support! 🌟
