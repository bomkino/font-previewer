import AppKit
import CoreFoundation
import Darwin
import Foundation
import UniformTypeIdentifiers
@preconcurrency import WebKit

private let hostBridgeWorldName = "FontPreviewerHostBridge"
private let hostBridgeWorld = WKContentWorld.world(name: hostBridgeWorldName)
private let hostBridgeHandlerName = "fontPreviewerHost"
private let studioScheme = "font-previewer"
private let studioHost = "studio"

private let isolatedBridgeSource = #"""
(() => {
  const requestEvent = "font-previewer:host-request";
  const responseEvent = "font-previewer:host-response";
  const requestAttribute = "data-font-previewer-host-request";
  const responseAttribute = "data-font-previewer-host-response";

  document.addEventListener(requestEvent, async () => {
    const root = document.documentElement;
    const raw = root?.getAttribute(requestAttribute);
    if (!root || !raw) return;
    root.removeAttribute(requestAttribute);
    let packet;
    try {
      packet = JSON.parse(raw);
    } catch {
      return;
    }
    try {
      const response = await window.webkit.messageHandlers.fontPreviewerHost.postMessage(packet.request);
      root.setAttribute(responseAttribute, JSON.stringify({ id: packet.id, response }));
    } catch (error) {
      root.setAttribute(responseAttribute, JSON.stringify({
        id: packet.id,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
    document.dispatchEvent(new Event(responseEvent));
  });
})();
"""#

private let pageBridgeSource = #"""
(() => {
  const requestEvent = "font-previewer:host-request";
  const responseEvent = "font-previewer:host-response";
  const requestAttribute = "data-font-previewer-host-request";
  const responseAttribute = "data-font-previewer-host-response";
  const pending = new Map();
  const menuListeners = new Set();
  let serial = 0;

  document.addEventListener(responseEvent, () => {
    const root = document.documentElement;
    const raw = root?.getAttribute(responseAttribute);
    if (!root || !raw) return;
    root.removeAttribute(responseAttribute);
    let packet;
    try {
      packet = JSON.parse(raw);
    } catch {
      return;
    }
    const callbacks = pending.get(packet.id);
    if (!callbacks) return;
    pending.delete(packet.id);
    if (typeof packet.error === "string") callbacks.reject(new Error(packet.error));
    else callbacks.resolve(packet.response);
  });

  const port = Object.freeze({
    request(request) {
      serial += 1;
      const id = serial;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        const root = document.documentElement;
        if (!root) {
          pending.delete(id);
          reject(new Error("HostBridge document is unavailable"));
          return;
        }
        root.setAttribute(requestAttribute, JSON.stringify({ id, request }));
        document.dispatchEvent(new Event(requestEvent));
      });
    },
    onMenuCommand(listener) {
      if (typeof listener !== "function") throw new TypeError("Menu listener must be a function");
      menuListeners.add(listener);
      return () => menuListeners.delete(listener);
    },
  });

  Object.defineProperty(window, "fontPreviewerHost", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: port,
  });
  Object.defineProperty(window, "__fontPreviewerDispatchMenuCommand", {
    configurable: false,
    enumerable: false,
    writable: false,
    value(command) {
      for (const listener of menuListeners) listener(command);
    },
  });
})();
"""#

private enum HostRequest {
    case openImport
    case nativeUndo
    case reloadStudio
    case probe(Int)
}

private enum P1MacHostError: LocalizedError {
    case missingStudio
    case invalidJavaScriptResult(String)
    case timedOut(String)
    case screenshotFailed(String)

    var errorDescription: String? {
        switch self {
        case .missingStudio:
            return "Bundled Studio resources are missing."
        case .invalidJavaScriptResult(let label):
            return "Invalid JavaScript result for \(label)."
        case .timedOut(let label):
            return "Timed out while waiting for \(label)."
        case .screenshotFailed(let message):
            return "Screenshot failed: \(message)"
        }
    }
}

private final class LocalStudioSchemeHandler: NSObject, WKURLSchemeHandler {
    private let rootURL: URL
    private let maximumResourceBytes = 2 * 1024 * 1024

    init(rootURL: URL) {
        self.rootURL = rootURL.resolvingSymlinksInPath().standardizedFileURL
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url,
              requestURL.scheme == studioScheme,
              requestURL.host == studioHost,
              requestURL.user == nil,
              requestURL.password == nil,
              requestURL.port == nil,
              requestURL.query == nil,
              let decodedPath = requestURL.path.removingPercentEncoding
        else {
            reject(urlSchemeTask, code: .badURL)
            return
        }

        let relativePath = decodedPath == "/" ? "index.html" : String(decodedPath.drop(while: { $0 == "/" }))
        guard !relativePath.isEmpty,
              !relativePath.split(separator: "/").contains("..")
        else {
            reject(urlSchemeTask, code: .noPermissionsToReadFile)
            return
        }

        let fileURL = rootURL.appendingPathComponent(relativePath).resolvingSymlinksInPath().standardizedFileURL
        guard fileURL.path.hasPrefix(rootURL.path + "/"),
              let values = try? fileURL.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey]),
              values.isRegularFile == true,
              let size = values.fileSize,
              size >= 0,
              size <= maximumResourceBytes,
              let data = try? Data(contentsOf: fileURL, options: [.mappedIfSafe])
        else {
            reject(urlSchemeTask, code: .fileDoesNotExist)
            return
        }

        let response = URLResponse(
            url: requestURL,
            mimeType: mimeType(for: fileURL.pathExtension),
            expectedContentLength: data.count,
            textEncodingName: textEncoding(for: fileURL.pathExtension)
        )
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
        if ProcessInfo.processInfo.environment["P1_MAC_EVIDENCE_DIR"] != nil {
            fputs("[p1 mac scheme] served \(relativePath) (\(data.count) bytes)\n", stderr)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private func reject(_ task: WKURLSchemeTask, code: URLError.Code) {
        if ProcessInfo.processInfo.environment["P1_MAC_EVIDENCE_DIR"] != nil {
            fputs("[p1 mac scheme] rejected \(task.request.url?.absoluteString ?? "missing URL")\n", stderr)
        }
        task.didFailWithError(URLError(code))
    }

    private func mimeType(for pathExtension: String) -> String {
        switch pathExtension.lowercased() {
        case "html": return "text/html"
        case "js", "mjs": return "text/javascript"
        case "css": return "text/css"
        case "json", "map": return "application/json"
        case "png": return "image/png"
        case "svg": return "image/svg+xml"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        default: return "application/octet-stream"
        }
    }

    private func textEncoding(for pathExtension: String) -> String? {
        switch pathExtension.lowercased() {
        case "html", "js", "mjs", "css", "json", "map", "svg": return "utf-8"
        default: return nil
        }
    }
}

@main
private struct P1MacHostMain {
    @MainActor
    static func main() {
        let application = NSApplication.shared
        let delegate = P1MacHostDelegate()
        application.delegate = delegate
        application.run()
    }
}

@MainActor
private final class P1MacHostDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate,
    WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandlerWithReply
{
    private(set) var webView: WKWebView!
    private(set) var importMenuItem: NSMenuItem!
    private(set) var keepMenuItem: NSMenuItem!
    private(set) var undoMenuItem: NSMenuItem!
    private(set) var reloadMenuItem: NSMenuItem!
    private(set) var panelOpenedCount = 0
    private(set) var panelCancelledCount = 0
    private(set) var rejectedRequestCount = 0
    private(set) var menuCommandCount = 0
    private(set) var navigationRejectionCount = 0
    private(set) var popupRejectionCount = 0
    private(set) var processTerminationCount = 0

    private var window: NSWindow!
    private var studioRootURL: URL!
    private var studioSchemeHandler: LocalStudioSchemeHandler!
    private var evidenceRunner: MacEvidenceRunner?
    private var evidenceStarted = false
    private var sourceBindings: [String: URL] = [:]
    private var sourceIDsByCanonicalPath: [String: String] = [:]
    private let allowedExtensions = Set(["otf", "ttf", "ttc", "otc", "dfont", "woff", "woff2"])
    private let maximumSourceBytes = 512 * 1024 * 1024

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        configureMenu()
        do {
            try configureWindowAndStudio()
        } catch {
            fputs("[p1 mac] \(error.localizedDescription)\n", stderr)
            Darwin.exit(1)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    private func configureWindowAndStudio() throws {
        guard let resources = Bundle.main.resourceURL else { throw P1MacHostError.missingStudio }
        let root = resources.appendingPathComponent("Studio", isDirectory: true)
        let index = root.appendingPathComponent("index.html", isDirectory: false)
        guard FileManager.default.fileExists(atPath: index.path) else {
            throw P1MacHostError.missingStudio
        }
        studioRootURL = root.resolvingSymlinksInPath().standardizedFileURL

        let controller = WKUserContentController()
        controller.addUserScript(WKUserScript(
            source: isolatedBridgeSource,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true,
            in: hostBridgeWorld
        ))
        controller.addUserScript(WKUserScript(
            source: pageBridgeSource,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true,
            in: .page
        ))
        controller.addScriptMessageHandler(self, contentWorld: hostBridgeWorld, name: hostBridgeHandlerName)

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .nonPersistent()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        studioSchemeHandler = LocalStudioSchemeHandler(rootURL: studioRootURL)
        configuration.setURLSchemeHandler(studioSchemeHandler, forURLScheme: studioScheme)

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsMagnification = true
        webView.underPageBackgroundColor = NSColor(calibratedWhite: 0.96, alpha: 1)
        webView.translatesAutoresizingMaskIntoConstraints = false

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1_440, height: 960),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Font Previewer — P1 WKWebView"
        window.minSize = NSSize(width: 960, height: 640)
        window.collectionBehavior = [.fullScreenPrimary]
        window.delegate = self
        window.contentView = NSView()
        window.contentView?.addSubview(webView)
        if let contentView = window.contentView {
            NSLayoutConstraint.activate([
                webView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
                webView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
                webView.topAnchor.constraint(equalTo: contentView.topAnchor),
                webView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
            ])
        }
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        guard let studioURL = URL(string: "\(studioScheme)://\(studioHost)/index.html") else {
            throw P1MacHostError.missingStudio
        }
        webView.load(URLRequest(url: studioURL))
    }

    private func configureMenu() {
        let root = NSMenu()

        let appItem = NSMenuItem()
        let appMenu = NSMenu(title: "Font Previewer")
        appMenu.addItem(withTitle: "About Font Previewer P1", action: nil, keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit Font Previewer P1", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        root.addItem(appItem)

        let fileItem = NSMenuItem()
        let fileMenu = NSMenu(title: "File")
        importMenuItem = NSMenuItem(title: "Import Fonts…", action: #selector(importFromMenu(_:)), keyEquivalent: "i")
        importMenuItem.keyEquivalentModifierMask = [.command, .shift]
        importMenuItem.target = self
        importMenuItem.identifier = NSUserInterfaceItemIdentifier("p1-import")
        fileMenu.addItem(importMenuItem)
        fileMenu.addItem(.separator())
        fileMenu.addItem(withTitle: "Close", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        fileItem.submenu = fileMenu
        root.addItem(fileItem)

        let editItem = NSMenuItem()
        let editMenu = NSMenu(title: "Edit")
        undoMenuItem = NSMenuItem(title: "Undo", action: #selector(undoFromMenu(_:)), keyEquivalent: "z")
        undoMenuItem.target = self
        undoMenuItem.identifier = NSUserInterfaceItemIdentifier("p1-undo")
        editMenu.addItem(undoMenuItem)
        let redo = NSMenuItem(title: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        editMenu.addItem(redo)
        editMenu.addItem(.separator())
        editMenu.addItem(NSMenuItem(title: "Cut", action: Selector(("cut:")), keyEquivalent: "x"))
        editMenu.addItem(NSMenuItem(title: "Copy", action: Selector(("copy:")), keyEquivalent: "c"))
        editMenu.addItem(NSMenuItem(title: "Paste", action: Selector(("paste:")), keyEquivalent: "v"))
        editMenu.addItem(NSMenuItem(title: "Select All", action: Selector(("selectAll:")), keyEquivalent: "a"))
        editMenu.addItem(.separator())
        keepMenuItem = NSMenuItem(title: "Mark Candidate Keep", action: #selector(markKeepFromMenu(_:)), keyEquivalent: "k")
        keepMenuItem.keyEquivalentModifierMask = [.command, .shift]
        keepMenuItem.target = self
        keepMenuItem.identifier = NSUserInterfaceItemIdentifier("p1-mark-keep")
        editMenu.addItem(keepMenuItem)
        let next = NSMenuItem(title: "Next Unreviewed Candidate", action: #selector(nextUnreviewedFromMenu(_:)), keyEquivalent: "u")
        next.keyEquivalentModifierMask = [.command, .shift]
        next.target = self
        editMenu.addItem(next)
        editItem.submenu = editMenu
        root.addItem(editItem)

        let viewItem = NSMenuItem()
        let viewMenu = NSMenu(title: "View")
        for (index, stage) in ["review", "compare", "system", "handoff"].enumerated() {
            let item = NSMenuItem(
                title: "\(index + 1) — \(stage.prefix(1).uppercased())\(stage.dropFirst())",
                action: #selector(setStageFromMenu(_:)),
                keyEquivalent: String(index + 1)
            )
            item.target = self
            item.representedObject = stage
            viewMenu.addItem(item)
        }
        viewMenu.addItem(.separator())
        reloadMenuItem = NSMenuItem(title: "Reload Studio Safely", action: #selector(reloadFromMenu(_:)), keyEquivalent: "r")
        reloadMenuItem.keyEquivalentModifierMask = [.command, .shift]
        reloadMenuItem.target = self
        reloadMenuItem.identifier = NSUserInterfaceItemIdentifier("p1-reload")
        viewMenu.addItem(reloadMenuItem)
        viewMenu.addItem(.separator())
        viewMenu.addItem(NSMenuItem(title: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f"))
        viewItem.submenu = viewMenu
        root.addItem(viewItem)

        let windowItem = NSMenuItem()
        let windowMenu = NSMenu(title: "Window")
        windowMenu.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: "Bring All to Front", action: #selector(NSApplication.arrangeInFront(_:)), keyEquivalent: "")
        windowItem.submenu = windowMenu
        root.addItem(windowItem)
        NSApp.windowsMenu = windowMenu
        NSApp.mainMenu = root
    }

    @objc private func importFromMenu(_ sender: Any?) {
        sendMenuCommand(["type": "open-import"])
    }

    @objc private func markKeepFromMenu(_ sender: Any?) {
        sendMenuCommand(["type": "mark-keep"])
    }

    @objc private func nextUnreviewedFromMenu(_ sender: Any?) {
        sendMenuCommand(["type": "next-unreviewed"])
    }

    @objc private func setStageFromMenu(_ sender: NSMenuItem) {
        guard let stage = sender.representedObject as? String else { return }
        sendMenuCommand(["type": "set-stage", "stage": stage])
    }

    @objc private func reloadFromMenu(_ sender: Any?) {
        sendMenuCommand(["type": "reload-studio"])
    }

    @objc private func undoFromMenu(_ sender: Any?) {
        performNativeUndo()
    }

    private func sendMenuCommand(_ command: [String: Any]) {
        menuCommandCount += 1
        webView.callAsyncJavaScript(
            "window.__fontPreviewerDispatchMenuCommand(command); return true;",
            arguments: ["command": command],
            in: nil,
            in: .page
        ) { result in
            if case .failure(let error) = result {
                fputs("[p1 mac] menu dispatch failed: \(error.localizedDescription)\n", stderr)
            }
        }
    }

    func performMenuItem(_ item: NSMenuItem) {
        guard let menu = item.menu else { return }
        let index = menu.index(of: item)
        guard index >= 0 else { return }
        menu.performActionForItem(at: index)
    }

    private func performNativeUndo() {
        window.makeFirstResponder(webView)
        if webView.undoManager?.canUndo == true {
            webView.undoManager?.undo()
        } else {
            _ = NSApp.sendAction(Selector(("undo:")), to: nil, from: self)
        }
    }

    private func parseRequest(_ body: Any) -> HostRequest? {
        guard let object = body as? [String: Any], let type = object["type"] as? String else {
            return nil
        }
        switch type {
        case "open-import":
            return Set(object.keys) == Set(["type"]) ? .openImport : nil
        case "native-undo":
            return Set(object.keys) == Set(["type"]) ? .nativeUndo : nil
        case "reload-studio":
            return Set(object.keys) == Set(["type"]) ? .reloadStudio : nil
        case "probe":
            guard Set(object.keys) == Set(["type", "serial"]),
                  let number = object["serial"] as? NSNumber,
                  CFGetTypeID(number) != CFBooleanGetTypeID(),
                  number.doubleValue.rounded(.towardZero) == number.doubleValue,
                  number.doubleValue >= 0,
                  number.doubleValue <= Double(Int.max)
            else { return nil }
            return .probe(number.intValue)
        default:
            return nil
        }
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage,
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        guard message.name == hostBridgeHandlerName,
              message.frameInfo.isMainFrame,
              message.world.name == hostBridgeWorldName,
              let request = parseRequest(message.body)
        else {
            rejectedRequestCount += 1
            replyHandler(nil, "Rejected invalid HostBridge request")
            return
        }

        switch request {
        case .openImport:
            presentImportPanel(replyHandler: replyHandler)
        case .nativeUndo:
            performNativeUndo()
            replyHandler(["type": "ack", "action": "native-undo"], nil)
        case .reloadStudio:
            replyHandler(["type": "ack", "action": "reload-studio"], nil)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.025) { [weak self] in
                self?.webView.reload()
            }
        case .probe(let serial):
            replyHandler(["type": "probe-result", "serial": serial, "host": "wkwebview"], nil)
        }
    }

    private func presentImportPanel(replyHandler: @escaping (Any?, String?) -> Void) {
        panelOpenedCount += 1
        let panel = NSOpenPanel()
        panel.title = "Import font Sources"
        panel.prompt = "Import"
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.resolvesAliases = true
        panel.allowedContentTypes = allowedExtensions.compactMap { UTType(filenameExtension: $0) }
        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self else {
                replyHandler(["type": "import-result", "sources": []], nil)
                return
            }
            guard response == .OK else {
                self.panelCancelledCount += 1
                replyHandler(["type": "import-result", "sources": []], nil)
                return
            }
            replyHandler(["type": "import-result", "sources": self.importSources(panel.urls)], nil)
        }
        if ProcessInfo.processInfo.environment["P1_MAC_EVIDENCE_DIR"] != nil {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                panel.cancel(nil)
            }
        }
    }

    private func importSources(_ urls: [URL]) -> [[String: Any]] {
        var imported: [[String: Any]] = []
        for selectedURL in urls.prefix(64) {
            let canonical = selectedURL.resolvingSymlinksInPath().standardizedFileURL
            guard allowedExtensions.contains(canonical.pathExtension.lowercased()),
                  let values = try? canonical.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey]),
                  values.isRegularFile == true,
                  let size = values.fileSize,
                  size <= maximumSourceBytes
            else { continue }
            let key = canonical.path
            let id = sourceIDsByCanonicalPath[key] ?? "source:\(UUID().uuidString.lowercased())"
            sourceIDsByCanonicalPath[key] = id
            sourceBindings[id] = canonical
            imported.append([
                "id": id,
                "displayName": String(canonical.deletingPathExtension().lastPathComponent.prefix(256)),
                "state": "available",
            ])
        }
        return imported
    }

    private func isAllowedLocalURL(_ url: URL) -> Bool {
        url.scheme == studioScheme && url.host == studioHost && url.user == nil && url.password == nil && url.port == nil
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard navigationAction.targetFrame?.isMainFrame != false,
              let url = navigationAction.request.url,
              isAllowedLocalURL(url)
        else {
            navigationRejectionCount += 1
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        popupRejectionCount += 1
        return nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard !evidenceStarted,
              let outputPath = ProcessInfo.processInfo.environment["P1_MAC_EVIDENCE_DIR"]
        else { return }
        evidenceStarted = true
        let runner = MacEvidenceRunner(host: self, outputURL: URL(fileURLWithPath: outputPath, isDirectory: true))
        evidenceRunner = runner
        runner.start()
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        processTerminationCount += 1
        webView.reload()
    }
}

@MainActor
private final class MacEvidenceRunner {
    private unowned let host: P1MacHostDelegate
    private let outputURL: URL

    init(host: P1MacHostDelegate, outputURL: URL) {
        self.host = host
        self.outputURL = outputURL
    }

    func start() {
        Task { @MainActor in
            do {
                try await run()
                fputs("[p1 mac evidence] complete\n", stderr)
                Darwin.exit(0)
            } catch {
                fputs("[p1 mac evidence] failed: \(error.localizedDescription)\n", stderr)
                let failure: [String: Any] = [
                    "generatedAt": ISO8601DateFormatter().string(from: Date()),
                    "error": error.localizedDescription,
                ]
                try? writeJSON(failure, to: outputURL.appendingPathComponent("failure.json"))
                Darwin.exit(1)
            }
        }
    }

    private func run() async throws {
        try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)
        try await waitFor("Studio bootstrap") {
            #"return Boolean(window.fontPreviewerHost && document.querySelector('#workspace-heading'));"#
        }
        try await settle(180)
        try await waitFor("WKWebView Host probe") {
            #"return document.querySelector('.host-probe')?.textContent?.includes('wkwebview') ?? false;"#
        }

        var trace: [String: Any] = [
            "generatedAt": ISO8601DateFormatter().string(from: Date()),
            "platform": "macos",
            "architecture": architectureName,
            "operatingSystem": ProcessInfo.processInfo.operatingSystemVersionString,
            "host": "wkwebview",
            "contentWorld": hostBridgeWorldName,
            "initial": try await inspectWorkspace(),
        ]

        try await snapshot("01-review.png")

        host.performMenuItem(host.keepMenuItem)
        try await waitFor("native Keep menu command") {
            #"return document.querySelector('.state-pill')?.textContent?.toLowerCase().includes('keep') ?? false;"#
        }
        trace["afterNativeMenuCommand"] = try await inspectWorkspace()

        _ = try await callPage(#"const button = document.querySelector('#import-fonts-button'); if (!button) return false; button.focus(); return document.activeElement === button;"#)
        host.performMenuItem(host.importMenuItem)
        try await waitFor("native import panel completion") { [unowned self] in
            self.host.panelOpenedCount > 0 && self.host.panelCancelledCount > 0
        }
        try await settle(120)
        let focusAfterPanel = try await callPage(#"return document.activeElement?.id ?? document.activeElement?.tagName ?? null;"#)
        guard (focusAfterPanel as? String) == "import-fonts-button" else {
            throw P1MacHostError.invalidJavaScriptResult("focus restoration after native panel")
        }

        let validation = try await callJSON(#"""
        const invalid = [
          { type: 'open-import', path: '/private/font.otf' },
          { type: 'probe', serial: -1 },
          { type: 'read-file', path: '/private/font.otf' },
        ];
        let rejected = 0;
        for (const request of invalid) {
          try { await window.fontPreviewerHost.request(request); }
          catch { rejected += 1; }
        }
        return JSON.stringify({ attempted: invalid.length, rejected });
        """#, label: "negative bridge validation")
        guard let attempted = validation["attempted"] as? Int,
              let rejected = validation["rejected"] as? Int,
              attempted == 3,
              rejected == attempted
        else {
            throw P1MacHostError.invalidJavaScriptResult("negative bridge validation")
        }

        trace["bridgeRoundTrip"] = try await callJSON(#"""
        const values = [];
        for (let serial = 0; serial < 40; serial += 1) {
          const started = performance.now();
          const result = await window.fontPreviewerHost.request({ type: 'probe', serial });
          if (result.type !== 'probe-result' || result.serial !== serial || result.host !== 'wkwebview') {
            throw new Error('Probe mismatch');
          }
          values.push(performance.now() - started);
        }
        values.sort((a, b) => a - b);
        const pick = (q) => values[Math.min(values.length - 1, Math.ceil(values.length * q) - 1)];
        return JSON.stringify({
          samples: values.length,
          minimumMs: Number(values[0].toFixed(3)),
          medianMs: Number(pick(0.5).toFixed(3)),
          p95Ms: Number(pick(0.95).toFixed(3)),
          maximumMs: Number(values.at(-1).toFixed(3)),
        });
        """#, label: "bridge measurement")

        trace["inputToFrame"] = try await callJSON(#"""
        const textarea = document.querySelector('#specimen-copy-editor');
        if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('Missing specimen editor');
        const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        if (!setValue) throw new Error('Missing textarea setter');
        const original = textarea.value;
        const values = [];
        for (let index = 0; index < 20; index += 1) {
          const started = performance.now();
          setValue.call(textarea, original + ' ' + index);
          textarea.dispatchEvent(new InputEvent('input', { bubbles: true, data: String(index), inputType: 'insertText' }));
          await Promise.race([
            new Promise((resolve) => requestAnimationFrame(resolve)),
            new Promise((resolve) => setTimeout(resolve, 50)),
          ]);
          values.push(performance.now() - started);
        }
        setValue.call(textarea, original);
        textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'historyUndo' }));
        values.sort((a, b) => a - b);
        const pick = (q) => values[Math.min(values.length - 1, Math.ceil(values.length * q) - 1)];
        return JSON.stringify({
          samples: values.length,
          minimumMs: Number(values[0].toFixed(3)),
          medianMs: Number(pick(0.5).toFixed(3)),
          p95Ms: Number(pick(0.95).toFixed(3)),
          maximumMs: Number(values.at(-1).toFixed(3)),
        });
        """#, label: "input measurement")

        let editBefore = try await callPage(#"""
        const textarea = document.querySelector('#specimen-copy-editor');
        if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('Missing specimen editor');
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        const before = textarea.value;
        if (!document.execCommand('insertText', false, ' undo-probe')) throw new Error('Insert failed');
        return before;
        """#) as? String
        try await settle(100)
        let editAfterInsert = try await callPage(#"return document.querySelector('#specimen-copy-editor')?.value ?? null;"#) as? String
        host.performMenuItem(host.undoMenuItem)
        try await settle(120)
        let editAfterUndo = try await callPage(#"return document.querySelector('#specimen-copy-editor')?.value ?? null;"#) as? String
        guard let editBefore, editAfterInsert != editBefore, editAfterUndo == editBefore else {
            throw P1MacHostError.invalidJavaScriptResult("native undo")
        }
        let editAndUndo: [String: Any] = [
            "before": editBefore,
            "afterInsert": editAfterInsert ?? NSNull(),
            "afterUndo": editAfterUndo ?? NSNull(),
        ]
        trace["editAndUndo"] = editAndUndo

        _ = try await callPage(#"""
        const select = [...document.querySelectorAll('.field-label select')].at(-1);
        if (!(select instanceof HTMLSelectElement)) throw new Error('Missing role selector');
        const setValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        setValue?.call(select, 'display');
        select.dispatchEvent(new Event('change', { bubbles: true }));
        [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Add to set'))?.click();
        [...document.querySelectorAll('.stage-nav button')].find((button) => button.textContent?.includes('Compare'))?.click();
        return true;
        """#)
        try await settle(120)
        trace["compare"] = try await inspectWorkspace()
        try await snapshot("02-compare.png")

        _ = try await openStage("System")
        try await settle(100)
        trace["focusAfterStageChange"] = try await inspectWorkspace()
        try await snapshot("03-system.png")

        _ = try await openStage("Handoff")
        try await settle(100)
        try await snapshot("04-handoff.png")

        let beforeReload = try await inspectWorkspace()
        let reloadStarted = ProcessInfo.processInfo.systemUptime
        host.performMenuItem(host.reloadMenuItem)
        try await waitFor("Studio reload") {
            #"return Boolean(window.fontPreviewerHost && document.querySelector('#workspace-heading') && document.activeElement?.id === 'workspace-heading');"#
        }
        try await settle(180)
        let afterReload = try await inspectWorkspace()
        guard beforeReload["stage"] as? String == afterReload["stage"] as? String,
              beforeReload["revision"] as? String == afterReload["revision"] as? String,
              afterReload["activeElement"] as? String == "workspace-heading"
        else {
            throw P1MacHostError.invalidJavaScriptResult("reload recovery")
        }
        trace["reload"] = [
            "durationMs": ((ProcessInfo.processInfo.systemUptime - reloadStarted) * 1_000).rounded(toPlaces: 3),
            "before": beforeReload,
            "after": afterReload,
        ]
        try await snapshot("05-recovered.png")

        trace["accessibilitySemantics"] = try await callJSON(#"""
        const controls = [...document.querySelectorAll('button, input, select, textarea, a[href]')];
        const name = (element) => {
          const labelledBy = element.getAttribute('aria-labelledby');
          if (labelledBy) return labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim();
          return (element.getAttribute('aria-label') || element.textContent || element.getAttribute('title') || '').trim();
        };
        const unnamed = controls.filter((element) => !name(element)).length;
        return JSON.stringify({
          interactiveElements: controls.length,
          unnamedInteractiveElements: unnamed,
          landmarks: {
            banner: document.querySelectorAll('header').length,
            navigation: document.querySelectorAll('nav').length,
            main: document.querySelectorAll('main').length,
            complementary: document.querySelectorAll('aside').length,
            contentinfo: document.querySelectorAll('footer').length,
          },
          stageNavigationName: document.querySelector('nav')?.getAttribute('aria-label') ?? null,
          activeElement: document.activeElement?.id || document.activeElement?.tagName || null,
        });
        """#, label: "accessibility semantics")

        trace["nativeAccessibility"] = [
            "webViewRole": String(describing: host.webView.accessibilityRole()),
            "directChildren": host.webView.accessibilityChildren()?.count ?? 0,
            "voiceOverTraversal": "not-run",
        ]
        trace["nativePanel"] = [
            "opened": host.panelOpenedCount,
            "cancelled": host.panelCancelledCount,
            "focusRestoredTo": focusAfterPanel ?? NSNull(),
        ]
        trace["nativeMenu"] = [
            "installed": NSApp.mainMenu != nil,
            "commandsDispatched": host.menuCommandCount,
            "importItemPresent": host.importMenuItem != nil,
            "keepItemPresent": host.keepMenuItem != nil,
            "undoItemPresent": host.undoMenuItem != nil,
            "reloadItemPresent": host.reloadMenuItem != nil,
        ]
        trace["security"] = [
            "bundledLocalContentOnly": host.webView.url?.scheme == studioScheme && host.webView.url?.host == studioHost,
            "readOnlyCustomScheme": "\(studioScheme)://\(studioHost)",
            "persistentWebsiteData": false,
            "namedContentWorld": hostBridgeWorldName,
            "rejectedBridgeRequests": host.rejectedRequestCount,
            "rejectedNavigations": host.navigationRejectionCount,
            "rejectedPopups": host.popupRejectionCount,
            "webProcessTerminations": host.processTerminationCount,
        ]

        try writeJSON(trace, to: outputURL.appendingPathComponent("run.json"))
    }

    private var architectureName: String {
        #if arch(arm64)
        return "arm64"
        #elseif arch(x86_64)
        return "x86_64"
        #else
        return "unknown"
        #endif
    }

    private func callPage(_ source: String) async throws -> Any? {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Any?, Error>) in
            host.webView.callAsyncJavaScript(source, arguments: [:], in: nil, in: .page) { result in
                switch result {
                case .success(let value): continuation.resume(returning: value)
                case .failure(let error): continuation.resume(throwing: error)
                }
            }
        }
    }

    private func callJSON(_ source: String, label: String) async throws -> [String: Any] {
        guard let string = try await callPage(source) as? String,
              let data = string.data(using: .utf8),
              let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        else { throw P1MacHostError.invalidJavaScriptResult(label) }
        return object
    }

    private func inspectWorkspace() async throws -> [String: Any] {
        try await callJSON(#"""
        const selected = document.querySelector('.candidate-row[aria-current="true"]');
        const heading = document.querySelector('#workspace-heading');
        const revision = document.querySelector('.document-title span:last-child');
        const state = document.querySelector('.state-pill');
        return JSON.stringify({
          heading: heading?.textContent?.trim() ?? null,
          selected: selected?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
          revision: revision?.textContent?.trim() ?? null,
          reviewState: state?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
          activeElement: document.activeElement?.id || document.activeElement?.tagName || null,
          stage: document.querySelector('.stage-nav [aria-current="page"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
          storedBytes: localStorage.getItem('font-previewer:p1:study')?.length ?? 0,
        });
        """#, label: "workspace inspection")
    }

    private func openStage(_ label: String) async throws -> Any? {
        try await callPage(#"""
        const button = [...document.querySelectorAll('.stage-nav button')].find((candidate) => candidate.textContent?.includes(label));
        if (!button) throw new Error('Missing stage button');
        button.click();
        return true;
        """#.replacingOccurrences(of: "label", with: JSONString.quote(label)))
    }

    private func waitFor(_ label: String, body: @escaping () async throws -> Bool) async throws {
        for _ in 0..<160 {
            if try await body() { return }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        throw P1MacHostError.timedOut(label)
    }

    private func waitFor(_ label: String, source: @escaping () -> String) async throws {
        try await waitFor(label) { [unowned self] in
            do { return try await self.callPage(source()) as? Bool == true }
            catch { return false }
        }
    }

    private func settle(_ milliseconds: UInt64) async throws {
        try await Task.sleep(nanoseconds: milliseconds * 1_000_000)
    }

    private func snapshot(_ name: String) async throws {
        try await settle(80)
        let image: NSImage = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<NSImage, Error>) in
            host.webView.takeSnapshot(with: nil) { image, error in
                if let image { continuation.resume(returning: image) }
                else { continuation.resume(throwing: P1MacHostError.screenshotFailed(error?.localizedDescription ?? "no image")) }
            }
        }
        guard let tiff = image.tiffRepresentation,
              let bitmap = NSBitmapImageRep(data: tiff),
              let png = bitmap.representation(using: .png, properties: [:])
        else { throw P1MacHostError.screenshotFailed("PNG conversion failed") }
        try png.write(to: outputURL.appendingPathComponent(name), options: .atomic)
    }

    private func writeJSON(_ object: Any, to url: URL) throws {
        let data = try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
        var terminated = data
        terminated.append(0x0A)
        try terminated.write(to: url, options: .atomic)
    }
}

private enum JSONString {
    static func quote(_ value: String) -> String {
        let data = try! JSONSerialization.data(withJSONObject: [value])
        let array = String(data: data, encoding: .utf8)!
        return String(array.dropFirst().dropLast())
    }
}

private extension Double {
    func rounded(toPlaces places: Int) -> Double {
        let factor = pow(10, Double(places))
        return (self * factor).rounded() / factor
    }
}
