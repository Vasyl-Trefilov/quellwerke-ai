import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const Mountains = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    // === Scene + Camera ===
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.y = 39.61240002254779;
    camera.position.x = 231.6383613329229;
    camera.position.z = -112.66631857790611;
    camera.lookAt(40, 20, 0);
    // x: 231.6383613329229, y: 39.61240002254779, z: -112.66631857790611
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (mountRef.current && !mountRef.current.hasChildNodes()) {
      mountRef.current.appendChild(renderer.domElement);
    }

    const light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.position.set(10, 10, 10);
    scene.add(light);
    // scene.add(new THREE.DirectionalLightHelper(light));
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 6000;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 500 + Math.random() * 1500; 
      const theta = Math.random() * Math.PI * 2; 
      const phi = Math.acos(2 * Math.random() - 1); 

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
    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enableDamping = true;
    // controls.dampingFactor = 0.05;
    // controls.enablePan = true;
    // controls.enableZoom = true;
    // controls.autoRotate = false; 
    // controls.autoRotateSpeed = 0.5;
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 4, 
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending, 
      map: new THREE.TextureLoader().load("/textures/star.png"),
      transparent: true,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    const loader = new GLTFLoader();
    loader.load("/models/mount.glb", (gltf) => {
      // Random cube size
      const mount = gltf.scene.clone();
      scene.add(mount);
    });

    // === Animation loop ===
    let frameId;
    const clock = new THREE.Clock();
    function animate() {
      frameId = requestAnimationFrame(animate);
      stars.rotation.y += 0.0005;
      // controls.update();
      // const position = new THREE.Vector3();
      // camera.getWorldPosition(position);
      // console.log(position);
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
        pointerEvents: "auto",
      }}
    />
  );
};

export default Mountains;
