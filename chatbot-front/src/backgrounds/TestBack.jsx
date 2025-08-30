import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as CANNON from "cannon-es";

const TestBack = () => {
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

    // Cube mesh
    let objects = [];

    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    let rainDrop = null;
    const loader = new GLTFLoader();
    loader.load("/models/raindrop.glb", (gltf) => {
      for (let i = 0; i < 20; i++) {
        // Random cube size
        const drop = gltf.scene.clone();
        const scaleX = Math.random() * 1.5 + 0.2;
        const scaleY = Math.random() + 0.2;
        drop.scale.set(scaleX, scaleY, scaleX);
        const cubeSize = Math.random() * 1.5 + 0.2; // avoid size 0

        // Random position
        drop.position.set(
          (Math.random() - 0.8) * 10,
          10 + i * 4,
          (Math.random() - 0.7) * 10
        );

        scene.add(drop);

        // Physics body with matching size
        const radius = scaleY * 0.2; // adjust to match model proportions
        const body = new CANNON.Body({
          mass: 1,
          shape: new CANNON.Sphere(radius),
          position: new CANNON.Vec3(
            drop.position.x,
            drop.position.y,
            drop.position.z
          ),
        });

        // Copy rotation so physics matches mesh
        body.quaternion.copy(drop.quaternion);

        world.addBody(body);
        objects.push({ drop, body });
      }
    });
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffcc });
    const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    // scene.add(cubeMesh);

    // === Cannon.js setup ===
    const world = new CANNON.World();
    world.gravity.set(0, -9, 4);

    // Floor body
    // const floorBody = new CANNON.Body({
    //   type: CANNON.Body.STATIC, // immovable
    //   shape: new CANNON.Plane(),
    // });
    // floorBody.position.set(0, -10, 0);
    // floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // rotate to lie flat
    // world.addBody(floorBody);

    // === Animation loop ===
    let frameId;
    const clock = new THREE.Clock();
    function animate() {
      frameId = requestAnimationFrame(animate);
      if (Math.random() < 0.0002) {
        // ~once every 5000 frames
        renderer.setClearColor(0xffffff);
        setTimeout(() => renderer.setClearColor(0x000000, 0), 100);
      }

      // Step physics
      const delta = clock.getDelta();
      world.step(1 / 30, delta, 3);

      // Sync cube mesh to physics body
      objects.forEach((o) => {
        const vel = o.body.velocity.clone();
        if (vel.length() > 0.01) {
          const axis = new CANNON.Vec3(0, -1, 0); // default "down"
          const q = new CANNON.Quaternion();
          q.setFromVectors(axis, vel.unit()); // rotate from down → velocity
          o.drop.quaternion.copy(q);
        }

        if (o.body.position.y < -20) {
          o.body.position.set(
            (Math.random() - 0.8) * 10,
            10,
            (Math.random() - 0.7) * 20
          );
          o.body.velocity.set(0, 0, 0);
        }
        o.drop.position.copy(o.body.position);
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

export default TestBack;
