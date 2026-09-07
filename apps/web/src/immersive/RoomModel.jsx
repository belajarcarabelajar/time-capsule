import React, { useEffect, useState } from "react";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { disposeRoomResources } from "./roomResources.js";
import AmbientActivity from './AmbientActivity.jsx';

export default function RoomModel({
  url,
  onReady,
  onError,
  roomId,
  motionEnabled = false,
  loader: Loader = GLTFLoader,
}) {
  const [scene, setScene] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let ownedScene;
    setScene(null);
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Room asset unavailable");
        const bytes = await response.arrayBuffer();
        if (!active) return;
        const model = await new Loader().parseAsync(
          bytes,
          new URL(".", new URL(url, window.location.href)).href,
        );
        if (!active) {
          disposeRoomResources(model.scene);
          return;
        }
        ownedScene = model.scene;
        setScene(model.scene);
      } catch (error) {
        if (active) onError(error);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      if (ownedScene) disposeRoomResources(ownedScene);
    };
  }, [url, onError]);
  useEffect(() => {
    if (scene) onReady();
  }, [scene, onReady]);
  return scene ? <>
    <primitive object={scene} dispose={null} />
    {roomId && <AmbientActivity scene={scene} roomId={roomId} enabled={motionEnabled} />}
  </> : null;
}
