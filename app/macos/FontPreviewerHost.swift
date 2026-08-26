import AppKit
import CoreFoundation
import CoreText
import CryptoKit
import Darwin
import Foundation
import UniformTypeIdentifiers
import WebKit

private let bridgeWorldName = "FontPreviewerHostBridge"
private let bridgeWorld = WKContentWorld.world(name: bridgeWorldName)
private let bridgeHandlerName = "fontPreviewerHost"
private let studioScheme = "font-previewer"
private let studioHost = "studio"
private let fontScheme = "pitch-font"
private let fontHost = "asset"
private let evidenceEnvironmentKey = "FONT_PREVIEWER_MAC_EVIDENCE_DIR"

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
    try { packet = JSON.parse(raw); } catch { return; }
    try {
      const response = await window.webkit.messageHandlers.fontPreviewerHost.postMessage(packet.request);
      root.setAttribute(responseAttribute, JSON.stringify({ id: packet.id, response }));
    } catch (error) {
      root.setAttribute(responseAttribute, JSON.stringify({ id: packet.id, error: error instanceof Error ? error.message : String(error) }));
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
  const eventListeners = new Set();
  let serial = 0;
  document.addEventListener(responseEvent, () => {
    const root = document.documentElement;
    const raw = root?.getAttribute(responseAttribute);
    if (!root || !raw) return;
    root.removeAttribute(responseAttribute);
    let packet;
    try { packet = JSON.parse(raw); } catch { return; }
    const callbacks = pending.get(packet.id);
    if (!callbacks) return;
    pending.delete(packet.id);
    if (typeof packet.error === "string") callbacks.reject(new Error(packet.error));
    else callbacks.resolve(packet.response);
  });
  const port = Object.freeze({
    request(request) {
      serial += 1;
      return new Promise((resolve, reject) => {
        const id = serial;
        pending.set(id, { resolve, reject });
        const root = document.documentElement;
        if (!root) { pending.delete(id); reject(new Error("HostBridge document is unavailable")); return; }
        root.setAttribute(requestAttribute, JSON.stringify({ id, request }));
        document.dispatchEvent(new Event(requestEvent));
      });
    },
    onMenuCommand(listener) {
      if (typeof listener !== "function") throw new TypeError("Menu listener must be a function");
      menuListeners.add(listener);
      return () => menuListeners.delete(listener);
    },
    onHostEvent(listener) {
      if (typeof listener !== "function") throw new TypeError("Host event listener must be a function");
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
  });
  Object.defineProperty(window, "fontPreviewerHost", { configurable: false, enumerable: false, writable: false, value: port });
  Object.defineProperty(window, "__fontPreviewerDispatchMenuCommand", { configurable: false, enumerable: false, writable: false, value(command) { for (const listener of menuListeners) listener(command); } });
  Object.defineProperty(window, "__fontPreviewerDispatchHostEvent", { configurable: false, enumerable: false, writable: false, value(event) { for (const listener of eventListeners) listener(event); } });
})();
"""#

private enum HostError: LocalizedError {
    case missingStudio
    case invalidRequest
    case invalidStudy(String)
    case unavailable(String)
    case exportFailed(String)

    var errorDescription: String? {
        switch self {
        case .missingStudio: return "Bundled Studio resources are missing."
        case .invalidRequest: return "Rejected invalid HostBridge request."
        case .invalidStudy(let message): return "Invalid Study: \(message)"
        case .unavailable(let message): return message
        case .exportFailed(let message): return "Handoff export failed: \(message)"
        }
    }
}

private final class FontAssetStore: @unchecked Sendable {
    private let lock = NSLock()
    private var urls: [String: URL] = [:]
    private var tokensByPath: [String: String] = [:]

    func assign(_ url: URL) -> String {
        lock.lock(); defer { lock.unlock() }
        if let token = tokensByPath[url.path], urls[token] == url { return token }
        let token = UUID().uuidString.lowercased()
        urls[token] = url
        tokensByPath[url.path] = token
        return token
    }

    func url(for token: String) -> URL? {
        lock.lock(); defer { lock.unlock() }
        return urls[token]
    }
}

private final class BoundedSchemeHandler: NSObject, WKURLSchemeHandler {
    enum Kind { case studio(URL), fonts(FontAssetStore) }
    private let kind: Kind
    init(_ kind: Kind) { self.kind = kind }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let requestURL = task.request.url else { reject(task, .badURL); return }
        let fileURL: URL
        switch kind {
        case .studio(let root):
            guard requestURL.scheme == studioScheme, requestURL.host == studioHost,
                  requestURL.user == nil, requestURL.password == nil, requestURL.port == nil,
                  let decoded = requestURL.path.removingPercentEncoding
            else { reject(task, .badURL); return }
            let relative = decoded == "/" ? "index.html" : String(decoded.drop(while: { $0 == "/" }))
            guard !relative.isEmpty, !relative.split(separator: "/").contains("..") else { reject(task, .noPermissionsToReadFile); return }
            let candidate = root.appendingPathComponent(relative).resolvingSymlinksInPath().standardizedFileURL
            guard candidate.path.hasPrefix(root.path + "/") else { reject(task, .noPermissionsToReadFile); return }
            fileURL = candidate
        case .fonts(let store):
            guard requestURL.scheme == fontScheme, requestURL.host == fontHost,
                  requestURL.user == nil, requestURL.password == nil, requestURL.port == nil,
                  requestURL.query == nil,
                  let token = requestURL.path.split(separator: "/").last.map(String.init),
                  token.range(of: #"^[0-9a-f-]{36}$"#, options: .regularExpression) != nil,
                  let candidate = store.url(for: token)
            else { reject(task, .badURL); return }
            fileURL = candidate
        }
        let limit = 512 * 1024 * 1024
        guard let values = try? fileURL.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey]),
              values.isRegularFile == true, values.isSymbolicLink != true,
              let size = values.fileSize, size > 0, size <= limit,
              let data = try? Data(contentsOf: fileURL, options: [.mappedIfSafe])
        else { reject(task, .fileDoesNotExist); return }
        let response = URLResponse(url: requestURL, mimeType: mimeType(fileURL.pathExtension), expectedContentLength: data.count, textEncodingName: textEncoding(fileURL.pathExtension))
        task.didReceive(response); task.didReceive(data); task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
    private func reject(_ task: WKURLSchemeTask, _ code: URLError.Code) { task.didFailWithError(URLError(code)) }
    private func mimeType(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html"
        case "js", "mjs": return "text/javascript"
        case "css": return "text/css"
        case "json", "map": return "application/json"
        case "png": return "image/png"
        case "svg": return "image/svg+xml"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        case "otf": return "font/otf"
        case "ttf": return "font/ttf"
        default: return "application/octet-stream"
        }
    }
    private func textEncoding(_ ext: String) -> String? { ["html", "js", "mjs", "css", "json", "map", "svg"].contains(ext.lowercased()) ? "utf-8" : nil }
}

private enum HostRequest {
    case getLaunchState
    case openImport
    case scanInstalled(String, Int, Int, Bool)
    case openStudy
    case mirrorStudy([String: Any], [String: Any], Int)
    case saveStudy([String: Any], Int, Bool)
    case exportHandoff([String: Any], Int, [String: Any], Bool)
    case relinkSource(String)
    case revealSource(String)
    case nativeUndo
    case reloadStudio
    case probe(Int)
}

private struct InstalledCatalogEntry {
    let url: URL
    let searchText: String
}

@main
private struct FontPreviewerHostMain {
    @MainActor static func main() {
        let application = NSApplication.shared
        let delegate = FontPreviewerHostDelegate()
        application.delegate = delegate
        application.run()
    }
}

@MainActor
private final class FontPreviewerHostDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, @preconcurrency WKNavigationDelegate, @preconcurrency WKUIDelegate, @preconcurrency WKScriptMessageHandlerWithReply {
    fileprivate var webView: WKWebView!
    fileprivate var window: NSWindow!
    fileprivate var panelOpened = 0
    fileprivate var panelCancelled = 0
    fileprivate var rejectedRequests = 0
    fileprivate var menuCommands = 0
    fileprivate var navigationRejections = 0
    fileprivate var popupRejections = 0
    fileprivate var processTerminations = 0

    private var studioRoot: URL!
    private var studioHandler: BoundedSchemeHandler!
    private var fontHandler: BoundedSchemeHandler!
    private let fontAssets = FontAssetStore()
    private let allowedExtensions = Set(["otf", "ttf", "ttc", "otc", "dfont", "woff", "woff2"])
    private let fullExtensions = Set(["otf", "ttf", "woff", "woff2"])
    private let maximumStudyBytes = 8_000_000
    private let maximumSourceBytes = 512 * 1024 * 1024
    private let maximumCatalogEntries = 10_000
    private let maximumCatalogCache = 400
    private var sourceBindings: [String: URL] = [:]
    private var sourceIDsByPath: [String: String] = [:]
    private var catalogSourceIDsByPath: [String: String] = [:]
    private var catalogURLsBySourceID: [String: URL] = [:]
    private var catalogImportCache: [String: [String: Any]] = [:]
    private var catalogCacheOrder: [String] = []
    private var installedCatalogIndex: [InstalledCatalogEntry] = []
    private var installedCatalogTruncated = false
    private var scopedURLs: [URL] = []
    private var mirroredDocument: [String: Any]?
    private var mirroredWorkspace: [String: Any]?
    private var mirroredRevision = 0
    private var intentionallySavedRevision = 0
    private var currentDocumentURL: URL?
    private var localStateURL: URL!
    private var recoveryURL: URL!
    private var recentDocuments: [URL] = []
    private var evidenceRunner: MacEvidenceRunner?
    private var evidenceStarted = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        do {
            try configureStorage()
            configureMenu()
            try configureWindow()
        } catch {
            fputs("[font previewer] \(error.localizedDescription)\n", stderr)
            Darwin.exit(1)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func applicationWillTerminate(_ notification: Notification) { scopedURLs.forEach { $0.stopAccessingSecurityScopedResource() } }

    private func configureStorage() throws {
        let support = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("Font Previewer", isDirectory: true)
        try FileManager.default.createDirectory(at: support, withIntermediateDirectories: true)
        localStateURL = support.appendingPathComponent("host-state-v1.json")
        recoveryURL = support.appendingPathComponent("recovery-v1.json")
        loadLocalState()
    }

    private func configureWindow() throws {
        guard let resources = Bundle.main.resourceURL else { throw HostError.missingStudio }
        let root = resources.appendingPathComponent("Studio", isDirectory: true).resolvingSymlinksInPath().standardizedFileURL
        guard FileManager.default.fileExists(atPath: root.appendingPathComponent("index.html").path) else { throw HostError.missingStudio }
        studioRoot = root
        let controller = WKUserContentController()
        controller.addUserScript(WKUserScript(source: isolatedBridgeSource, injectionTime: .atDocumentStart, forMainFrameOnly: true, in: bridgeWorld))
        controller.addUserScript(WKUserScript(source: pageBridgeSource, injectionTime: .atDocumentStart, forMainFrameOnly: true, in: .page))
        controller.addScriptMessageHandler(self, contentWorld: bridgeWorld, name: bridgeHandlerName)
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .nonPersistent()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        studioHandler = BoundedSchemeHandler(.studio(root))
        fontHandler = BoundedSchemeHandler(.fonts(fontAssets))
        configuration.setURLSchemeHandler(studioHandler, forURLScheme: studioScheme)
        configuration.setURLSchemeHandler(fontHandler, forURLScheme: fontScheme)
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsMagnification = true
        webView.underPageBackgroundColor = NSColor(calibratedWhite: 0.96, alpha: 1)
        webView.setAccessibilityLabel("Font Previewer Studio")
        webView.setAccessibilityHelp("Review fonts, compare Candidates, build a typography System, and export a Handoff.")
        webView.translatesAutoresizingMaskIntoConstraints = false
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1_500, height: 980), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Font Previewer"
        window.minSize = NSSize(width: 960, height: 640)
        window.collectionBehavior = [.fullScreenPrimary]
        window.delegate = self
        window.contentView = NSView()
        window.contentView?.addSubview(webView)
        if let content = window.contentView {
            NSLayoutConstraint.activate([
                webView.leadingAnchor.constraint(equalTo: content.leadingAnchor), webView.trailingAnchor.constraint(equalTo: content.trailingAnchor),
                webView.topAnchor.constraint(equalTo: content.topAnchor), webView.bottomAnchor.constraint(equalTo: content.bottomAnchor),
            ])
        }
        window.center(); window.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true)
        guard var components = URLComponents(string: "\(studioScheme)://\(studioHost)/index.html") else { throw HostError.missingStudio }
        if ProcessInfo.processInfo.environment[evidenceEnvironmentKey] != nil { components.queryItems = [URLQueryItem(name: "fixture", value: "1")] }
        guard let url = components.url else { throw HostError.missingStudio }
        webView.load(URLRequest(url: url))
    }

    private func configureMenu() {
        let root = NSMenu()
        let appItem = NSMenuItem(title: "Font Previewer", action: nil, keyEquivalent: ""); let appMenu = NSMenu(title: "Font Previewer")
        appMenu.addItem(withTitle: "About Font Previewer", action: nil, keyEquivalent: "")
        appMenu.addItem(.separator()); appMenu.addItem(withTitle: "Quit Font Previewer", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu; root.addItem(appItem)
        let fileItem = NSMenuItem(title: "File", action: nil, keyEquivalent: ""); let file = NSMenu(title: "File")
        addMenu(file, "New Study", "n", [], #selector(newStudyMenu(_:)), "font-previewer-new")
        addMenu(file, "Open Study…", "o", [], #selector(openStudyMenu(_:)), "font-previewer-open")
        file.addItem(.separator())
        addMenu(file, "Import Sources…", "i", [.command, .shift], #selector(importMenu(_:)), "font-previewer-import")
        addMenu(file, "Browse Installed Fonts", "", [], #selector(installedMenu(_:)), "font-previewer-installed")
        file.addItem(.separator())
        addMenu(file, "Save Study", "s", [], #selector(saveMenu(_:)), "font-previewer-save")
        addMenu(file, "Save Study As…", "S", [.command, .shift], #selector(saveAsMenu(_:)), "font-previewer-save-as")
        addMenu(file, "Export Handoff…", "e", [], #selector(exportMenu(_:)), "font-previewer-export")
        file.addItem(.separator()); file.addItem(withTitle: "Close", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        fileItem.submenu = file; root.addItem(fileItem)
        let editItem = NSMenuItem(title: "Edit", action: nil, keyEquivalent: ""); let edit = NSMenu(title: "Edit")
        addMenu(edit, "Undo Study Change", "z", [], #selector(undoStudyMenu(_:)), "font-previewer-undo")
        addMenu(edit, "Redo Study Change", "Z", [.command, .shift], #selector(redoStudyMenu(_:)), "font-previewer-redo")
        edit.addItem(.separator())
        edit.addItem(NSMenuItem(title: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")); edit.addItem(NSMenuItem(title: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")); edit.addItem(NSMenuItem(title: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")); edit.addItem(NSMenuItem(title: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a"))
        edit.addItem(.separator()); addMenu(edit, "Mark Candidate Keep", "k", [.command, .shift], #selector(keepMenu(_:)), "font-previewer-keep"); addMenu(edit, "Next Unreviewed Candidate", "u", [.command, .shift], #selector(nextMenu(_:)), "font-previewer-next")
        editItem.submenu = edit; root.addItem(editItem)
        let navigateItem = NSMenuItem(title: "Navigate", action: nil, keyEquivalent: ""); let navigate = NSMenu(title: "Navigate")
        for (index, stage) in ["review", "compare", "system", "handoff"].enumerated() {
            let item = NSMenuItem(title: "\(index + 1) — \(stage.prefix(1).uppercased())\(stage.dropFirst())", action: #selector(stageMenu(_:)), keyEquivalent: String(index + 1)); item.target = self; item.representedObject = stage; navigate.addItem(item)
        }
        navigateItem.submenu = navigate; root.addItem(navigateItem)
        let viewItem = NSMenuItem(title: "View", action: nil, keyEquivalent: ""); let view = NSMenu(title: "View")
        addMenu(view, "Reload Studio Safely", "r", [.command, .shift], #selector(reloadMenu(_:)), "font-previewer-reload")
        view.addItem(NSMenuItem(title: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")); viewItem.submenu = view; root.addItem(viewItem)
        let windowItem = NSMenuItem(title: "Window", action: nil, keyEquivalent: ""); let windowMenu = NSMenu(title: "Window")
        windowMenu.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m"); windowMenu.addItem(withTitle: "Bring All to Front", action: #selector(NSApplication.arrangeInFront(_:)), keyEquivalent: "")
        windowItem.submenu = windowMenu; root.addItem(windowItem); NSApp.windowsMenu = windowMenu; NSApp.mainMenu = root
    }

    private func addMenu(_ menu: NSMenu, _ title: String, _ key: String, _ modifiers: NSEvent.ModifierFlags, _ action: Selector, _ id: String) {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: key); item.target = self; if !modifiers.isEmpty { item.keyEquivalentModifierMask = modifiers }; item.identifier = NSUserInterfaceItemIdentifier(id); menu.addItem(item)
    }

    @objc private func newStudyMenu(_ sender: Any?) { sendMenu(["type": "new-study"]) }
    @objc private func openStudyMenu(_ sender: Any?) { sendMenu(["type": "open-study"]) }
    @objc private func importMenu(_ sender: Any?) { sendMenu(["type": "open-import"]) }
    @objc private func installedMenu(_ sender: Any?) { sendMenu(["type": "scan-installed"]) }
    @objc private func saveMenu(_ sender: Any?) { sendMenu(["type": "save-study"]) }
    @objc private func saveAsMenu(_ sender: Any?) { sendMenu(["type": "save-study-as"]) }
    @objc private func exportMenu(_ sender: Any?) { sendMenu(["type": "export-handoff"]) }
    @objc private func undoStudyMenu(_ sender: Any?) { sendMenu(["type": "undo-study"]) }
    @objc private func redoStudyMenu(_ sender: Any?) { sendMenu(["type": "redo-study"]) }
    @objc private func keepMenu(_ sender: Any?) { sendMenu(["type": "mark-keep"]) }
    @objc private func nextMenu(_ sender: Any?) { sendMenu(["type": "next-unreviewed"]) }
    @objc private func stageMenu(_ sender: NSMenuItem) { if let stage = sender.representedObject as? String { sendMenu(["type": "set-stage", "stage": stage]) } }
    @objc private func reloadMenu(_ sender: Any?) { sendMenu(["type": "reload-studio"]) }

    fileprivate func sendMenu(_ command: [String: Any]) {
        menuCommands += 1
        webView.callAsyncJavaScript("window.__fontPreviewerDispatchMenuCommand(command); return true;", arguments: ["command": command], in: nil, in: .page) { _ in }
    }

    private func sendEvent(_ event: [String: Any]) { webView.callAsyncJavaScript("window.__fontPreviewerDispatchHostEvent(event); return true;", arguments: ["event": event], in: nil, in: .page) { _ in } }

    private func integer(_ value: Any?) -> Int? {
        guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID(), number.doubleValue.rounded(.towardZero) == number.doubleValue, number.doubleValue >= 0, number.doubleValue <= Double(Int.max) else { return nil }
        return number.intValue
    }

    private func exact(_ object: [String: Any], _ keys: [String]) -> Bool { Set(object.keys) == Set(keys) }

    private func parseRequest(_ body: Any) -> HostRequest? {
        guard let object = body as? [String: Any], let type = object["type"] as? String else { return nil }
        switch type {
        case "get-launch-state": return exact(object, ["type"]) ? .getLaunchState : nil
        case "open-import": return exact(object, ["type"]) ? .openImport : nil
        case "scan-installed":
            guard exact(object, ["type", "query", "cursor", "limit", "refresh"]), let query = object["query"] as? String, query.count <= 200, let cursor = integer(object["cursor"]), let limit = integer(object["limit"]), (1...200).contains(limit), let refresh = object["refresh"] as? Bool else { return nil }
            return .scanInstalled(query, cursor, limit, refresh)
        case "open-study": return exact(object, ["type"]) ? .openStudy : nil
        case "mirror-study":
            guard exact(object, ["type", "document", "workspace", "revision"]), let document = object["document"] as? [String: Any], let workspace = object["workspace"] as? [String: Any], let revision = integer(object["revision"]), validJSON(document, maximum: maximumStudyBytes), validJSON(workspace, maximum: 200_000) else { return nil }
            return .mirrorStudy(document, workspace, revision)
        case "save-study":
            guard exact(object, ["type", "document", "revision", "saveAs"]), let document = object["document"] as? [String: Any], let revision = integer(object["revision"]), let saveAs = object["saveAs"] as? Bool, validJSON(document, maximum: maximumStudyBytes) else { return nil }
            return .saveStudy(document, revision, saveAs)
        case "export-handoff":
            guard exact(object, ["type", "document", "revision", "preferences", "sourcePermissionAcknowledged"]), let document = object["document"] as? [String: Any], let revision = integer(object["revision"]), let preferences = object["preferences"] as? [String: Any], let permission = object["sourcePermissionAcknowledged"] as? Bool, validJSON(document, maximum: maximumStudyBytes) else { return nil }
            return .exportHandoff(document, revision, preferences, permission)
        case "relink-source": guard exact(object, ["type", "sourceId"]), let id = object["sourceId"] as? String, !id.isEmpty else { return nil }; return .relinkSource(id)
        case "reveal-source": guard exact(object, ["type", "sourceId"]), let id = object["sourceId"] as? String, !id.isEmpty else { return nil }; return .revealSource(id)
        case "native-undo": return exact(object, ["type"]) ? .nativeUndo : nil
        case "reload-studio": return exact(object, ["type"]) ? .reloadStudio : nil
        case "probe": guard exact(object, ["type", "serial"]), let serial = integer(object["serial"]) else { return nil }; return .probe(serial)
        default: return nil
        }
    }

    private func validJSON(_ value: Any, maximum: Int) -> Bool { (try? JSONSerialization.data(withJSONObject: value)).map { $0.count <= maximum } ?? false }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.name == bridgeHandlerName, message.frameInfo.isMainFrame, message.world.name == bridgeWorldName, let request = parseRequest(message.body) else { rejectedRequests += 1; replyHandler(nil, HostError.invalidRequest.localizedDescription); return }
        switch request {
        case .getLaunchState: replyHandler(launchState(), nil)
        case .openImport: presentImport(replyHandler)
        case .scanInstalled(let query, let cursor, let limit, let refresh): replyHandler(catalogResult(query: query, cursor: cursor, limit: limit, refresh: refresh), nil)
        case .openStudy: presentOpenStudy(replyHandler)
        case .mirrorStudy(let document, let workspace, let revision):
            guard mirroredDocument?["id"] as? String != document["id"] as? String || revision >= mirroredRevision else { replyHandler(nil, "Rejected stale recovery revision."); return }
            let promotedCatalogBindings = promoteCatalogBindings(document)
            if mirroredDocument?["id"] as? String != document["id"] as? String { intentionallySavedRevision = 0 }
            mirroredDocument = document; mirroredWorkspace = workspace; mirroredRevision = revision
            do { if promotedCatalogBindings { try persistLocalState() }; try persistRecovery(); replyHandler(["type": "mirror-ack", "revision": revision, "recoveryPersisted": true], nil) }
            catch { replyHandler(nil, error.localizedDescription) }
        case .saveStudy(let document, let revision, let saveAs): presentSave(document, revision, saveAs, replyHandler)
        case .exportHandoff(let document, let revision, let preferences, let permission): presentExport(document, revision, preferences, permission, replyHandler)
        case .relinkSource(let id): presentRelink(id, replyHandler)
        case .revealSource(let id):
            guard let url = sourceBindings[id] else { replyHandler(nil, "Source is not locally bound."); return }
            NSWorkspace.shared.activateFileViewerSelecting([url]); replyHandler(["type": "ack", "action": "reveal-source"], nil)
        case .nativeUndo: window.makeFirstResponder(webView); if webView.undoManager?.canUndo == true { webView.undoManager?.undo() }; replyHandler(["type": "ack", "action": "native-undo"], nil)
        case .reloadStudio: replyHandler(["type": "ack", "action": "reload-studio"], nil); DispatchQueue.main.asyncAfter(deadline: .now() + 0.025) { [weak self] in self?.webView.reload() }
        case .probe(let serial): replyHandler(["type": "probe-result", "serial": serial, "host": "wkwebview"], nil)
        }
    }

    private func launchState() -> [String: Any] {
        loadRecovery()
        var response: [String: Any] = [
            "type": "launch-state",
            "capabilities": ["host": "wkwebview", "platform": "macos", "importFiles": true, "importFolders": true, "installedCatalog": true, "nativeSave": true, "transactionalHandoff": true, "sourceRelink": true, "sourceReveal": true, "renderProfile": "WebKit \(ProcessInfo.processInfo.operatingSystemVersionString)", "fullFormats": ["TTF", "OTF", "WOFF", "WOFF2"], "metadataOnlyFormats": ["TTC", "OTC", "DFONT"]],
            "recentDocuments": recentDocuments.map(\.lastPathComponent),
        ]
        if let document = mirroredDocument, let workspace = mirroredWorkspace {
            response["recovery"] = ["document": document, "workspace": workspace, "bindings": bindings(for: document), "revision": mirroredRevision, "intentionallySavedRevision": min(intentionallySavedRevision, mirroredRevision)]
        }
        return response
    }

    private func presentImport(_ reply: @escaping (Any?, String?) -> Void) {
        panelOpened += 1
        let panel = NSOpenPanel(); panel.title = "Import font Sources"; panel.prompt = "Import"; panel.allowsMultipleSelection = true; panel.canChooseDirectories = true; panel.canChooseFiles = true; panel.resolvesAliases = false; panel.allowedContentTypes = allowedExtensions.compactMap { UTType(filenameExtension: $0) }
        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self else { reply(["type": "import-result", "imports": [], "rejected": 0, "truncated": false], nil); return }
            guard response == .OK else { self.panelCancelled += 1; reply(["type": "import-result", "imports": [], "rejected": 0, "truncated": false], nil); return }
            reply(self.importResult(self.collectFontURLs(panel.urls)), nil)
        }
        if ProcessInfo.processInfo.environment[evidenceEnvironmentKey] != nil { DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { panel.cancel(nil) } }
    }

    private func collectFontURLs(_ roots: [URL]) -> [URL] {
        var result: [URL] = []; var seen = Set<String>(); let deadline = Date().addingTimeInterval(15)
        for root in roots {
            if result.count >= 2_048 || Date() > deadline { break }
            let values = try? root.resourceValues(forKeys: [.isDirectoryKey, .isRegularFileKey, .isSymbolicLinkKey])
            if values?.isSymbolicLink == true { continue }
            if values?.isDirectory == true, let enumerator = FileManager.default.enumerator(at: root, includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey], options: [.skipsHiddenFiles, .skipsPackageDescendants]) {
                for case let url as URL in enumerator {
                    if result.count >= 2_048 || Date() > deadline { break }
                    let nested = try? url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
                    if nested?.isSymbolicLink == true { enumerator.skipDescendants(); continue }
                    guard nested?.isRegularFile == true, allowedExtensions.contains(url.pathExtension.lowercased()) else { continue }
                    let canonical = url.standardizedFileURL
                    if seen.insert(canonical.path).inserted { result.append(canonical) }
                }
            } else if values?.isRegularFile == true, allowedExtensions.contains(root.pathExtension.lowercased()) {
                let canonical = root.standardizedFileURL; if seen.insert(canonical.path).inserted { result.append(canonical) }
            }
        }
        return result
    }

    private func importResult(_ urls: [URL]) -> [String: Any] {
        var imports: [[String: Any]] = []; var rejected = 0
        for (index, url) in urls.prefix(2_048).enumerated() {
            do { imports.append(try importedSource(url)); if index % 25 == 0 { sendEvent(["type": "task-progress", "task": "import", "completed": index + 1, "total": min(urls.count, 2_048)]) } }
            catch { rejected += 1 }
        }
        try? persistLocalState()
        return ["type": "import-result", "imports": imports, "rejected": rejected, "truncated": urls.count > 2_048]
    }

    private func rebuildInstalledCatalog() {
        installedCatalogIndex = []
        installedCatalogTruncated = false
        catalogImportCache = [:]
        catalogCacheOrder = []
        var seen = Set<String>()
        for selected in (CTFontManagerCopyAvailableFontURLs() as? [URL] ?? []) {
            let url = selected.resolvingSymlinksInPath().standardizedFileURL
            guard allowedExtensions.contains(url.pathExtension.lowercased()) else { continue }
            guard seen.insert(url.path).inserted else { continue }
            if installedCatalogIndex.count >= maximumCatalogEntries { installedCatalogTruncated = true; break }
            let descriptors = (CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as? [CTFontDescriptor]) ?? []
            let names = descriptors.prefix(32).flatMap { descriptor -> [String] in
                let family = CTFontDescriptorCopyAttribute(descriptor, kCTFontFamilyNameAttribute) as? String
                let style = CTFontDescriptorCopyAttribute(descriptor, kCTFontStyleNameAttribute) as? String
                return [family, style].compactMap { $0 }
            }
            let text = ([url.deletingPathExtension().lastPathComponent] + names).joined(separator: " ").folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current).lowercased()
            installedCatalogIndex.append(InstalledCatalogEntry(url: url, searchText: text))
        }
        installedCatalogIndex.sort { $0.searchText.localizedStandardCompare($1.searchText) == .orderedAscending }
    }

    private func catalogResult(query: String, cursor: Int, limit: Int, refresh: Bool) -> [String: Any] {
        if refresh || installedCatalogIndex.isEmpty { rebuildInstalledCatalog() }
        let normalized = query.trimmingCharacters(in: .whitespacesAndNewlines).folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current).lowercased()
        let matches = normalized.isEmpty ? installedCatalogIndex : installedCatalogIndex.filter { $0.searchText.contains(normalized) }
        let start = min(cursor, matches.count)
        let end = min(start + limit, matches.count)
        let page = Array(matches[start..<end])
        var imports: [[String: Any]] = []
        var rejected = 0
        for (index, entry) in page.enumerated() {
            do {
                let imported: [String: Any]
                if let cached = catalogImportCache[entry.url.path] { imported = cached }
                else {
                    imported = try importedSource(entry.url, catalogOnly: true)
                    catalogImportCache[entry.url.path] = imported
                    catalogCacheOrder.removeAll { $0 == entry.url.path }
                    catalogCacheOrder.append(entry.url.path)
                    if catalogCacheOrder.count > maximumCatalogCache, let evicted = catalogCacheOrder.first {
                        catalogCacheOrder.removeFirst(); catalogImportCache.removeValue(forKey: evicted)
                    }
                }
                imports.append(imported)
            } catch { rejected += 1 }
            if index % 25 == 0 || index + 1 == page.count { sendEvent(["type": "task-progress", "task": "catalog", "completed": start + index + 1, "total": matches.count]) }
        }
        var response: [String: Any] = ["type": "catalog-result", "imports": imports, "indexed": installedCatalogIndex.count, "total": matches.count, "rejected": rejected, "truncated": installedCatalogTruncated]
        if end < matches.count { response["nextCursor"] = end }
        return response
    }

    private func promoteCatalogBindings(_ document: [String: Any]) -> Bool {
        var changed = false
        for source in document["sources"] as? [[String: Any]] ?? [] {
            guard let id = source["id"] as? String, sourceBindings[id] == nil, let url = catalogURLsBySourceID[id] else { continue }
            _ = url.startAccessingSecurityScopedResource(); scopedURLs.append(url)
            sourceBindings[id] = url; sourceIDsByPath[url.path] = id
            catalogURLsBySourceID.removeValue(forKey: id); catalogSourceIDsByPath.removeValue(forKey: url.path)
            changed = true
        }
        return changed
    }

    private func importedSource(_ selected: URL, forcedID: String? = nil, catalogOnly: Bool = false) throws -> [String: Any] {
        let initial = try selected.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
        guard initial.isRegularFile == true, initial.isSymbolicLink != true else { throw HostError.unavailable("Source is not a regular file.") }
        if !catalogOnly { _ = selected.startAccessingSecurityScopedResource(); scopedURLs.append(selected) }
        let canonical = selected.resolvingSymlinksInPath().standardizedFileURL
        let values = try canonical.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey, .contentModificationDateKey])
        guard values.isRegularFile == true, values.isSymbolicLink != true, let size = values.fileSize, size > 0, size <= maximumSourceBytes, allowedExtensions.contains(canonical.pathExtension.lowercased()) else { throw HostError.unavailable("Source is unreadable, unsupported, or too large.") }
        let id = forcedID ?? sourceIDsByPath[canonical.path] ?? catalogSourceIDsByPath[canonical.path] ?? "source:\(UUID().uuidString.lowercased())"
        if let old = sourceBindings[id] { sourceIDsByPath.removeValue(forKey: old.path) }
        if catalogOnly && sourceBindings[id] == nil {
            catalogSourceIDsByPath[canonical.path] = id; catalogURLsBySourceID[id] = canonical
        } else {
            sourceBindings[id] = canonical; sourceIDsByPath[canonical.path] = id
            catalogSourceIDsByPath.removeValue(forKey: canonical.path); catalogURLsBySourceID.removeValue(forKey: id)
        }
        let full = fullExtensions.contains(canonical.pathExtension.lowercased())
        let token = full ? fontAssets.assign(canonical) : nil
        let descriptors = (CTFontManagerCreateFontDescriptorsFromURL(canonical as CFURL) as? [CTFontDescriptor]) ?? []
        let fallbackName = canonical.deletingPathExtension().lastPathComponent.replacingOccurrences(of: "_", with: " ").replacingOccurrences(of: "-", with: " ")
        let faceDescriptors: [CTFontDescriptor?] = descriptors.isEmpty ? [nil] : descriptors.map(Optional.some)
        let faces = faceDescriptors.prefix(256).enumerated().map { index, descriptor -> [String: Any] in
            let family = (descriptor.flatMap { CTFontDescriptorCopyAttribute($0, kCTFontFamilyNameAttribute) as? String }) ?? fallbackName
            let style = (descriptor.flatMap { CTFontDescriptorCopyAttribute($0, kCTFontStyleNameAttribute) as? String }) ?? "Regular"
            let postScript = descriptor.flatMap { CTFontDescriptorCopyAttribute($0, kCTFontNameAttribute) as? String }
            let font = descriptor.map { CTFontCreateWithFontDescriptor($0, 12, nil) }
            let axes = font.map(variableAxes) ?? []
            var face: [String: Any] = [
                "id": "face:\(id):\(index)", "sourceId": id, "family": family, "style": style, "faceIndex": index,
                "axes": axes, "namedInstances": [],
                "features": [["tag": "liga", "name": "Standard ligatures", "group": "ligatures", "defaultEnabled": true], ["tag": "kern", "name": "Kerning", "group": "other", "defaultEnabled": true]],
                "coverage": ["supportedCodePointCount": 0, "scripts": [], "colorFormats": [], "evidenceLevel": "metadata"],
            ]
            if let postScript { face["postScriptName"] = postScript }
            return face
        }
        let family = (faces.first?["family"] as? String) ?? fallbackName
        var binding: [String: Any] = ["sourceId": id, "state": full ? "readable" : "metadata-only", "modifiedAt": ISO8601DateFormatter().string(from: values.contentModificationDate ?? Date()), "rendererSupport": full ? "full" : "metadata-only"]
        if let token { binding["previewUrl"] = "\(fontScheme)://\(fontHost)/\(token)" }
        return [
            "source": ["id": id, "displayName": family, "hint": ["fileName": canonical.lastPathComponent, "format": canonical.pathExtension.uppercased(), "fileSize": size, "faceCount": faces.count], "lastKnownState": full ? "readable" : "metadata-only"],
            "binding": binding, "faces": faces,
        ]
    }

    private func variableAxes(_ font: CTFont) -> [[String: Any]] {
        guard let raw = CTFontCopyVariationAxes(font) as? [[AnyHashable: Any]] else { return [] }
        return raw.enumerated().compactMap { index, axis in
            guard let minimum = axis[kCTFontVariationAxisMinimumValueKey] as? NSNumber, let maximum = axis[kCTFontVariationAxisMaximumValueKey] as? NSNumber, let initial = axis[kCTFontVariationAxisDefaultValueKey] as? NSNumber else { return nil }
            let number = (axis[kCTFontVariationAxisIdentifierKey] as? NSNumber)?.uint32Value
            let bytes = number.map { [UInt8(($0 >> 24) & 255), UInt8(($0 >> 16) & 255), UInt8(($0 >> 8) & 255), UInt8($0 & 255)] }
            let decoded = bytes.flatMap { String(bytes: $0, encoding: .ascii) }
            let tag = decoded?.count == 4 ? decoded! : String(format: "a%03d", index % 1_000)
            let name = (axis[kCTFontVariationAxisNameKey] as? String) ?? tag
            return ["tag": tag, "name": name, "minimum": minimum.doubleValue, "defaultValue": initial.doubleValue, "maximum": maximum.doubleValue]
        }
    }

    private func bindings(for document: [String: Any]) -> [[String: Any]] {
        guard let sources = document["sources"] as? [[String: Any]] else { return [] }
        return sources.compactMap { source in
            guard let id = source["id"] as? String else { return nil }
            guard let url = sourceBindings[id], let values = try? url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .contentModificationDateKey]), values.isRegularFile == true, values.isSymbolicLink != true else { return ["sourceId": id, "state": "missing", "rendererSupport": "unsupported"] }
            let full = fullExtensions.contains(url.pathExtension.lowercased()); var binding: [String: Any] = ["sourceId": id, "state": full ? "readable" : "metadata-only", "rendererSupport": full ? "full" : "metadata-only"]
            if let date = values.contentModificationDate { binding["modifiedAt"] = ISO8601DateFormatter().string(from: date) }
            if full { binding["previewUrl"] = "\(fontScheme)://\(fontHost)/\(fontAssets.assign(url))" }
            return binding
        }
    }

    private func presentOpenStudy(_ reply: @escaping (Any?, String?) -> Void) {
        panelOpened += 1
        let panel = NSOpenPanel(); panel.title = "Open Font Previewer Study"; panel.canChooseDirectories = false; panel.canChooseFiles = true; panel.allowsMultipleSelection = false; panel.allowedContentTypes = [UTType(filenameExtension: "pitchfontstudy") ?? .json, .json]
        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self else { reply(nil, "Host closed."); return }
            guard response == .OK, let url = panel.url else { self.panelCancelled += 1; reply(["type": "study-opened", "document": self.mirroredDocument ?? self.emptyDocument(), "bindings": [], "warnings": ["Open cancelled."]], nil); return }
            do {
                let data = try Data(contentsOf: url, options: [.mappedIfSafe]); guard data.count <= self.maximumStudyBytes, let document = try JSONSerialization.jsonObject(with: data) as? [String: Any], document["schemaVersion"] as? Int == 4 else { throw HostError.invalidStudy("Only schema v4 Studies are accepted by this Host.") }
                self.currentDocumentURL = url; self.addRecent(url); reply(["type": "study-opened", "document": document, "bindings": self.bindings(for: document), "warnings": []], nil)
            } catch { reply(nil, error.localizedDescription) }
        }
    }

    private func presentSave(_ document: [String: Any], _ revision: Int, _ saveAs: Bool, _ reply: @escaping (Any?, String?) -> Void) {
        guard mirroredDocument?["id"] as? String == document["id"] as? String, mirroredRevision == revision else { reply(nil, "Recovery checkpoint must complete before save."); return }
        let write: (URL) -> Void = { [weak self] url in
            guard let self else { reply(nil, "Host closed."); return }
            do { let data = try JSONSerialization.data(withJSONObject: document, options: [.prettyPrinted, .sortedKeys]); try data.write(to: url, options: [.atomic]); self.currentDocumentURL = url; self.intentionallySavedRevision = revision; self.addRecent(url); try self.persistRecovery(); reply(["type": "save-result", "revision": revision, "displayName": url.lastPathComponent, "saved": true], nil) }
            catch { reply(nil, error.localizedDescription) }
        }
        if !saveAs, let url = currentDocumentURL { write(url); return }
        panelOpened += 1
        let panel = NSSavePanel(); panel.title = "Save Font Previewer Study"; panel.nameFieldStringValue = "\(safeStem(document["title"] as? String ?? "Untitled font study")).pitchfontstudy"; panel.allowedContentTypes = [UTType(filenameExtension: "pitchfontstudy") ?? .json]; panel.canCreateDirectories = true
        panel.beginSheetModal(for: window) { [weak self] response in guard let self else { reply(nil, "Host closed."); return }; guard response == .OK, let url = panel.url else { self.panelCancelled += 1; reply(["type": "save-result", "revision": revision, "displayName": "", "saved": false], nil); return }; write(url) }
    }

    private func presentRelink(_ id: String, _ reply: @escaping (Any?, String?) -> Void) {
        panelOpened += 1
        let panel = NSOpenPanel(); panel.title = "Relink font Source"; panel.canChooseDirectories = false; panel.canChooseFiles = true; panel.allowsMultipleSelection = false; panel.resolvesAliases = false; panel.allowedContentTypes = allowedExtensions.compactMap { UTType(filenameExtension: $0) }
        panel.beginSheetModal(for: window) { [weak self] response in guard let self else { reply(nil, "Host closed."); return }; guard response == .OK, let url = panel.url else { self.panelCancelled += 1; reply(["type": "relink-result", "relinked": false], nil); return }; do { let imported = try self.importedSource(url, forcedID: id); try self.persistLocalState(); reply(["type": "relink-result", "import": imported, "relinked": true], nil) } catch { reply(nil, error.localizedDescription) } }
    }

    private func presentExport(_ document: [String: Any], _ revision: Int, _ preferences: [String: Any], _ permission: Bool, _ reply: @escaping (Any?, String?) -> Void) {
        guard mirroredDocument?["id"] as? String == document["id"] as? String, mirroredRevision == revision else { reply(nil, "Recovery checkpoint must complete before export."); return }
        if preferences["includeSources"] as? Bool == true && !permission { reply(nil, "Source-copy permission was not acknowledged."); return }
        panelOpened += 1
        let panel = NSOpenPanel(); panel.title = "Choose Handoff destination"; panel.prompt = "Export Here"; panel.canChooseDirectories = true; panel.canChooseFiles = false; panel.canCreateDirectories = true
        panel.beginSheetModal(for: window) { [weak self] response in
            guard let self else { reply(nil, "Host closed."); return }
            guard response == .OK, let target = panel.url else { self.panelCancelled += 1; reply(["type": "export-result", "displayName": "", "exported": false, "fileCount": 0], nil); return }
            Task { @MainActor in do { let result = try await self.exportHandoff(document, preferences, permission, target); reply(["type": "export-result", "displayName": result.name, "exported": true, "fileCount": result.count], nil) } catch { reply(nil, error.localizedDescription) } }
        }
    }

    fileprivate func exportHandoff(_ document: [String: Any], _ preferences: [String: Any], _ permission: Bool, _ target: URL) async throws -> (name: String, count: Int) {
        let manager = FileManager.default; let base = "\(safeStem(document["title"] as? String ?? "Font Previewer")) Handoff"
        var final = target.appendingPathComponent(base, isDirectory: true); var suffix = 2
        while manager.fileExists(atPath: final.path) { final = target.appendingPathComponent("\(base) \(suffix)", isDirectory: true); suffix += 1 }
        let staging = target.appendingPathComponent(".\(final.lastPathComponent).staging-\(UUID().uuidString.lowercased())", isDirectory: true)
        try manager.createDirectory(at: staging, withIntermediateDirectories: false)
        do {
            let outputs = Set(preferences["outputs"] as? [String] ?? [])
            if outputs.contains("json") { try JSONSerialization.data(withJSONObject: document, options: [.prettyPrinted, .sortedKeys]).write(to: staging.appendingPathComponent("study.pitchfontstudy"), options: [.atomic]) }
            if outputs.contains("summary") { try summary(document).data(using: .utf8)!.write(to: staging.appendingPathComponent("README.md"), options: [.atomic]) }
            if outputs.contains("csv") { try candidateCSV(document).data(using: .utf8)!.write(to: staging.appendingPathComponent("candidates.csv"), options: [.atomic]) }
            let activeStage = (try? await evaluate("document.querySelector('.stage-nav [aria-current=\"step\"]')?.textContent ?? 'Handoff'")) as? String ?? "Handoff"
            for (key, label, name) in [("review-png", "Review", "review.png"), ("compare-png", "Compare", "compare.png"), ("system-png", "System", "system.png")] where outputs.contains(key) {
                _ = try await evaluate("([...document.querySelectorAll('.stage-nav button')].find((item) => item.textContent?.includes('\(label)')))?.click(); true")
                try await Task.sleep(nanoseconds: 120_000_000); try await snapshot(to: staging.appendingPathComponent(name))
            }
            if outputs.contains("pdf") { try await pdfData().write(to: staging.appendingPathComponent("study.pdf"), options: [.atomic]) }
            if let restore = ["Review", "Compare", "System", "Handoff"].first(where: { activeStage.contains($0) }) { _ = try? await evaluate("([...document.querySelectorAll('.stage-nav button')].find((item) => item.textContent?.includes('\(restore)')))?.click(); true") }
            if preferences["includeSources"] as? Bool == true && permission {
                let directory = staging.appendingPathComponent("Sources", isDirectory: true); try manager.createDirectory(at: directory, withIntermediateDirectories: false)
                for source in document["sources"] as? [[String: Any]] ?? [] { guard let id = source["id"] as? String, let url = sourceBindings[id] else { continue }; let name = safeStem(source["displayName"] as? String ?? "Source") + "." + url.pathExtension; try manager.copyItem(at: url, to: uniqueURL(directory.appendingPathComponent(name))) }
            }
            let files = recursiveFiles(staging); var entries: [[String: Any]] = []
            for file in files { let data = try Data(contentsOf: file); guard !data.isEmpty else { throw HostError.exportFailed("Empty output \(file.lastPathComponent)") }; entries.append(["path": relativePath(file, staging), "bytes": data.count, "sha256": sha256(data)]) }
            let manifest: [String: Any] = ["manifestVersion": 1, "generatedAt": ISO8601DateFormatter().string(from: Date()), "product": "Font Previewer", "studyId": document["id"] ?? "unknown", "schemaVersion": 4, "sourcesIncluded": preferences["includeSources"] as? Bool == true, "redistributionPermissionAcknowledged": preferences["includeSources"] as? Bool == true && permission, "files": entries]
            try JSONSerialization.data(withJSONObject: manifest, options: [.prettyPrinted, .sortedKeys]).write(to: staging.appendingPathComponent("manifest.json"), options: [.atomic])
            let checksums = entries.compactMap { entry -> String? in guard let hash = entry["sha256"] as? String, let path = entry["path"] as? String else { return nil }; return "\(hash)  \(path)" }.joined(separator: "\n") + "\n"
            try checksums.data(using: .utf8)!.write(to: staging.appendingPathComponent("checksums.sha256"), options: [.atomic])
            try manager.moveItem(at: staging, to: final); return (final.lastPathComponent, entries.count + 2)
        } catch { try? manager.removeItem(at: staging); throw error }
    }

    fileprivate func evaluate(_ script: String) async throws -> Any? { try await withCheckedThrowingContinuation { continuation in webView.evaluateJavaScript(script) { value, error in if let error { continuation.resume(throwing: error) } else { continuation.resume(returning: value) } } } }
    fileprivate func evaluateAsync(_ expression: String) async throws -> Any? { try await withCheckedThrowingContinuation { continuation in webView.callAsyncJavaScript("return await (\(expression));", arguments: [:], in: nil, in: .page) { result in continuation.resume(with: result) } } }
    fileprivate func snapshot(to url: URL) async throws { let image: NSImage = try await withCheckedThrowingContinuation { continuation in webView.takeSnapshot(with: nil) { image, error in if let image { continuation.resume(returning: image) } else { continuation.resume(throwing: error ?? HostError.exportFailed("Snapshot failed")) } } }; guard let tiff = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) else { throw HostError.exportFailed("PNG encoding failed") }; try png.write(to: url, options: [.atomic]) }
    private func pdfData() async throws -> Data { try await withCheckedThrowingContinuation { continuation in webView.createPDF(configuration: WKPDFConfiguration()) { result in continuation.resume(with: result) } } }

    private func summary(_ document: [String: Any]) -> String { let title = document["title"] as? String ?? "Font Previewer Study"; let candidates = document["candidates"] as? [[String: Any]] ?? []; let counts = ["keep", "maybe", "reject", "unreviewed"].map { state in "- \(state.capitalized): \(candidates.filter { $0["reviewState"] as? String == state }.count)" }.joined(separator: "\n"); return "# \(title)\n\nGenerated by Font Previewer. This Handoff records typography decisions; it does not grant font redistribution rights.\n\n## Decision status\n\n\(counts)\n" }
    private func candidateCSV(_ document: [String: Any]) -> String { var rows = [["candidate_id", "label", "review_state", "tags", "notes", "rationale"]]; for candidate in document["candidates"] as? [[String: Any]] ?? [] { rows.append([candidate["id"] as? String ?? "", candidate["label"] as? String ?? "", candidate["reviewState"] as? String ?? "", (candidate["tags"] as? [String] ?? []).joined(separator: ";"), candidate["notes"] as? String ?? "", candidate["rationale"] as? String ?? ""]) }; return rows.map { $0.map(csvCell).joined(separator: ",") }.joined(separator: "\n") + "\n" }
    private func csvCell(_ value: String) -> String { let neutral = value.range(of: #"^[=+\-@\t\r]"#, options: .regularExpression) == nil ? value : "'\(value)"; return "\"\(neutral.replacingOccurrences(of: "\"", with: "\"\""))\"" }
    private func safeStem(_ value: String) -> String { let illegal = CharacterSet(charactersIn: "<>:\"/\\|?*").union(.controlCharacters); let cleaned = value.components(separatedBy: illegal).joined(separator: " ").split(whereSeparator: \.isWhitespace).joined(separator: " ").trimmingCharacters(in: CharacterSet(charactersIn: ". ")); return String((cleaned.isEmpty ? "Font Previewer" : cleaned).prefix(100)) }
    private func uniqueURL(_ requested: URL) -> URL { var result = requested; var suffix = 2; while FileManager.default.fileExists(atPath: result.path) { result = requested.deletingPathExtension().appendingPathExtension("\(suffix).\(requested.pathExtension)"); suffix += 1 }; return result }
    private func recursiveFiles(_ root: URL) -> [URL] { guard let enumerator = FileManager.default.enumerator(at: root, includingPropertiesForKeys: [.isRegularFileKey]) else { return [] }; return enumerator.compactMap { $0 as? URL }.filter { (try? $0.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true }.sorted { $0.path < $1.path } }
    private func relativePath(_ url: URL, _ root: URL) -> String { String(url.path.dropFirst(root.path.count + 1)) }
    private func sha256(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }

    private func emptyDocument() -> [String: Any] { let now = ISO8601DateFormatter().string(from: Date()); return ["schemaVersion": 4, "id": "study:\(UUID().uuidString.lowercased())", "title": "Untitled font study", "createdAt": now, "updatedAt": now, "sources": [], "faces": [], "candidates": [], "recipes": [["id": "recipe:blank", "pack": "blank", "name": "Custom specimen", "copy": "Type carries the argument before a word is read.", "language": "en", "direction": "auto", "casing": "exact", "sizePolicy": "fit", "size": 72, "lineHeight": 1.04, "tracking": -0.02, "alignment": "leading", "background": "split"]], "comparisonSets": [], "typographySystems": [["id": "system:primary", "name": "Primary system", "rationale": "", "fontUses": []]], "activeSystemId": "system:primary", "handoff": ["profile": "designer", "outputs": ["pdf", "summary", "json", "csv"], "includeSources": false]] }

    private func persistRecovery() throws { guard let document = mirroredDocument, let workspace = mirroredWorkspace else { return }; let value: [String: Any] = ["version": 1, "document": document, "workspace": workspace, "revision": mirroredRevision, "intentionallySavedRevision": intentionallySavedRevision]; try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]).write(to: recoveryURL, options: [.atomic]) }
    private func loadRecovery() { guard let data = try? Data(contentsOf: recoveryURL), data.count <= maximumStudyBytes * 2, let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any], value["version"] as? Int == 1, let document = value["document"] as? [String: Any], document["schemaVersion"] as? Int == 4, let workspace = value["workspace"] as? [String: Any], let revision = value["revision"] as? Int else { return }; mirroredDocument = document; mirroredWorkspace = workspace; mirroredRevision = max(0, revision); intentionallySavedRevision = min(max(0, value["intentionallySavedRevision"] as? Int ?? 0), mirroredRevision) }

    private func persistLocalState() throws {
        let installedPaths = Set((CTFontManagerCopyAvailableFontURLs() as? [URL] ?? []).map { $0.resolvingSymlinksInPath().standardizedFileURL.path })
        let bindings: [[String: Any]] = sourceBindings.compactMap { id, url in
            if let bookmark = try? url.bookmarkData(options: [.withSecurityScope], includingResourceValuesForKeys: nil, relativeTo: nil) { return ["sourceId": id, "bookmark": bookmark.base64EncodedString()] }
            let canonical = url.resolvingSymlinksInPath().standardizedFileURL
            return installedPaths.contains(canonical.path) ? ["sourceId": id, "installedPath": canonical.path] : nil
        }
        let recents = recentDocuments.compactMap { try? $0.bookmarkData(options: [.withSecurityScope], includingResourceValuesForKeys: nil, relativeTo: nil).base64EncodedString() }
        try JSONSerialization.data(withJSONObject: ["version": 1, "bindings": bindings, "recentDocuments": recents], options: [.sortedKeys]).write(to: localStateURL, options: [.atomic])
    }

    private func loadLocalState() {
        guard let data = try? Data(contentsOf: localStateURL), data.count <= 2_000_000, let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any], value["version"] as? Int == 1 else { return }
        var installedURLs: [String: URL] = [:]
        for url in (CTFontManagerCopyAvailableFontURLs() as? [URL] ?? []) { let canonical = url.resolvingSymlinksInPath().standardizedFileURL; installedURLs[canonical.path] = canonical }
        for item in value["bindings"] as? [[String: Any]] ?? [] {
            guard let id = item["sourceId"] as? String else { continue }
            var resolved: URL?
            if let encoded = item["bookmark"] as? String, let bookmark = Data(base64Encoded: encoded) { var stale = false; resolved = try? URL(resolvingBookmarkData: bookmark, options: [.withSecurityScope], relativeTo: nil, bookmarkDataIsStale: &stale) }
            else if let path = item["installedPath"] as? String { resolved = installedURLs[path] }
            guard let url = resolved else { continue }
            _ = url.startAccessingSecurityScopedResource(); scopedURLs.append(url); sourceBindings[id] = url; sourceIDsByPath[url.path] = id
        }
        for encoded in value["recentDocuments"] as? [String] ?? [] { guard let bookmark = Data(base64Encoded: encoded) else { continue }; var stale = false; if let url = try? URL(resolvingBookmarkData: bookmark, options: [.withSecurityScope], relativeTo: nil, bookmarkDataIsStale: &stale) { recentDocuments.append(url) } }
    }

    private func addRecent(_ url: URL) { recentDocuments = [url] + recentDocuments.filter { $0 != url }; recentDocuments = Array(recentDocuments.prefix(10)); try? persistLocalState() }

    private func allowedLocalURL(_ url: URL) -> Bool { url.scheme == studioScheme && url.host == studioHost && url.user == nil && url.password == nil && url.port == nil }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) { guard action.targetFrame?.isMainFrame != false, let url = action.request.url, allowedLocalURL(url) else { navigationRejections += 1; decisionHandler(.cancel); return }; decisionHandler(.allow) }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? { popupRejections += 1; return nil }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { processTerminations += 1; webView.reload() }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        window.makeFirstResponder(webView)
        guard !evidenceStarted, let output = ProcessInfo.processInfo.environment[evidenceEnvironmentKey] else { return }
        evidenceStarted = true; let runner = MacEvidenceRunner(host: self, output: URL(fileURLWithPath: output, isDirectory: true)); evidenceRunner = runner; runner.start()
    }
}

@MainActor
private final class MacEvidenceRunner {
    private unowned let host: FontPreviewerHostDelegate
    private let output: URL
    init(host: FontPreviewerHostDelegate, output: URL) { self.host = host; self.output = output }
    func start() { Task { @MainActor in do { try await run(); Darwin.exit(0) } catch { fputs("[mac evidence] \(error.localizedDescription)\n", stderr); try? error.localizedDescription.data(using: .utf8)?.write(to: output.appendingPathComponent("failure.txt")); Darwin.exit(1) } } }
    private func run() async throws {
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        try await wait("Studio") { try await self.bool("window.fontPreviewerHost && document.querySelector('#workspace-heading') && document.querySelector('.host-probe')?.textContent?.includes('wkwebview')") }
        var trace: [String: Any] = ["generatedAt": ISO8601DateFormatter().string(from: Date()), "host": "wkwebview", "initial": try await inspect(), "nativeMenu": ["installed": NSApp.mainMenu != nil, "import": NSApp.mainMenu?.item(withTitle: "File")?.submenu?.item(withTitle: "Import Sources…") != nil, "undo": NSApp.mainMenu?.item(withTitle: "Edit")?.submenu?.item(withTitle: "Undo Study Change") != nil]]
        try await host.snapshot(to: output.appendingPathComponent("01-review.png"))
        _ = try await host.evaluate("document.querySelector('#import-fonts-button')?.focus(); true")
        try performMenu("File", "Import Sources…")
        try await wait("native Import panel") { self.host.panelOpened > 0 && self.host.panelCancelled > 0 }
        try await wait("native Import focus restoration") { try await self.bool("document.activeElement?.id==='import-fonts-button'") }
        trace["nativePanelFocus"] = "import-fonts-button"
        trace["keyboardAccessibility"] = try await keyboardAccessibilityAudit()
        host.sendMenu(["type": "mark-keep"]); try await wait("Keep") { try await self.bool("document.querySelector('.candidate-row[aria-current=\"true\"] .review-glyph')?.getAttribute('aria-label') === 'Keep'") }
        host.sendMenu(["type": "undo-study"]); try await wait("Undo") { try await self.bool("document.querySelector('.candidate-row[aria-current=\"true\"] .review-glyph')?.getAttribute('aria-label') === 'Unreviewed'") }; host.sendMenu(["type": "redo-study"]); try await wait("Redo") { try await self.bool("document.querySelector('.candidate-row[aria-current=\"true\"] .review-glyph')?.getAttribute('aria-label') === 'Keep'") }
        trace["afterMenuUndoRedo"] = try await inspect()
        trace["bridge"] = try await host.evaluateAsync("(async()=>{const v=[];for(let i=0;i<40;i++){const s=performance.now();const r=await window.fontPreviewerHost.request({type:'probe',serial:i});if(r.serial!==i)throw new Error('probe');v.push(performance.now()-s)}return {samples:v.length,max:Math.max(...v),mean:v.reduce((a,b)=>a+b,0)/v.length}})()") ?? NSNull()
        trace["installedCatalog"] = try await host.evaluateAsync("(async()=>{const studyCount=()=>Number([...document.querySelectorAll('.catalog-switcher button')].find(item=>item.textContent?.trim().startsWith('Study'))?.querySelector('span')?.textContent??-1);const beforeStudy=studyCount();[...document.querySelectorAll('.catalog-switcher button')].find(item=>item.textContent?.trim().startsWith('Catalog'))?.click();const deadline=performance.now()+30000;while(!document.querySelector('.catalog-results .catalog-source')&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));const afterStudy=studyCount();const r=await window.fontPreviewerHost.request({type:'scan-installed',query:'',cursor:0,limit:40,refresh:false});if(r.type!=='catalog-result')throw new Error('catalog');const raw=JSON.stringify(r);const preview=r.imports.find(item=>item.binding.previewUrl)?.binding.previewUrl;let fontLoaded=false;if(preview){const face=new FontFace('Font Previewer Evidence','url(\"'+preview+'\")');await face.load();fontLoaded=face.status==='loaded'}return {count:r.imports.length,indexed:r.indexed,total:r.total,rejected:r.rejected,truncated:r.truncated,pageBounded:r.imports.length<=40,studyUnchanged:beforeStudy>=0&&beforeStudy===afterStudy,rendered:document.querySelectorAll('.catalog-results .catalog-source').length,pathLeak:/(?:file:\\/\\/|\\/home\\/|\\/Users\\/|[A-Za-z]:\\\\)/.test(raw),opaquePreviewUrls:r.imports.every(item=>!item.binding.previewUrl||item.binding.previewUrl.startsWith('pitch-font://asset/')),previewAvailable:Boolean(preview),fontLoaded}})()") ?? NSNull()
        try await host.snapshot(to: output.appendingPathComponent("06-catalog.png"))
        for (stage, file) in [("Compare", "02-compare.png"), ("System", "03-system.png"), ("Handoff", "04-handoff.png")] { _ = try await host.evaluate("([...document.querySelectorAll('.stage-nav button')].find((item)=>item.textContent?.includes('\(stage)')))?.click();true"); try await Task.sleep(nanoseconds: 150_000_000); try await host.snapshot(to: output.appendingPathComponent(file)) }
        trace["security"] = try await host.evaluateAsync("(async()=>{const bad=[{type:'open-import',path:'/tmp/x'},{type:'probe',serial:-1},{type:'read-file',path:'/etc/passwd'},{type:'scan-installed'},{type:'scan-installed',query:'',cursor:0,limit:10000,refresh:false}];let rejected=0;for(const r of bad){try{await window.fontPreviewerHost.request(r)}catch{rejected++}}return {attempts:bad.length,rejected,nodeUnavailable:typeof window.require==='undefined'&&typeof window.process==='undefined',hostKeys:Object.keys(window.fontPreviewerHost).sort()}})()") ?? NSNull()
        trace["semantics"] = try await host.evaluate("(()=>{const controls=[...document.querySelectorAll('button,input,select,textarea')];const named=el=>el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.closest('label')?.textContent?.trim()||el.textContent?.trim();const roleLabel=[...document.querySelectorAll('.field-label')].find(label=>label.querySelector(':scope > span')?.textContent?.trim()==='Role');const roleSelect=roleLabel?.querySelector('select')?.getBoundingClientRect();const roleHelp=roleLabel?.querySelector(':scope > small')?.getBoundingClientRect();return {controls:controls.length,unnamed:controls.filter(el=>!named(el)).length,mains:document.querySelectorAll('main').length,asides:document.querySelectorAll('aside').length,duplicateIds:[...document.querySelectorAll('[id]')].map(el=>el.id).filter((id,i,a)=>a.indexOf(id)!==i).length,horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,roleHelpSeparated:Boolean(roleSelect&&roleHelp&&roleSelect.bottom<=roleHelp.top)}})()") ?? NSNull()
        try await wait("Recovery") { try await self.bool("document.querySelector('.document-title > span:last-child')?.textContent?.includes('recovery ready')") }
        let before = try await inspect(); host.webView.reload(); try await wait("Reload") { try await self.bool("document.querySelector('#workspace-heading') && document.activeElement?.id==='workspace-heading' && document.querySelector('.candidate-row[aria-current=\"true\"] .review-glyph')?.getAttribute('aria-label')==='Keep'") }; let after = try await inspect(); trace["reload"] = ["before": before, "after": after]
        try await host.snapshot(to: output.appendingPathComponent("05-recovered.png"))
        trace["nativePanel"] = ["opened": host.panelOpened, "cancelled": host.panelCancelled]
        trace["hostCounters"] = ["rejectedRequests": host.rejectedRequests, "menuCommands": host.menuCommands, "navigationRejections": host.navigationRejections, "popupRejections": host.popupRejections, "processTerminations": host.processTerminations]
        try JSONSerialization.data(withJSONObject: trace, options: [.prettyPrinted, .sortedKeys]).write(to: output.appendingPathComponent("run.json"), options: [.atomic])
        let security = trace["security"] as? [String: Any]; let semantics = trace["semantics"] as? [String: Any]; let keyboard = trace["keyboardAccessibility"] as? [String: Any]; let catalog = trace["installedCatalog"] as? [String: Any]
        guard security?["attempts"] as? Int == security?["rejected"] as? Int, security?["nodeUnavailable"] as? Bool == true, semantics?["unnamed"] as? Int == 0, semantics?["duplicateIds"] as? Int == 0, semantics?["horizontalOverflow"] as? Bool == false, semantics?["roleHelpSeparated"] as? Bool == true, keyboard?["forwardWrap"] as? Bool == true, keyboard?["backwardWrap"] as? Bool == true, keyboard?["candidateUnchanged"] as? Bool == true, keyboard?["trayUnchanged"] as? Bool == true, keyboard?["returnFocus"] as? Bool == true, ((catalog?["count"] as? Int) ?? 0) > 0, ((catalog?["indexed"] as? Int) ?? 0) > 0, catalog?["pageBounded"] as? Bool == true, catalog?["studyUnchanged"] as? Bool == true, catalog?["pathLeak"] as? Bool == false, catalog?["opaquePreviewUrls"] as? Bool == true, catalog?["previewAvailable"] as? Bool == true, catalog?["fontLoaded"] as? Bool == true, host.panelOpened > 0, host.panelCancelled > 0 else { throw HostError.unavailable("Evidence assertions failed") }
    }
    private func performMenu(_ menuTitle: String, _ itemTitle: String) throws {
        guard let menu = NSApp.mainMenu?.item(withTitle: menuTitle)?.submenu, let item = menu.item(withTitle: itemTitle) else { throw HostError.unavailable("Missing native menu item \(menuTitle) → \(itemTitle)") }
        let index = menu.index(of: item); guard index >= 0 else { throw HostError.unavailable("Detached native menu item \(itemTitle)") }
        menu.performActionForItem(at: index)
    }
    private func keyboardAccessibilityAudit() async throws -> [String: Any] {
        _ = try await host.evaluate("document.querySelector('#import-fonts-button')?.focus(); true")
        host.sendMenu(["type": "new-study"])
        try await wait("New Study dialog") { try await self.bool("document.querySelector('.new-study-dialog') && document.activeElement?.closest('.new-study-dialog')") }
        let trap = try await host.evaluate("(()=>{const d=document.querySelector('.new-study-dialog');const f=[...d.querySelectorAll(\"button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])\")];const first=f[0],last=f.at(-1);last.focus();last.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));const forwardWrap=document.activeElement===first;first.focus();first.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));return {forwardWrap,backwardWrap:document.activeElement===last}})()") as? [String: Any] ?? [:]
        _ = try await host.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})); true")
        try await wait("New Study close") { try await self.bool("!document.querySelector('.new-study-dialog') && document.activeElement?.id==='import-fonts-button'") }
        let collision = try await host.evaluateAsync("(async()=>{const s=document.querySelector('.stage-nav [aria-current=\"step\"]');const beforeCandidate=document.querySelector('.candidate-row[aria-current=\"true\"]')?.textContent;const beforeTray=document.querySelectorAll('.tray-item').length;s.focus();s.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));s.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));await new Promise(r=>requestAnimationFrame(r));return {candidateUnchanged:beforeCandidate===document.querySelector('.candidate-row[aria-current=\"true\"]')?.textContent,trayUnchanged:beforeTray===document.querySelectorAll('.tray-item').length,returnFocus:document.activeElement===s}})()") as? [String: Any] ?? [:]
        return trap.merging(collision) { _, right in right }
    }
    private func inspect() async throws -> [String: Any] { (try await host.evaluate("(()=>({heading:document.querySelector('#workspace-heading')?.textContent?.replace(/\\s+/g,' ').trim()??null,stage:document.querySelector('.stage-nav [aria-current=\"step\"]')?.textContent?.replace(/\\s+/g,' ').trim()??null,reviewState:document.querySelector('.candidate-row[aria-current=\"true\"] .review-glyph')?.getAttribute('aria-label')??null,activeElement:document.activeElement?.id||document.activeElement?.tagName||null,durability:document.querySelector('.document-title > span:last-child')?.textContent?.trim()??null}))()")) as? [String: Any] ?? [:] }
    private func bool(_ expression: String) async throws -> Bool { (try await host.evaluate("Boolean(\(expression))")) as? Bool == true }
    private func wait(_ label: String, condition: @escaping () async throws -> Bool) async throws { let deadline = Date().addingTimeInterval(20); while Date() < deadline { if try await condition() { return }; try await Task.sleep(nanoseconds: 100_000_000) }; throw HostError.unavailable("Timed out waiting for \(label)") }
}
