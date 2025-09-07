import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const TestBack = () => {
  const mountRef = useRef(null);

  useEffect(() => {

    const clock = new THREE.Clock();

    function animate() {
      const t = clock.getElapsedTime();
      gridUniforms.time.value = t;
      gridUniforms.cameraPos.value.copy(camera.position);

      controls.update();
      composer.render();
      frameId = requestAnimationFrame(animate);

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

export default TestBack;
