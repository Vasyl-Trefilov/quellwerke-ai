import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const BlackHole = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    // === Scene + Camera ===
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    camera.position.set(190, -80, -110);
    camera.lookAt(0, -90, -110);
    camera.rotation.x += 0.5;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (mountRef.current && !mountRef.current.hasChildNodes()) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // === Controls ===
    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enableDamping = true;
    // controls.dampingFactor = 0.05;
    // controls.enablePan = true;
    // controls.enableZoom = true;
    // controls.autoRotate = false; // set true if you want auto-spin
    // controls.autoRotateSpeed = 0.5;
    // const size = 500;
    // const divisions = 10;

    // const gridHelper = new THREE.GridHelper(size, divisions);
    // scene.add(gridHelper);
    // === Uranus ===
    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    let uranus = null;
    const uranusGroup = new THREE.Group();
    scene.add(uranusGroup);

    loader.load("/models/uranus.glb", (gltf) => {
      uranus = gltf.scene;

      // Load texture

      // uranus.traverse((child) => {
      //   if (child.isMesh) {
      //     child.material = new THREE.MeshStandardMaterial({
      //       color: 0x88ccff, // base color (light-blue for Uranus)
      //       metalness: 1, // very metallic
      //       roughness: 0.5, // medium shiny
      //     });
      //   }
      // });

      // Apply tilt to the mesh itself
      // uranus.rotation.z = Math.PI / 3;
      uranus.rotation.x = -Math.PI / 2;
      uranus.scale.set(0.3, 0.3, 0.3);
      uranus.position.set(0, -100, 0);
      // Add mesh into group (pivot)
      uranusGroup.add(uranus);
    });

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 6000;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 500 + Math.random() * 1500; // radius of star sphere
      const theta = Math.random() * Math.PI * 2; // azimuth
      const phi = Math.acos(2 * Math.random() - 1); // polar

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;
    }

    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3)
    );

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 4, // make them bigger so you see them
      sizeAttenuation: true,
      depthWrite: false, // prevent z-buffer hiding them
      blending: THREE.AdditiveBlending, // stars glow
      map: new THREE.TextureLoader().load("/textures/star.png"),
      transparent: true,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // === Lights ===
    // Sunlight (main directional)
    // const sunLight = new THREE.DirectionalLight(0xffffff, 0.4);
    // sunLight.position.set(100, 500, 100);
    // scene.add(sunLight);
    // scene.add(new THREE.DirectionalLightHelper(sunLight, 50, 0xffcc00));

    // // Fill light
    // const fillLight = new THREE.DirectionalLight(0x88aaff, 0.5);
    // fillLight.position.set(-300, -200, -100);
    // scene.add(fillLight);
    // scene.add(new THREE.DirectionalLightHelper(fillLight, 30, 0x88aaff));

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 1);
    rimLight.position.set(-200, 300, -300);

    // Set the target position
    const targetObject = new THREE.Object3D();
    targetObject.position.set(0, -80, 0);
    scene.add(targetObject);

    rimLight.target = targetObject;

    scene.add(rimLight);
    // scene.add(new THREE.DirectionalLightHelper(rimLight, 40, 0x66ccff));

    // Ambient boost
    const ambient = new THREE.AmbientLight(0x222233, 0.4);
    scene.add(ambient);

    // Hemisphere light (sky/ground mix)
    const hemiLight = new THREE.HemisphereLight(0x6666ff, 0x222200, 0.4);
    scene.add(hemiLight);
    // scene.add(new THREE.HemisphereLightHelper(hemiLight, 60));

    // === Animate ===
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      stars.rotation.y += 0.0005;

      // controls.update();

      if (uranus) {
        uranusGroup.rotation.y += 0.0005; // clean spin around world Y
      }

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
      // controls.dispose();

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
        pointerEvents: "auto", // enable mouse controls
      }}
    />
  );
};

export default BlackHole;
