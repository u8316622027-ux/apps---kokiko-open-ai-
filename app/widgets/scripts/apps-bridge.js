(() => {
  const hostWindow = window.parent;

  if (hostWindow === window) {
    return;
  }

  const initializeRequestId = "kokiko-ui-initialize";
  let initialized = false;

  const notifyInitialized = () => {
    if (initialized) {
      return;
    }

    initialized = true;
    hostWindow.postMessage(
      {
        jsonrpc: "2.0",
        method: "ui/notifications/initialized",
        params: {},
      },
      "*",
    );
  };

  const handleHostMessage = (event) => {
    if (event.source !== hostWindow) {
      return;
    }

    const message = event.data;
    if (
      message?.jsonrpc !== "2.0" ||
      message.id !== initializeRequestId ||
      !message.result
    ) {
      return;
    }

    notifyInitialized();
  };

  window.addEventListener("message", handleHostMessage);
  hostWindow.postMessage(
    {
      jsonrpc: "2.0",
      id: initializeRequestId,
      method: "ui/initialize",
      params: {
        appInfo: { name: "Kokiko", version: "1.0.0" },
        appCapabilities: {},
        protocolVersion: "2026-01-26",
      },
    },
    "*",
  );
})();
