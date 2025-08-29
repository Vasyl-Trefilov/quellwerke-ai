import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

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
    camera.position.y = 30;
    camera.position.x = 10;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (mountRef.current && !mountRef.current.hasChildNodes()) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // === Central Sun ===
    const loader = new GLTFLoader();
    let quellwerkeObj = null;
    loader.load("/models/quellwerke.glb", (gltf) => {
      quellwerkeObj = gltf.scene;

      quellwerkeObj.scale.set(0.8, 0.8, 0.8);
      quellwerkeObj.rotateX(90);
      scene.add(quellwerkeObj);
    });

    // === Lights ===
    const pointLight = new THREE.PointLight(0xffffff, 100);
    pointLight.position.set(0, 5, 0);
    scene.add(pointLight);
    scene.add(new THREE.AmbientLight(0x404040));

    // === Stars ===
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 200;
    }
    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3)
    );
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      sizeAttenuation: true,
    });
    starMaterial.map = new THREE.TextureLoader().load("/textures/star.png");
    starMaterial.transparent = true;
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // === PLANETS CONFIG ===
    const planetConfigs = [
      { file: "/models/javaCup.glb", scale: 8, orbitRadius: 4, speed: 0.8 },
      {
        file: "/models/elephpant.glb",
        scale: 0.2,
        orbitRadius: 6.3,
        speed: 0.6,
      },
      { file: "/models/2.glb", scale: 0.5, orbitRadius: 8.5, speed: 0.4 },
      { file: "/models/0.glb", scale: 0.4, orbitRadius: 10.5, speed: 0.3 },
      { file: "/models/angular.glb", scale: 1.3, orbitRadius: 13, speed: 0.3 },
    ];

    // === Load Planets ===

    const planets = [];

    planetConfigs.forEach((config) => {
      loader.load(config.file, (gltf) => {
        if (config.file === "/models/elephpant.glb") {
          const obj = gltf.scene;

          // Create a new material
          const customMat = new THREE.MeshStandardMaterial({
            color: 0x9834eb,
            metalness: 0.8,
            roughness: 0.2,
          });

          // Apply it to all meshes inside the model
          obj.traverse((child) => {
            if (child.isMesh) {
              child.material = customMat;
            }
          });

          //   obj.scale.set(0.3, 0.3, 0.3);
          obj.scale.set(config.scale, config.scale, config.scale);
          scene.add(obj);
          planets.push({
            obj,
            radius: config.orbitRadius,
            speed: config.speed,
          });
          //   return;
        } else {
          const obj = gltf.scene;
          obj.scale.set(config.scale, config.scale, config.scale);
          scene.add(obj);

          planets.push({
            obj,
            radius: config.orbitRadius,
            speed: config.speed,
          });
        }
      });
    });

    // === Asteroids ===

    const asteroidConfigs = [
      {
        file: "/models/rustcrab.glb",
        count: 1,
        baseRadius: 16,
        spread: 3,
        scale: 0.6,
      },
      {
        file: "/models/react_logo.glb",
        count: 1,
        baseRadius: 16,
        spread: 3,
        scale: 0.3,
      },
      {
        file: "/models/gpt.glb",
        count: 1,
        baseRadius: 16,
        spread: 3,
        scale: 0.7,
      },
    ];

    // === Load Asteroids ===

    const asteroids = [];

    asteroidConfigs.forEach((config) => {
      for (let i = 0; i < config.count; i++) {
        loader.load(config.file, (gltf) => {
          const obj = gltf.scene;
          obj.scale.set(config.scale, config.scale, config.scale);

          // Start somewhere in a ring
          const angle = Math.random() * Math.PI * 2;
          const radius =
            config.baseRadius + (Math.random() - 0.5) * config.spread;
          obj.position.set(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 2,
            Math.sin(angle) * radius
          );

          scene.add(obj);

          const velocity = spawnAsteroidBehindCamera(obj, camera);

          asteroids.push({
            obj,
            velocity,
          });
        });
      }
    });
    function spawnAsteroidBehindCamera(obj, camera) {
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);

      const spawnOffset = 30;
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
      );

      const spawnPos = camera.position
        .clone()
        .sub(forward.multiplyScalar(spawnOffset))
        .add(randomOffset);

      obj.position.copy(spawnPos);

      // Velocity points roughly forward into the scene
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.001,
        (Math.random() - 0.5) * 0.001,
        -((0.5 + Math.random()) * 0.1)
      );

      // Rotate velocity into camera space so they always fly "through" the camera view
      velocity.applyQuaternion(camera.quaternion);

      return velocity;
    }

    // === Animate ===
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;
      if (!quellwerkeObj) return;
      quellwerkeObj.rotation.y += 0.002;
      quellwerkeObj.rotation.z += 0.002;
      stars.rotation.y += 0.0005;

      planets.forEach((planet, i) => {
        const { obj, radius, speed } = planet;
        if (!obj) return;

        obj.position.x = Math.cos(time * speed + i) * radius;
        obj.position.z = Math.sin(time * speed + i) * radius;

        obj.rotation.y += 0.01; // spin
        obj.rotation.x += 0.01;
      });
      if (!asteroids) return;
      asteroids.forEach((asteroid) => {
        if (!asteroid.obj) return;

        asteroid.obj.position.add(asteroid.velocity);

        asteroid.obj.rotation.x += 0.02;
        asteroid.obj.rotation.y += 0.015;

        // If it flies too far past the origin or too far from camera, recycle
        const distanceFromCamera = asteroid.obj.position.distanceTo(
          camera.position
        );
        if (distanceFromCamera > 100) {
          asteroid.velocity = spawnAsteroidBehindCamera(asteroid.obj, camera);
        }
      });

      renderer.render(scene, camera);
    };
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
