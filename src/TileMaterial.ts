import { ShaderMaterial, Texture, Vector2 } from 'three';

export class TileMaterial extends ShaderMaterial {
  public override vertexShader = `
    varying vec2 vUv;
    varying vec2 vOffset;
    attribute vec2 offset;

    void main() {
      vUv = uv;
      vOffset = offset;
      gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    }`;

  public override fragmentShader = `
    varying vec2 vUv;
    varying vec2 vOffset;
    uniform sampler2D map;
    uniform vec2 tileSize;

    void main() {
      gl_FragColor = texture2D(map, vUv * tileSize + vOffset * tileSize);
    }`;

  constructor(tilemap: Texture, tileSizeX: number, tileSizeY: number) {
    super();
    this.uniforms.map = { value: tilemap };
    this.uniforms.tileSize = { value: new Vector2(tileSizeX / tilemap.image.width, tileSizeY / tilemap.image.height) };
  }
}
