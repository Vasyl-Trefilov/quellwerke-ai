import { useEffect, useRef } from "react";
import * as THREE from "three";

const ThreeBack = () => {
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
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0); // transparent background
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (mountRef.current && !mountRef.current.hasChildNodes()) {
      mountRef.current.appendChild(renderer.domElement);
    }

    // === Stars ===
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 6000;
    const starPositions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i++) {
      // Random spread in space
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

    // === Example central object (torus) ===
    // const geometry = new THREE.TorusKnotGeometry(1, 0.3, 128, 16);
    // const material = new THREE.MeshStandardMaterial({
    //   color: 0x8844ff,
    //   metalness: 0.6,
    //   roughness: 0.2,
    // });
    // const torusKnot = new THREE.Mesh(geometry, material);
    // scene.add(torusKnot);

    // === Lights ===
    const pointLight = new THREE.PointLight(0xffffff, 1.2);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    scene.add(new THREE.AmbientLight(0x404040));

    // === Animate ===
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Rotate central object
      //   torusKnot.rotation.x += 0.01;
      //   torusKnot.rotation.y += 0.01;

      // Slight starfield movement for "depth"
      stars.rotation.x += 0.0005;
      stars.rotation.y += 0.0007;

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
      starGeometry.dispose();
      starMaterial.dispose();
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

export default ThreeBack;
