import {
  isHostResponse,
  type HostPort,
  type HostRequest,
  type HostResponse,
} from "./protocol.js";

declare global {
  interface Window {
    fontPreviewerHost?: HostPort;
  }
}

let simulatedImportSerial = 0;

const browserPort: HostPort = {
  async request(request: HostRequest): Promise<HostResponse> {
    switch (request.type) {
      case "open-import": {
        simulatedImportSerial += 1;
        return {
          type: "import-result",
          sources: [
            {
              id: `source:browser-simulation:${simulatedImportSerial}`,
              displayName: `Imported trial ${simulatedImportSerial}`,
              state: "available",
            },
          ],
        };
      }
      case "native-undo":
        document.execCommand("undo");
        return { type: "ack", action: "native-undo" };
      case "reload-studio":
        window.setTimeout(() => window.location.reload(), 30);
        return { type: "ack", action: "reload-studio" };
      case "probe":
        return { type: "probe-result", serial: request.serial, host: "browser" };
    }
  },
  onMenuCommand() {
    return () => undefined;
  },
};

export function getHostPort(): HostPort {
  const rawPort = window.fontPreviewerHost ?? browserPort;
  return {
    async request(request) {
      const response: unknown = await rawPort.request(request);
      if (!isHostResponse(response)) {
        throw new Error("Host returned an invalid response");
      }
      return response;
    },
    onMenuCommand(listener) {
      return rawPort.onMenuCommand(listener);
    },
  };
}
