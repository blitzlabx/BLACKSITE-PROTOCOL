import {
  BackSide,
  BoxGeometry,
  InstancedMesh,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  PointLight,
  Scene,
} from 'three';

function createAreaLightMaterial(intensity) {
  return new MeshLambertMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveIntensity: intensity,
  });
}

export class RoomEnvironment extends Scene {
  constructor() {
    super();
    this.name = 'RoomEnvironment';
    this.position.y = -3.5;

    const geometry = new BoxGeometry();
    geometry.deleteAttribute('uv');

    const roomMaterial = new MeshStandardMaterial({ side: BackSide });
    const boxMaterial = new MeshStandardMaterial();

    const mainLight = new PointLight(0xffffff, 900, 28, 2);
    mainLight.position.set(0.418, 16.199, 0.3);
    this.add(mainLight);

    const room = new Mesh(geometry, roomMaterial);
    room.position.set(-0.757, 13.219, 0.717);
    room.scale.set(31.713, 28.305, 28.591);
    this.add(room);

    const boxes = new InstancedMesh(geometry, boxMaterial, 6);
    const transform = new Object3D();

    const defs = [
      [-10.906, 2.009, 1.846, 0, -0.195, 0, 2.328, 7.905, 4.651],
      [-5.607, -0.754, -0.758, 0, 0.994, 0, 1.97, 1.534, 3.955],
      [6.167, 0.857, 7.803, 0, 0.561, 0, 3.927, 6.285, 3.687],
      [-2.017, 0.018, 6.124, 0, 0.333, 0, 2.002, 4.566, 2.064],
      [2.291, -0.756, -2.621, 0, -0.286, 0, 1.546, 1.552, 1.496],
      [-2.193, -0.369, -5.547, 0, 0.516, 0, 3.875, 3.487, 2.986],
    ];

    for (let i = 0; i < defs.length; i++) {
      const [px, py, pz, rx, ry, rz, sx, sy, sz] = defs[i];
      transform.position.set(px, py, pz);
      transform.rotation.set(rx, ry, rz);
      transform.scale.set(sx, sy, sz);
      transform.updateMatrix();
      boxes.setMatrixAt(i, transform.matrix);
    }
    this.add(boxes);

    const lights = [
      [-16.116, 14.37, 8.208, 0.1, 2.428, 2.739, 50],
      [-16.109, 18.021, -8.207, 0.1, 2.425, 2.751, 50],
      [14.904, 12.198, -1.832, 0.15, 4.265, 6.331, 17],
      [-0.462, 8.89, 14.52, 4.38, 5.441, 0.088, 43],
      [3.235, 11.486, -12.541, 2.5, 2.0, 0.1, 20],
      [0.0, 20.0, 0.0, 1.0, 0.1, 1.0, 100],
    ];

    for (const [px, py, pz, sx, sy, sz, intensity] of lights) {
      const m = new Mesh(geometry, createAreaLightMaterial(intensity));
      m.position.set(px, py, pz);
      m.scale.set(sx, sy, sz);
      this.add(m);
    }
  }

  dispose() {
    const resources = new Set();
    this.traverse((object) => {
      if (object.isMesh) {
        resources.add(object.geometry);
        resources.add(object.material);
      }
    });
    for (const resource of resources) {
      resource.dispose();
    }
  }
}
