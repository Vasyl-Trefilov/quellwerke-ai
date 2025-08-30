import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as CANNON from "cannon-es";

const NeonCubes = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    // === Scene + Camera ===
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.y = 2;
    camera.position.x = 10;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (mountRef.current && !mountRef.current.hasChildNodes()) {
      mountRef.current.appendChild(renderer.domElement);
    }

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    scene.add(light);

    // Floor mesh
    // const floorGeometry = new THREE.PlaneGeometry(1, 1);
    // const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    // const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    // floorMesh.rotation.x = -Math.PI / 2;
    // scene.add(floorMesh);

    // Cube mesh
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffcc });
    const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    // scene.add(cubeMesh);

    // === Cannon.js setup ===
    const world = new CANNON.World();
    world.gravity.set(0, -0.3, 0);

    // Floor body
    // const floorBody = new CANNON.Body({
    //   type: CANNON.Body.STATIC, // immovable
    //   shape: new CANNON.Plane(),
    // });
    // floorBody.position.set(0, -10, 0);
    // floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // rotate to lie flat
    // world.addBody(floorBody);
    let objects = [];
    for (let i = 0; i < 50; i++) {
      // Random cube size
      const cubeSize = Math.random() * 1.5 + 0.2; // avoid size 0
      const meshGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const mesh = new THREE.Mesh(meshGeo, cubeMaterial.clone());

      // Random emissive color
      mesh.material.emissive = new THREE.Color(
        `hsl(${Math.random() * 100 + 130}, 100%, 50%)`
      );

      // Random position
      mesh.position.set(
        (Math.random() - 0.8) * 10,
        10 + i,
        (Math.random() - 0.5) * 10
      );

      // Random rotation
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      scene.add(mesh);

      // Physics body with matching size
      const half = cubeSize / 2;
      const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(half, half, half)),
        position: new CANNON.Vec3(
          mesh.position.x,
          mesh.position.y,
          mesh.position.z
        ),
      });

      // Copy rotation so physics matches mesh
      body.quaternion.copy(mesh.quaternion);

      world.addBody(body);
      objects.push({ mesh, body });
    }

    // === Animation loop ===
    let frameId;
    const clock = new THREE.Clock();
    function animate() {
      frameId = requestAnimationFrame(animate);

      // Step physics
      const delta = clock.getDelta();
      world.step(1 / 30, delta, 3);

      // Sync cube mesh to physics body
      objects.forEach((o) => {
        if (o.body.position.y < -20) {
          o.body.position.set(
            (Math.random() - 0.8) * 10,
            15,
            (Math.random() - 0.5) * 20
          );
          o.body.velocity.set(0, 0, 0);
        }
        o.mesh.position.copy(o.body.position);
        o.mesh.quaternion.copy(o.body.quaternion);
      });

      renderer.render(scene, camera);
    }

    animate();

    // === Handle resize ===
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // === Cleanup ===
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }

      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 4,
        pointerEvents: "none",
      }}
    />
  );
};

export default NeonCubes;
