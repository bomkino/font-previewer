import { contextBridge, ipcRenderer } from "electron";
import {
  isHostRequest,
  isHostResponse,
  isMenuCommand,
  type HostPort,
  type MenuCommand,
} from "../src/protocol.js";

const hostPort: HostPort = {
  async request(request) {
    if (!isHostRequest(request)) throw new Error("Invalid HostBridge request");
    const response: unknown = await ipcRenderer.invoke("host:request", request);
    if (!isHostResponse(response)) throw new Error("Invalid HostBridge response");
    return response;
  },
  onMenuCommand(listener) {
    const wrapped = (_event: Electron.IpcRendererEvent, value: unknown) => {
      if (isMenuCommand(value)) listener(value as MenuCommand);
    };
    ipcRenderer.on("host:menu-command", wrapped);
    return () => ipcRenderer.removeListener("host:menu-command", wrapped);
  },
};

contextBridge.exposeInMainWorld("fontPreviewerHost", hostPort);
