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
private let stateEnvironmentKey = "FONT_PREVIEWER_MAC_STATE_DIR"

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
    case cancelCatalog
    case openStudy
    case mirrorStudy([String: Any], [String: Any], Int)
    case saveStudy([String: Any], Int, Bool)
    case exportHandoff([String: Any], Int, [String: Any], Bool)
    case relinkSource(String)
    case revealSource(String)
    case nativeUndo
    case finishTerminate(Int, Bool)
    case reloadStudio
    case probe(Int)
}

private struct InstalledCatalogEntry {
    let url: URL
    let searchText: String
}

private struct SimpleExportManifest {
    let width: Int
    let height: Int
    let pageMode: String
    let boardCount: Int
    let bodyCount: Int
    let indexCount: Int
    let fontCount: Int
    let includeIndex: Bool
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
private final class FontPreviewerHostDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandlerWithReply {
    fileprivate var webView: WKWebView!
    fileprivate var window: NSWindow!
    fileprivate var panelOpened = 0
    fileprivate var panelCancelled = 0
    fileprivate var rejectedRequests = 0
    fileprivate var menuCommands = 0
    fileprivate var navigationRejections = 0
    fileprivate var popupRejections = 0
    fileprivate var processTerminations = 0
    fileprivate var nativeTextHistoryCommands = 0

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
    private var catalogGeneration = 0
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
    private var terminationReplyPending = false
    private var terminationTimeout: DispatchWorkItem?

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
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        guard !terminationReplyPending else { return .terminateLater }
        terminationReplyPending = true
        sendMenu(["type": "flush-recovery"])
        let timeout = DispatchWorkItem { [weak self, weak sender] in
            guard let self, let sender, self.terminationReplyPending else { return }
            self.terminationReplyPending = false
            self.terminationTimeout = nil
            self.sendEvent(["type": "mirror-warning", "message": "Quit cancelled because the final recovery checkpoint was not confirmed."])
            sender.reply(toApplicationShouldTerminate: false)
        }
        terminationTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 5, execute: timeout)
        return .terminateLater
    }
    func applicationWillTerminate(_ notification: Notification) { scopedURLs.forEach { $0.stopAccessingSecurityScopedResource() } }

    private func configureStorage() throws {
        let environment = ProcessInfo.processInfo.environment
        let support: URL
        if let evidencePath = environment[evidenceEnvironmentKey], !evidencePath.isEmpty {
            support = URL(fileURLWithPath: evidencePath, isDirectory: true).appendingPathComponent("state", isDirectory: true)
        } else if let statePath = environment[stateEnvironmentKey], !statePath.isEmpty {
            support = URL(fileURLWithPath: statePath, isDirectory: true)
        } else {
            support = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
                .appendingPathComponent("Font Previewer", isDirectory: true)
        }
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
        webView.underPageBackgroundColor = NSColor(calibratedRed: 0.082, green: 0.082, blue: 0.071, alpha: 1)
        webView.setAccessibilityLabel("Font Previewer Studio")
        webView.setAccessibilityHelp("Add fonts, make four-up boards, compare Candidates, build a typography System, and export a Handoff.")
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
        addMenu(edit, "Undo", "z", [], #selector(undoStudyMenu(_:)), "font-previewer-undo")
        addMenu(edit, "Redo", "Z", [.command, .shift], #selector(redoStudyMenu(_:)), "font-previewer-redo")
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
    @objc private func undoStudyMenu(_ sender: Any?) { performHistoryCommand("undo-study", redo: false) }
    @objc private func redoStudyMenu(_ sender: Any?) { performHistoryCommand("redo-study", redo: true) }
    @objc private func keepMenu(_ sender: Any?) { sendMenu(["type": "mark-keep"]) }
    @objc private func nextMenu(_ sender: Any?) { sendMenu(["type": "next-unreviewed"]) }
    @objc private func stageMenu(_ sender: NSMenuItem) { if let stage = sender.representedObject as? String { sendMenu(["type": "set-stage", "stage": stage]) } }
    @objc private func reloadMenu(_ sender: Any?) { sendMenu(["type": "reload-studio"]) }

    private func performHistoryCommand(_ command: String, redo: Bool) {
        webView.evaluateJavaScript("""
            (() => {
              const element = document.activeElement;
              return element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement ||
                Boolean(element?.isContentEditable);
            })()
            """) { [weak self] value, _ in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    guard value as? Bool == true else {
                        self.sendMenu(["type": command])
                        return
                    }
                    self.nativeTextHistoryCommands += 1
                    self.window.makeFirstResponder(self.webView)
                    if redo {
                        if self.webView.undoManager?.canRedo == true { self.webView.undoManager?.redo() }
                    } else if self.webView.undoManager?.canUndo == true {
                        self.webView.undoManager?.undo()
                    }
                }
            }
    }

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
        case "cancel-catalog": return exact(object, ["type"]) ? .cancelCatalog : nil
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
        case "finish-terminate":
            guard exact(object, ["type", "revision", "recoveryPersisted"]), let revision = integer(object["revision"]), let recoveryPersisted = object["recoveryPersisted"] as? Bool else { return nil }
            return .finishTerminate(revision, recoveryPersisted)
        case "reload-studio": return exact(object, ["type"]) ? .reloadStudio : nil
        case "probe": guard exact(object, ["type", "serial"]), let serial = integer(object["serial"]) else { return nil }; return .probe(serial)
        default: return nil
        }
    }

    private func validJSON(_ value: Any, maximum: Int) -> Bool { (try? JSONSerialization.data(withJSONObject: value)).map { $0.count <= maximum } ?? false }

    nonisolated func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        MainActor.assumeIsolated {
            guard message.name == bridgeHandlerName, message.frameInfo.isMainFrame, message.world.name == bridgeWorldName, let request = parseRequest(message.body) else { rejectedRequests += 1; replyHandler(nil, HostError.invalidRequest.localizedDescription); return }
            switch request {
            case .getLaunchState: replyHandler(launchState(), nil)
            case .openImport: presentImport(replyHandler)
            case .scanInstalled(let query, let cursor, let limit, let refresh):
                catalogGeneration += 1
                let generation = catalogGeneration
                Task { @MainActor [weak self] in
                    guard let self else { replyHandler(nil, "Host closed during Catalog scan."); return }
                    replyHandler(await self.catalogResult(query: query, cursor: cursor, limit: limit, refresh: refresh, generation: generation), nil)
                }
            case .cancelCatalog:
                catalogGeneration += 1
                replyHandler(["type": "ack", "action": "cancel-catalog"], nil)
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
            case .finishTerminate(let revision, let recoveryPersisted):
                guard terminationReplyPending else { replyHandler(nil, "No quit checkpoint is pending."); return }
                let shouldTerminate = recoveryPersisted && mirroredRevision == revision
                terminationTimeout?.cancel()
                terminationTimeout = nil
                terminationReplyPending = false
                replyHandler(["type": "ack", "action": "finish-terminate"], nil)
                if !shouldTerminate { sendEvent(["type": "mirror-warning", "message": "Quit cancelled because the latest edit could not be recovered safely."]) }
                DispatchQueue.main.async { NSApp.reply(toApplicationShouldTerminate: shouldTerminate) }
            case .reloadStudio: replyHandler(["type": "ack", "action": "reload-studio"], nil); DispatchQueue.main.asyncAfter(deadline: .now() + 0.025) { [weak self] in self?.webView.reload() }
            case .probe(let serial): replyHandler(["type": "probe-result", "serial": serial, "host": "wkwebview"], nil)
            }
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

    private func catalogOperationIsCurrent(_ generation: Int) -> Bool {
        generation == catalogGeneration && !Task.isCancelled
    }

    private func cancelledCatalogResult() -> [String: Any] {
        ["type": "catalog-result", "imports": [], "indexed": installedCatalogIndex.count, "total": 0, "rejected": 0, "truncated": installedCatalogTruncated, "cancelled": true]
    }

    private func rebuildInstalledCatalog(generation: Int) async -> Bool {
        var rebuilt: [InstalledCatalogEntry] = []
        var truncated = false
        var seen = Set<String>()
        for (index, selected) in (CTFontManagerCopyAvailableFontURLs() as? [URL] ?? []).enumerated() {
            if index % 8 == 0 {
                await Task.yield()
                guard catalogOperationIsCurrent(generation) else { return false }
            }
            let url = selected.resolvingSymlinksInPath().standardizedFileURL
            guard allowedExtensions.contains(url.pathExtension.lowercased()) else { continue }
            guard seen.insert(url.path).inserted else { continue }
            if rebuilt.count >= maximumCatalogEntries { truncated = true; break }
            let descriptors = (CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as? [CTFontDescriptor]) ?? []
            let names = descriptors.prefix(32).flatMap { descriptor -> [String] in
                let family = CTFontDescriptorCopyAttribute(descriptor, kCTFontFamilyNameAttribute) as? String
                let style = CTFontDescriptorCopyAttribute(descriptor, kCTFontStyleNameAttribute) as? String
                return [family, style].compactMap { $0 }
            }
            let text = ([url.deletingPathExtension().lastPathComponent] + names).joined(separator: " ").folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current).lowercased()
            rebuilt.append(InstalledCatalogEntry(url: url, searchText: text))
        }
        guard catalogOperationIsCurrent(generation) else { return false }
        rebuilt.sort { $0.searchText.localizedStandardCompare($1.searchText) == .orderedAscending }
        guard catalogOperationIsCurrent(generation) else { return false }
        installedCatalogIndex = rebuilt
        installedCatalogTruncated = truncated
        catalogImportCache = [:]
        catalogCacheOrder = []
        return true
    }

    private func catalogResult(query: String, cursor: Int, limit: Int, refresh: Bool, generation: Int) async -> [String: Any] {
        if refresh || installedCatalogIndex.isEmpty {
            guard await rebuildInstalledCatalog(generation: generation) else { return cancelledCatalogResult() }
        }
        guard catalogOperationIsCurrent(generation) else { return cancelledCatalogResult() }
        let normalized = query.trimmingCharacters(in: .whitespacesAndNewlines).folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current).lowercased()
        let matches = normalized.isEmpty ? installedCatalogIndex : installedCatalogIndex.filter { $0.searchText.contains(normalized) }
        guard catalogOperationIsCurrent(generation) else { return cancelledCatalogResult() }
        let start = min(cursor, matches.count)
        let end = min(start + limit, matches.count)
        let page = Array(matches[start..<end])
        var imports: [[String: Any]] = []
        var rejected = 0
        for (index, entry) in page.enumerated() {
            await Task.yield()
            guard catalogOperationIsCurrent(generation) else { return cancelledCatalogResult() }
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
        var response: [String: Any] = ["type": "catalog-result", "imports": imports, "indexed": installedCatalogIndex.count, "total": matches.count, "rejected": rejected, "truncated": installedCatalogTruncated, "cancelled": false]
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

    fileprivate func importedSource(_ selected: URL, forcedID: String? = nil, catalogOnly: Bool = false) throws -> [String: Any] {
        let initial = try selected.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
        guard initial.isRegularFile == true, initial.isSymbolicLink != true else { throw HostError.unavailable("Source is not a regular file.") }
        let accessStarted = !catalogOnly && selected.startAccessingSecurityScopedResource()
        var retainAccess = false
        defer { if accessStarted && !retainAccess { selected.stopAccessingSecurityScopedResource() } }
        let canonical = selected.resolvingSymlinksInPath().standardizedFileURL
        let values = try canonical.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey, .contentModificationDateKey])
        guard values.isRegularFile == true, values.isSymbolicLink != true, let size = values.fileSize, size > 0, size <= maximumSourceBytes, allowedExtensions.contains(canonical.pathExtension.lowercased()) else { throw HostError.unavailable("Source is unreadable, unsupported, or too large.") }
        let full = fullExtensions.contains(canonical.pathExtension.lowercased())
        let descriptors = (CTFontManagerCreateFontDescriptorsFromURL(canonical as CFURL) as? [CTFontDescriptor]) ?? []
        guard !full || !descriptors.isEmpty else { throw HostError.unavailable("Source font metadata could not be read.") }
        if accessStarted { scopedURLs.append(selected); retainAccess = true }
        let id = forcedID ?? sourceIDsByPath[canonical.path] ?? catalogSourceIDsByPath[canonical.path] ?? "source:\(UUID().uuidString.lowercased())"
        if let old = sourceBindings[id] { sourceIDsByPath.removeValue(forKey: old.path) }
        if catalogOnly && sourceBindings[id] == nil {
            catalogSourceIDsByPath[canonical.path] = id; catalogURLsBySourceID[id] = canonical
        } else {
            sourceBindings[id] = canonical; sourceIDsByPath[canonical.path] = id
            catalogSourceIDsByPath.removeValue(forKey: canonical.path); catalogURLsBySourceID.removeValue(forKey: id)
        }
        let token = full ? fontAssets.assign(canonical) : nil
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

    fileprivate func exportHandoff(_ document: [String: Any], _ preferences: [String: Any], _ permission: Bool, _ target: URL, commit: ((URL, URL) throws -> Void)? = nil) async throws -> (name: String, count: Int) {
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
            let simple = try await simpleExportManifest(document)
            let activeStage = simple == nil ? ((try? await evaluate("document.querySelector('.stage-nav [aria-current=\"step\"]')?.textContent ?? 'Handoff'")) as? String ?? "Handoff") : nil
            if let simple { try await renderSimplePages(simple, staging) }
            for (key, label, name) in [("review-png", "Review", "review.png"), ("compare-png", "Compare", "compare.png"), ("system-png", "System", "system.png")] where simple == nil && outputs.contains(key) {
                _ = try await evaluate("([...document.querySelectorAll('.stage-nav button')].find((item) => item.textContent?.includes('\(label)')))?.click(); true")
                try await Task.sleep(nanoseconds: 120_000_000); try await snapshot(to: staging.appendingPathComponent(name))
            }
            if outputs.contains("pdf") { try await pdfData().write(to: staging.appendingPathComponent("study.pdf"), options: [.atomic]) }
            if let activeStage, let restore = ["Review", "Compare", "System", "Handoff"].first(where: { activeStage.contains($0) }) { _ = try? await evaluate("([...document.querySelectorAll('.stage-nav button')].find((item) => item.textContent?.includes('\(restore)')))?.click(); true") }
            if preferences["includeSources"] as? Bool == true && permission {
                let directory = staging.appendingPathComponent("Sources", isDirectory: true); try manager.createDirectory(at: directory, withIntermediateDirectories: false)
                for source in document["sources"] as? [[String: Any]] ?? [] { guard let id = source["id"] as? String, let url = sourceBindings[id] else { continue }; let name = safeStem(source["displayName"] as? String ?? "Source") + "." + url.pathExtension; try manager.copyItem(at: url, to: uniqueURL(directory.appendingPathComponent(name))) }
            }
            let files = recursiveFiles(staging); var entries: [[String: Any]] = []
            for file in files { let data = try Data(contentsOf: file); guard !data.isEmpty else { throw HostError.exportFailed("Empty output \(file.lastPathComponent)") }; entries.append(["path": try relativePath(file, staging), "bytes": data.count, "sha256": sha256(data)]) }
            let manifest: [String: Any] = ["manifestVersion": 1, "generatedAt": ISO8601DateFormatter().string(from: Date()), "product": "Font Previewer", "studyId": document["id"] ?? "unknown", "schemaVersion": 4, "sourcesIncluded": preferences["includeSources"] as? Bool == true, "redistributionPermissionAcknowledged": preferences["includeSources"] as? Bool == true && permission, "files": entries]
            try JSONSerialization.data(withJSONObject: manifest, options: [.prettyPrinted, .sortedKeys]).write(to: staging.appendingPathComponent("manifest.json"), options: [.atomic])
            let checksums = entries.compactMap { entry -> String? in guard let hash = entry["sha256"] as? String, let path = entry["path"] as? String else { return nil }; return "\(hash)  \(path)" }.joined(separator: "\n") + "\n"
            try checksums.data(using: .utf8)!.write(to: staging.appendingPathComponent("checksums.sha256"), options: [.atomic])
            if let commit { try commit(staging, final) } else { try manager.moveItem(at: staging, to: final) }
            return (final.lastPathComponent, entries.count + 2)
        } catch { try? manager.removeItem(at: staging); throw error }
    }

    private func simpleExportManifest(_ document: [String: Any]) async throws -> SimpleExportManifest? {
        let raw = try await evaluate("""
        (() => {
          const shell = document.querySelector('.app-shell[data-interface-mode="simple"]');
          const runtime = window.__fontPreviewerSimpleExport;
          return shell && runtime ? runtime.manifest() : null;
        })()
        """)
        if raw == nil || raw is NSNull { return nil }
        guard let value = raw as? [String: Any] else { return nil }
        func integer(_ key: String) throws -> Int {
            guard let number = value[key] as? NSNumber else { throw HostError.exportFailed("Simple export manifest has an invalid \(key).") }
            let double = number.doubleValue
            guard double.isFinite, double >= 0, double.rounded() == double, double <= Double(Int.max) else { throw HostError.exportFailed("Simple export manifest has an invalid \(key).") }
            return Int(double)
        }
        let width = try integer("width")
        let height = try integer("height")
        let fontCount = try integer("fontCount")
        let boardCount = try integer("boardCount")
        let bodyCount = try integer("bodyCount")
        let indexCount = try integer("indexCount")
        guard let pageMode = value["pageMode"] as? String, ["boards", "body"].contains(pageMode) else { throw HostError.exportFailed("Simple export manifest has an invalid page mode.") }
        guard let includeIndex = value["includeIndex"] as? Bool else { throw HostError.exportFailed("Simple export manifest has an invalid index setting.") }
        guard width == 5_152, height == 2_160 else { throw HostError.exportFailed("Simple pages must be 5152 × 2160.") }
        guard fontCount >= 1, fontCount <= 8_192 else { throw HostError.exportFailed("Simple export font count is outside the Study limit.") }
        let expectedFontCount = (document["candidates"] as? [[String: Any]] ?? []).filter { $0["reviewState"] as? String != "reject" }.count
        guard fontCount == expectedFontCount else { throw HostError.exportFailed("Simple export font count does not match the mirrored Study.") }
        if pageMode == "boards" {
            guard boardCount == Int(ceil(Double(fontCount) / 4.0)), bodyCount == 0 else { throw HostError.exportFailed("Simple export board count does not match its fonts.") }
            guard indexCount == (includeIndex ? Int(ceil(Double(fontCount) / 12.0)) : 0) else { throw HostError.exportFailed("Simple export index count does not match its fonts.") }
        } else {
            guard boardCount == 0, indexCount == 0, bodyCount == fontCount, !includeIndex else { throw HostError.exportFailed("Simple export Body Copy count does not match its fonts.") }
        }
        return SimpleExportManifest(width: width, height: height, pageMode: pageMode, boardCount: boardCount, bodyCount: bodyCount, indexCount: indexCount, fontCount: fontCount, includeIndex: includeIndex)
    }

    private func simplePNG(_ raw: Any?) throws -> Data {
        let prefix = "data:image/png;base64,"
        guard let dataURL = raw as? String, dataURL.hasPrefix(prefix), dataURL.count <= 128 * 1024 * 1024 else { throw HostError.exportFailed("Simple page renderer returned an invalid PNG payload.") }
        let encoded = String(dataURL.dropFirst(prefix.count))
        guard !encoded.isEmpty, encoded.count.isMultiple(of: 4), encoded.range(of: #"^[A-Za-z0-9+/]+={0,2}$"#, options: .regularExpression) != nil,
              let data = Data(base64Encoded: encoded), data.count <= 96 * 1024 * 1024,
              let bitmap = NSBitmapImageRep(data: data), bitmap.pixelsWide == 5_152, bitmap.pixelsHigh == 2_160
        else { throw HostError.exportFailed("Simple page PNG failed 5152 × 2160 decode verification.") }
        return data
    }

    private func renderSimplePages(_ manifest: SimpleExportManifest, _ staging: URL) async throws {
        let manager = FileManager.default
        let pageGroups: [(kind: String, count: Int, directory: String, stem: String)] = [
            ("board", manifest.boardCount, "Boards", "Board"),
            ("body", manifest.bodyCount, "Body Copy", "Body"),
            ("index", manifest.indexCount, "Index", "Index"),
        ]
        let total = manifest.boardCount + manifest.bodyCount + manifest.indexCount
        var completed = 0
        for group in pageGroups where group.count > 0 {
            let directory = staging.appendingPathComponent(group.directory, isDirectory: true)
            try manager.createDirectory(at: directory, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700])
            let digits = max(2, String(group.count).count)
            for index in 0..<group.count {
                let raw = try await evaluateAsync("window.__fontPreviewerSimpleExport.render('\(group.kind)', \(index))")
                let data = try simplePNG(raw)
                let number = String(format: "%0*d", digits, index + 1)
                let output = directory.appendingPathComponent("\(group.stem)_\(number).png")
                try data.write(to: output, options: [.atomic])
                try manager.setAttributes([.posixPermissions: 0o600], ofItemAtPath: output.path)
                completed += 1
                sendEvent(["type": "task-progress", "task": "boards", "completed": completed, "total": total])
            }
        }
    }

    fileprivate func verifyHandoffFaultInjection(in target: URL) async throws -> [String: Any] {
        let manager = FileManager.default
        guard let document = mirroredDocument else { throw HostError.exportFailed("No mirrored Study for Handoff fault injection") }
        try manager.createDirectory(at: target, withIntermediateDirectories: true)
        let preferences: [String: Any] = ["profile": "technical", "outputs": ["summary", "json", "csv"], "includeSources": false]
        let committed = try await exportHandoff(document, preferences, false, target)
        let manifest = target.appendingPathComponent(committed.name, isDirectory: true).appendingPathComponent("manifest.json")
        let before = try Data(contentsOf: manifest)
        var failureObserved = false
        do {
            _ = try await exportHandoff(document, preferences, false, target) { _, _ in throw HostError.exportFailed("Injected Handoff commit failure") }
        } catch {
            failureObserved = true
        }
        let after = try Data(contentsOf: manifest)
        let names = try manager.contentsOfDirectory(atPath: target.path)
        return [
            "failureObserved": failureObserved,
            "priorExportByteIdentical": before == after,
            "stagingClean": !names.contains { $0.contains(".staging-") },
            "committedFolder": committed.name,
            "committedFileCount": committed.count,
            "finalFolderCount": names.count,
        ]
    }

    fileprivate func verifySimpleBodyExport(in target: URL) async throws -> [String: Any] {
        let manager = FileManager.default
        guard let document = mirroredDocument else { throw HostError.exportFailed("No mirrored Study for Body Copy export evidence") }
        try manager.createDirectory(at: target, withIntermediateDirectories: true)
        let preferences: [String: Any] = ["profile": "internal", "outputs": ["summary", "json", "csv"], "includeSources": false]
        let committed = try await exportHandoff(document, preferences, false, target)
        let root = target.appendingPathComponent(committed.name, isDirectory: true)
        let bodyDirectory = root.appendingPathComponent("Body Copy", isDirectory: true)
        let pages = (try? manager.contentsOfDirectory(at: bodyDirectory, includingPropertiesForKeys: [.fileSizeKey], options: [.skipsHiddenFiles]))?
            .filter { $0.pathExtension.lowercased() == "png" }
            .sorted { $0.lastPathComponent < $1.lastPathComponent } ?? []
        var decoded = true
        var dimensions = Set<String>()
        for page in pages {
            let data = try Data(contentsOf: page)
            guard let bitmap = NSBitmapImageRep(data: data) else { decoded = false; continue }
            dimensions.insert("\(bitmap.pixelsWide)x\(bitmap.pixelsHigh)")
        }
        let expected = (document["candidates"] as? [[String: Any]] ?? []).filter { $0["reviewState"] as? String != "reject" }.count
        let manifestData = try Data(contentsOf: root.appendingPathComponent("manifest.json"))
        let manifest = try JSONSerialization.jsonObject(with: manifestData) as? [String: Any]
        let files = manifest?["files"] as? [[String: Any]] ?? []
        let bodyManifestCount = files.filter { ($0["path"] as? String)?.hasPrefix("Body Copy/Body_") == true }.count
        return [
            "pageCount": pages.count,
            "expected": expected,
            "decoded": decoded,
            "dimensions": dimensions.sorted(),
            "manifestBodyPages": bodyManifestCount,
            "boardsAbsent": !manager.fileExists(atPath: root.appendingPathComponent("Boards").path),
            "indexAbsent": !manager.fileExists(atPath: root.appendingPathComponent("Index").path),
            "fileCount": committed.count,
        ]
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
    private func relativePath(_ url: URL, _ root: URL) throws -> String {
        let rootPath = root.resolvingSymlinksInPath().standardizedFileURL.path
        let filePath = url.resolvingSymlinksInPath().standardizedFileURL.path
        let prefix = rootPath.hasSuffix("/") ? rootPath : rootPath + "/"
        guard filePath.hasPrefix(prefix), filePath.count > prefix.count else { throw HostError.exportFailed("Handoff output escaped its staging directory") }
        return String(filePath.dropFirst(prefix.count))
    }
    private func sha256(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }

    private func emptyDocument() -> [String: Any] { let now = ISO8601DateFormatter().string(from: Date()); return ["schemaVersion": 4, "id": "study:\(UUID().uuidString.lowercased())", "title": "Untitled font study", "createdAt": now, "updatedAt": now, "sources": [], "faces": [], "candidates": [], "recipes": [["id": "recipe:blank", "pack": "blank", "name": "Custom specimen", "copy": "Type carries the argument before a word is read.", "language": "en", "direction": "auto", "casing": "exact", "sizePolicy": "fit", "size": 72, "lineHeight": 1.04, "tracking": -0.02, "alignment": "leading", "background": "split"]], "comparisonSets": [], "typographySystems": [["id": "system:primary", "name": "Primary system", "rationale": "", "fontUses": []]], "activeSystemId": "system:primary", "handoff": ["profile": "designer", "outputs": ["pdf", "summary", "json", "csv"], "includeSources": true]] }

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
    nonisolated func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) { MainActor.assumeIsolated { guard action.targetFrame?.isMainFrame != false, let url = action.request.url, allowedLocalURL(url) else { navigationRejections += 1; decisionHandler(.cancel); return }; decisionHandler(.allow) } }
    nonisolated func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? { MainActor.assumeIsolated { popupRejections += 1; return nil as WKWebView? } }
    nonisolated func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { MainActor.assumeIsolated { processTerminations += 1; webView.reload() } }

    nonisolated func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        MainActor.assumeIsolated {
            window.makeFirstResponder(webView)
            guard !evidenceStarted, let output = ProcessInfo.processInfo.environment[evidenceEnvironmentKey] else { return }
            evidenceStarted = true; let runner = MacEvidenceRunner(host: self, output: URL(fileURLWithPath: output, isDirectory: true)); evidenceRunner = runner; runner.start()
        }
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
        try await wait("brand mark") { try await self.bool("document.querySelector('.brand-mark')?.complete && document.querySelector('.brand-mark')?.naturalWidth > 0") }
        let interfaceFonts = try await host.evaluateAsync(#"(async()=>{await document.fonts.ready;const specs=['400 16px \"PD Body\"','italic 400 16px \"PD Body\"','500 48px \"PD Head\"','500 12px \"PD Eyebrow\"'];const loaded=[];for(const spec of specs){const faces=await document.fonts.load(spec,'Hamburgefontsiv');if(!faces.length||faces.some(face=>face.status!=='loaded'))throw new Error('UI font not loaded: '+spec);loaded.push({spec,faces:faces.length})}await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return {status:document.fonts.status,loaded}})()"#) as? [String: Any] ?? [:]
        guard interfaceFonts["status"] as? String == "loaded" else { throw HostError.unavailable("Interface fonts did not reach the loaded state") }
        var trace: [String: Any] = ["generatedAt": ISO8601DateFormatter().string(from: Date()), "host": "wkwebview", "initial": try await inspect(), "interfaceFonts": interfaceFonts, "nativeMenu": ["installed": NSApp.mainMenu != nil, "import": NSApp.mainMenu?.item(withTitle: "File")?.submenu?.item(withTitle: "Import Sources…") != nil, "undo": NSApp.mainMenu?.item(withTitle: "Edit")?.submenu?.item(withTitle: "Undo") != nil]]
        try await host.snapshot(to: output.appendingPathComponent("01-review.png"))
        let simpleVisual = try await simpleVisualAudit()
        trace["simpleVisual"] = simpleVisual
        try JSONSerialization.data(withJSONObject: simpleVisual, options: [.prettyPrinted, .sortedKeys]).write(to: output.appendingPathComponent("simple-visual.json"), options: [.atomic])
        let studioVisual = try await studioVisualAudit()
        trace["studioVisual"] = studioVisual
        try JSONSerialization.data(withJSONObject: studioVisual, options: [.prettyPrinted, .sortedKeys]).write(to: output.appendingPathComponent("studio-visual.json"), options: [.atomic])
        _ = try await host.evaluate("document.querySelector('#import-fonts-button')?.focus(); true")
        try performMenu("File", "Import Sources…")
        try await wait("native Import panel") { self.host.panelOpened > 0 && self.host.panelCancelled > 0 }
        try await wait("native Import focus restoration") { try await self.bool("document.activeElement?.id==='import-fonts-button'") }
        trace["nativePanelFocus"] = "import-fonts-button"
        trace["keyboardAccessibility"] = try await keyboardAccessibilityAudit()
        let reviewStateBeforeMenu = try await currentReviewState()
        host.sendMenu(["type": "mark-keep"]); try await wait("Keep") { try await self.bool("document.querySelector('.candidate-row[aria-current=\"true\"]')?.dataset.reviewState === 'keep'") }
        host.sendMenu(["type": "undo-study"]); try await wait("Undo") { try await self.currentReviewState() == reviewStateBeforeMenu }; host.sendMenu(["type": "redo-study"]); try await wait("Redo") { try await self.bool("document.querySelector('.candidate-row[aria-current=\"true\"]')?.dataset.reviewState === 'keep'") }
        trace["afterMenuUndoRedo"] = try await inspect()
        trace["bridge"] = try await host.evaluateAsync("(async()=>{const v=[];for(let i=0;i<40;i++){const s=performance.now();const r=await window.fontPreviewerHost.request({type:'probe',serial:i});if(r.serial!==i)throw new Error('probe');v.push(performance.now()-s)}return {samples:v.length,max:Math.max(...v),mean:v.reduce((a,b)=>a+b,0)/v.length}})()") ?? NSNull()
        trace["installedCatalog"] = try await host.evaluateAsync("(async()=>{const studyCount=()=>Number([...document.querySelectorAll('.catalog-switcher button')].find(item=>item.textContent?.trim().startsWith('Study'))?.querySelector('span')?.textContent??-1);const beforeStudy=studyCount();[...document.querySelectorAll('.catalog-switcher button')].find(item=>item.textContent?.trim().startsWith('Catalog'))?.click();const deadline=performance.now()+30000;while(!document.querySelector('.catalog-family-card')&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));const afterStudy=studyCount();const r=await window.fontPreviewerHost.request({type:'scan-installed',query:'',cursor:0,limit:40,refresh:false});if(r.type!=='catalog-result')throw new Error('catalog');const raw=JSON.stringify(r);const preview=r.imports.find(item=>item.binding.previewUrl)?.binding.previewUrl;let fontLoaded=false;if(preview){const face=new FontFace('Font Previewer Evidence','url(\"'+preview+'\")');await face.load();fontLoaded=face.status==='loaded'}return {count:r.imports.length,indexed:r.indexed,total:r.total,rejected:r.rejected,truncated:r.truncated,pageBounded:r.imports.length<=40,studyUnchanged:beforeStudy>=0&&beforeStudy===afterStudy,rendered:document.querySelectorAll('.catalog-family-card').length,pathLeak:/(?:file:\\/\\/|\\/home\\/|\\/Users\\/|[A-Za-z]:\\\\)/.test(raw),opaquePreviewUrls:r.imports.every(item=>!item.binding.previewUrl||item.binding.previewUrl.startsWith('pitch-font://asset/')),previewAvailable:Boolean(preview),fontLoaded}})()") ?? NSNull()
        let catalogCancellation = try await host.evaluateAsync("(async()=>{const obsolete=window.fontPreviewerHost.request({type:'scan-installed',query:'',cursor:0,limit:200,refresh:true});await new Promise(resolve=>setTimeout(resolve,0));const started=performance.now();const ack=await window.fontPreviewerHost.request({type:'cancel-catalog'});const durationMs=performance.now()-started;const result=await obsolete;return {acknowledged:ack.type==='ack'&&ack.action==='cancel-catalog',durationMs,obsoleteResultCancelled:result.type==='catalog-result'&&result.cancelled===true}})()") ?? NSNull()
        if var installedCatalog = trace["installedCatalog"] as? [String: Any] { installedCatalog["cancellation"] = catalogCancellation; trace["installedCatalog"] = installedCatalog }
        try await host.snapshot(to: output.appendingPathComponent("06-catalog.png"))
        _ = try await host.evaluate("document.querySelector('.catalog-family-card [data-family-key]')?.click(); true")
        try await wait("Studio Catalog family styles") { try await self.bool("document.querySelector('.catalog-family-detail') && document.activeElement?.textContent?.includes('All families')") }
        trace["studioCatalogDetail"] = try await host.evaluate("(()=>({styleRows:document.querySelectorAll('.catalog-style-list .catalog-source').length,backFocused:document.activeElement?.textContent?.includes('All families')===true,horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,truncated:[...document.querySelectorAll('.catalog-family-detail strong,.catalog-family-detail small')].filter(item=>getComputedStyle(item).textOverflow==='ellipsis').length}))()") ?? NSNull()
        try await host.snapshot(to: output.appendingPathComponent("16-studio-catalog-styles.png"))
        _ = try await host.evaluate("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})); true")
        try await wait("Studio Catalog family return") { try await self.bool("!document.querySelector('.catalog-family-detail') && document.activeElement?.dataset.familyKey != null") }
        _ = try await host.evaluate("[...document.querySelectorAll('.catalog-switcher button')].find(item=>item.textContent?.trim().startsWith('Study'))?.click(); true")
        try await wait("Studio Study navigator") { try await self.bool("document.querySelector('.candidate-list .candidate-row')") }
        for (stage, file) in [("Compare", "02-compare.png"), ("System", "03-system.png"), ("Handoff", "04-handoff.png")] {
            _ = try await host.evaluate("([...document.querySelectorAll('.stage-nav button')].find((item)=>item.textContent?.includes('\(stage)')))?.click();true")
            try await Task.sleep(nanoseconds: 150_000_000)
            try await host.snapshot(to: output.appendingPathComponent(file))
        }
        trace["stageNavigation"] = try await host.evaluate("(()=>{const titlebar=document.querySelector('.titlebar').getBoundingClientRect();const title=document.querySelector('.document-title input');return {titlebarVisible:titlebar.top>=-1&&titlebar.bottom>0,rootScroll:document.scrollingElement?.scrollTop??0,titleTextClipped:Boolean(title&&title.scrollWidth>title.clientWidth)}})()") ?? NSNull()
        _ = try await host.evaluate("([...document.querySelectorAll('.stage-nav button')].find((item)=>item.textContent?.includes('Review')))?.click(); true")
        try await wait("Review restoration") { try await self.bool("document.querySelector('.candidate-row') && document.querySelector('.inspector .field-label select')") }
        trace["security"] = try await host.evaluateAsync("(async()=>{const bad=[{type:'open-import',path:'/tmp/x'},{type:'probe',serial:-1},{type:'read-file',path:'/etc/passwd'},{type:'scan-installed'},{type:'scan-installed',query:'',cursor:0,limit:10000,refresh:false}];let rejected=0;for(const r of bad){try{await window.fontPreviewerHost.request(r)}catch{rejected++}}return {attempts:bad.length,rejected,nodeUnavailable:typeof window.require==='undefined'&&typeof window.process==='undefined',hostKeys:Object.keys(window.fontPreviewerHost).sort()}})()") ?? NSNull()
        trace["invalidFullPreviewSource"] = try invalidFullPreviewSourceAudit()
        trace["semantics"] = try await host.evaluate("(()=>{const controls=[...document.querySelectorAll('button,input,select,textarea')];const named=el=>el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.closest('label')?.textContent?.trim()||el.textContent?.trim();const roleLabel=[...document.querySelectorAll('.field-label')].find(label=>label.querySelector(':scope > span')?.textContent?.trim()==='Role');const roleSelect=roleLabel?.querySelector('select')?.getBoundingClientRect();const roleHelp=roleLabel?.querySelector(':scope > small')?.getBoundingClientRect();return {controls:controls.length,unnamed:controls.filter(el=>!named(el)).length,mains:document.querySelectorAll('main').length,asides:document.querySelectorAll('aside').length,duplicateIds:[...document.querySelectorAll('[id]')].map(el=>el.id).filter((id,i,a)=>a.indexOf(id)!==i).length,horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,roleHelpSeparated:Boolean(roleSelect&&roleHelp&&roleSelect.bottom<=roleHelp.top)}})()") ?? NSNull()
        trace["transactionalHandoffFault"] = try await host.verifyHandoffFaultInjection(in: output.appendingPathComponent("handoff-fault-target", isDirectory: true))
        try await wait("Recovery") { try await self.bool("document.querySelector('.app-shell')?.dataset.recoveryCheckpoint==='ready'") }
        let beforeTerminationCallback = try await inspect(); let terminationsBefore = host.processTerminations; host.webViewWebContentProcessDidTerminate(host.webView); try await wait("simulated WebKit termination callback recovery") { try await self.bool("document.querySelector('#workspace-heading') && document.activeElement?.id==='workspace-heading' && document.querySelector('.candidate-row[aria-current=\"true\"]')?.dataset.reviewState==='keep'") }; let afterTerminationCallback = try await inspect(); trace["terminationCallbackRecovery"] = ["simulatedDelegateCallback": true, "counterAdvanced": host.processTerminations == terminationsBefore + 1, "before": beforeTerminationCallback, "after": afterTerminationCallback]
        let before = try await inspect(); host.webView.reload(); try await wait("Reload") { try await self.bool("document.querySelector('#workspace-heading') && document.activeElement?.id==='workspace-heading' && document.querySelector('.candidate-row[aria-current=\"true\"]')?.dataset.reviewState==='keep'") }; let after = try await inspect(); trace["reload"] = ["before": before, "after": after]
        try await host.snapshot(to: output.appendingPathComponent("05-recovered.png"))
        trace["nativePanel"] = ["opened": host.panelOpened, "cancelled": host.panelCancelled]
        trace["hostCounters"] = ["rejectedRequests": host.rejectedRequests, "menuCommands": host.menuCommands, "navigationRejections": host.navigationRejections, "popupRejections": host.popupRejections, "processTerminations": host.processTerminations]
        try JSONSerialization.data(withJSONObject: trace, options: [.prettyPrinted, .sortedKeys]).write(to: output.appendingPathComponent("run.json"), options: [.atomic])
        let security = trace["security"] as? [String: Any]; let invalidSource = trace["invalidFullPreviewSource"] as? [String: Any]; let semantics = trace["semantics"] as? [String: Any]; let keyboard = trace["keyboardAccessibility"] as? [String: Any]; let catalog = trace["installedCatalog"] as? [String: Any]; let studioCatalogDetail = trace["studioCatalogDetail"] as? [String: Any]; let stageNavigation = trace["stageNavigation"] as? [String: Any]; let handoffFault = trace["transactionalHandoffFault"] as? [String: Any]; let termination = trace["terminationCallbackRecovery"] as? [String: Any]; let terminationAfter = termination?["after"] as? [String: Any]
        let cancellation = catalog?["cancellation"] as? [String: Any]
        let simpleCatalog = (trace["simpleVisual"] as? [String: Any])?["catalog"] as? [String: Any]
        let simpleDetail = (trace["simpleVisual"] as? [String: Any])?["detail"] as? [String: Any]
        let simpleStateTravel = (trace["simpleVisual"] as? [String: Any])?["stateTravel"] as? [String: Any]
        let simpleScale = (trace["simpleVisual"] as? [String: Any])?["scale"] as? [String: Any]
        let simpleScalePass = [80, 90, 100, 110, 120, 130, 140].allSatisfy { target in
            guard let metrics = simpleScale?[String(target)] as? [String: Any] else { return false }
            return metrics["scale"] as? Int == target
                && metrics["headerOverflow"] as? Bool == false
                && metrics["workspaceOverflow"] as? Bool == false
                && metrics["clippedTitleButtons"] as? Int == 0
                && metrics["titleTextClipped"] as? Bool == false
                && ((metrics["minTouchHeight"] as? Double) ?? 0) >= 44
                && metrics["horizontalOverflow"] as? Bool == false
        }
        let simpleBoards = (trace["simpleVisual"] as? [String: Any])?["boards"] as? [String: Any]
        let simpleLongCopy = simpleBoards?["longCopy"] as? [String: Any]
        let simpleLockedLines = simpleBoards?["lockedLines"] as? [String: Any]
        let simpleStress = simpleBoards?["stress"] as? [String: Any]
        let simpleBody = (trace["simpleVisual"] as? [String: Any])?["bodyCopy"] as? [String: Any]
        let simpleBodyExport = simpleBody?["export"] as? [String: Any]
        let simpleBodyScale = simpleBody?["scale"] as? [String: Any]
        let simpleBodyScalePass = [80, 140].allSatisfy { target in
            guard let metrics = simpleBodyScale?[String(target)] as? [String: Any] else { return false }
            return metrics["scale"] as? Int == target
                && metrics["headerOverflow"] as? Bool == false
                && metrics["workspaceOverflow"] as? Bool == false
                && metrics["pageOverflow"] as? Bool == false
                && metrics["editorOverflow"] as? Bool == false
                && ((metrics["minTouchHeight"] as? Double) ?? 0) >= 44
                && metrics["horizontalOverflow"] as? Bool == false
        }
        let simpleTuning = (trace["simpleVisual"] as? [String: Any])?["tuning"] as? [String: Any]
        let simplePreview = simpleTuning?["preview"] as? [String: Any]
        let studioEvidence = trace["studioVisual"] as? [String: Any]
        let studioScale = studioEvidence?["scale"] as? [String: Any]
        let studioScalePass = [80, 90, 100, 110, 120, 130, 140].allSatisfy { target in
            guard let metrics = studioScale?[String(target)] as? [String: Any] else { return false }
            return metrics["scale"] as? Int == target
                && metrics["headerOverflow"] as? Bool == false
                && metrics["stageOverflow"] as? Bool == false
                && metrics["workspaceOverflow"] as? Bool == false
                && metrics["clippedTitleButtons"] as? Int == 0
                && metrics["titleTextClipped"] as? Bool == false
                && ((metrics["minTouchHeight"] as? Double) ?? 0) >= 44
                && metrics["horizontalOverflow"] as? Bool == false
                && metrics["candidateTruncation"] as? Int == 0
        }
        let studioReview = studioEvidence?["review"] as? [String: Any]
        let studioCompare = studioEvidence?["compare"] as? [String: Any]
        let studioLocked = studioEvidence?["lockedLines"] as? [String: Any]
        let studioSystem = studioEvidence?["system"] as? [String: Any]
        let studioHandoff = studioEvidence?["handoff"] as? [String: Any]
        let checks: [(String, Bool)] = [
            ("security", security?["attempts"] as? Int == security?["rejected"] as? Int
                && security?["nodeUnavailable"] as? Bool == true
                && invalidSource?["rejected"] as? Bool == true),
            ("semantics", semantics?["unnamed"] as? Int == 0
                && semantics?["duplicateIds"] as? Int == 0
                && semantics?["horizontalOverflow"] as? Bool == false
                && semantics?["roleHelpSeparated"] as? Bool == true),
            ("keyboard", keyboard?["forwardWrap"] as? Bool == true
                && keyboard?["backwardWrap"] as? Bool == true
                && keyboard?["nativeTextUndo"] as? Bool == true
                && keyboard?["candidateUnchanged"] as? Bool == true
                && keyboard?["trayUnchanged"] as? Bool == true
                && keyboard?["returnFocus"] as? Bool == true),
            ("simple boards", simpleLongCopy?["quadrants"] as? Int == 4
                && simpleLongCopy?["fullText"] as? Bool == true
                && simpleLongCopy?["withinFrames"] as? Bool == true
                && simpleLongCopy?["noEllipsis"] as? Bool == true
                && simpleLongCopy?["paletteCount"] as? Int == 4
                && simpleLockedLines?["count"] as? Int == 4
                && simpleLockedLines?["fullText"] as? Bool == true
                && simpleLockedLines?["whiteSpace"] as? Bool == true
                && simpleLockedLines?["sharedSize"] as? Bool == true
                && simpleStress?["rupee"] as? Bool == true
                && simpleStress?["copyright"] as? Bool == true
                && simpleStress?["trademark"] as? Bool == true
                && simpleStress?["numerals"] as? Bool == true),
            ("simple body copy", simpleBody?["pageCount"] as? Int == simpleBody?["includedCount"] as? Int
                && ((simpleBody?["pageCount"] as? Int) ?? 0) > 0
                && simpleBody?["sampleCount"] as? Int == 3
                && simpleBody?["fullText"] as? Bool == true
                && simpleBody?["twoParagraphs"] as? Bool == true
                && simpleBody?["sharedSize"] as? Bool == true
                && simpleBody?["withinFrames"] as? Bool == true
                && simpleBody?["noEllipsis"] as? Bool == true
                && simpleBody?["metadataTruncation"] as? Int == 0
                && ((simpleBody?["minTouchHeight"] as? Double) ?? 0) >= 44
                && simpleBody?["horizontalOverflow"] as? Bool == false
                && simpleBody?["studioShared"] as? Bool == true
                && simpleBodyScalePass
                && simpleBodyExport?["pageCount"] as? Int == simpleBodyExport?["expected"] as? Int
                && simpleBodyExport?["pageCount"] as? Int == simpleBodyExport?["manifestBodyPages"] as? Int
                && simpleBodyExport?["decoded"] as? Bool == true
                && simpleBodyExport?["dimensions"] as? [String] == ["5152x2160"]
                && simpleBodyExport?["boardsAbsent"] as? Bool == true
                && simpleBodyExport?["indexAbsent"] as? Bool == true),
            ("simple tuning", simpleTuning?["cards"] as? Int == 24
                && simpleTuning?["casingLabels"] as? String == "As is|UPPER|lower|Title|AP Title"
                && simpleTuning?["apTitle"] as? Bool == true
                && ((simpleTuning?["axisSliders"] as? Int) ?? 0) > 0
                && ((simpleTuning?["minButtonHeight"] as? Double) ?? 0) >= 44
                && simpleTuning?["cardOverflow"] as? Int == 0
                && simplePreview?["initialFocus"] as? Bool == true
                && simplePreview?["forwardWrap"] as? Bool == true
                && simplePreview?["backwardWrap"] as? Bool == true
                && simplePreview?["escapeClosed"] as? Bool == true
                && simplePreview?["returnFocus"] as? Bool == true),
            ("simple catalog", ((simpleCatalog?["count"] as? Int) ?? 0) > 0
                && simpleCatalog?["overlaps"] as? Int == 0
                && simpleCatalog?["initialFocus"] as? Bool == true
                && simpleCatalog?["forwardWrap"] as? Bool == true
                && simpleCatalog?["backwardWrap"] as? Bool == true
                && simpleCatalog?["horizontalOverflow"] as? Bool == false),
            ("simple catalog detail", simpleDetail?["rendered"] as? Bool == true
                && ((simpleDetail?["styleRows"] as? Int) ?? 0) > 0
                && simpleDetail?["backFocused"] as? Bool == true
                && simpleDetail?["returnFocus"] as? Bool == true
                && simpleDetail?["horizontalOverflow"] as? Bool == false),
            ("simple to Studio state", ((simpleStateTravel?["added"] as? Int) ?? 0) > 0
                && simpleStateTravel?["simpleAfter"] as? Int == simpleStateTravel?["studioAfter"] as? Int
                && simpleStateTravel?["fitPolicy"] as? String == "locked-lines"
                && simpleStateTravel?["restored"] as? Bool == true),
            ("simple scaling", simpleScalePass),
            ("Studio scaling", studioScalePass),
            ("Studio review", studioReview?["navigatorTabs"] as? Int == 4
                && studioReview?["candidateTruncation"] as? Int == 0
                && studioReview?["reviewLabels"] as? String == "Unreviewed|Keep|Maybe|Reject"
                && studioReview?["trayPresent"] as? Bool == true
                && studioReview?["asideCount"] as? Int == 2),
            ("Studio compare", ((studioCompare?["count"] as? Int) ?? 0) >= 2
                && studioCompare?["fullText"] as? Bool == true
                && studioCompare?["withinFrames"] as? Bool == true
                && studioCompare?["noEllipsis"] as? Bool == true
                && studioCompare?["overflow"] as? Int == 0),
            ("Studio locked lines", ((studioLocked?["count"] as? Int) ?? 0) >= 2
                && studioLocked?["fullText"] as? Bool == true
                && studioLocked?["whiteSpace"] as? Bool == true
                && studioLocked?["sharedSize"] as? Bool == true),
            ("Studio system", studioSystem?["trayAbsent"] as? Bool == true
                && studioSystem?["asideCount"] as? Int == 2
                && studioSystem?["displayComplete"] as? Bool == true
                && studioSystem?["displayOverflow"] as? Bool == false),
            ("Studio handoff", studioHandoff?["asideCount"] as? Int == 0
                && studioHandoff?["trayAbsent"] as? Bool == true
                && studioHandoff?["panels"] as? Int == 4
                && studioHandoff?["workspaceFullWidth"] as? Bool == true
                && studioHandoff?["titlebarVisible"] as? Bool == true
                && studioHandoff?["rootScroll"] as? Int == 0
                && studioHandoff?["horizontalOverflow"] as? Bool == false),
            ("stage navigation viewport", stageNavigation?["titlebarVisible"] as? Bool == true
                && stageNavigation?["rootScroll"] as? Int == 0
                && stageNavigation?["titleTextClipped"] as? Bool == false),
            ("installed catalog", ((catalog?["count"] as? Int) ?? 0) > 0
                && ((catalog?["indexed"] as? Int) ?? 0) > 0
                && ((catalog?["rendered"] as? Int) ?? 0) > 0
                && catalog?["pageBounded"] as? Bool == true
                && catalog?["studyUnchanged"] as? Bool == true
                && catalog?["pathLeak"] as? Bool == false
                && catalog?["opaquePreviewUrls"] as? Bool == true
                && catalog?["previewAvailable"] as? Bool == true
                && catalog?["fontLoaded"] as? Bool == true),
            ("Studio catalog detail", ((studioCatalogDetail?["styleRows"] as? Int) ?? 0) > 0
                && studioCatalogDetail?["backFocused"] as? Bool == true
                && studioCatalogDetail?["horizontalOverflow"] as? Bool == false
                && studioCatalogDetail?["truncated"] as? Int == 0),
            ("catalog cancellation", cancellation?["acknowledged"] as? Bool == true
                && cancellation?["obsoleteResultCancelled"] as? Bool == true
                && ((cancellation?["durationMs"] as? Double) ?? .infinity) <= 100),
            ("transactional handoff", handoffFault?["failureObserved"] as? Bool == true
                && handoffFault?["priorExportByteIdentical"] as? Bool == true
                && handoffFault?["stagingClean"] as? Bool == true
                && handoffFault?["finalFolderCount"] as? Int == 1),
            ("termination recovery", termination?["simulatedDelegateCallback"] as? Bool == true
                && termination?["counterAdvanced"] as? Bool == true
                && terminationAfter?["reviewState"] as? String == "Keep"),
            ("native import panel", host.panelOpened > 0 && host.panelCancelled > 0),
        ]
        let failures = checks.filter { !$0.1 }.map { $0.0 }
        guard failures.isEmpty else {
            throw HostError.unavailable("Evidence assertions failed: \(failures.joined(separator: ", "))")
        }
    }
    private func invalidFullPreviewSourceAudit() throws -> [String: Any] {
        var rejected = 0
        for fileExtension in ["otf", "ttf", "woff", "woff2"] {
            let url = output.appendingPathComponent("invalid-full-preview.\(fileExtension)")
            try Data("not a font".utf8).write(to: url, options: [.atomic])
            defer { try? FileManager.default.removeItem(at: url) }
            do { _ = try host.importedSource(url, catalogOnly: true) }
            catch { rejected += 1 }
        }
        return ["attempts": 4, "rejections": rejected, "rejected": rejected == 4]
    }
    private func performMenu(_ menuTitle: String, _ itemTitle: String) throws {
        guard let menu = NSApp.mainMenu?.item(withTitle: menuTitle)?.submenu, let item = menu.item(withTitle: itemTitle) else { throw HostError.unavailable("Missing native menu item \(menuTitle) → \(itemTitle)") }
        let index = menu.index(of: item); guard index >= 0 else { throw HostError.unavailable("Detached native menu item \(itemTitle)") }
        menu.performActionForItem(at: index)
    }
    private func studioVisualAudit() async throws -> [String: Any] {
        _ = try await host.evaluate("[...document.querySelectorAll('.interface-switch button')].find(item=>item.textContent?.trim()==='Studio')?.click(); [...document.querySelectorAll('.stage-nav button')].find(item=>item.textContent?.includes('Review'))?.click(); [...document.querySelectorAll('.catalog-switcher button')].find(item=>item.textContent?.trim().startsWith('Study'))?.click(); true")
        try await wait("Studio Review") { try await self.bool("document.querySelector('.mode-studio .review-workspace') && document.querySelector('.candidate-row')") }
        var scale: [String: Any] = [:]
        for target in [80, 90, 100, 110, 120, 130, 140] {
            try await setInterfaceScale(target)
            scale[String(target)] = try await studioScaleMetrics()
            if target == 80 { try await host.snapshot(to: output.appendingPathComponent("18-studio-scale-80.png")) }
            if target == 140 { try await host.snapshot(to: output.appendingPathComponent("17-studio-scale-140.png")) }
        }
        try await setInterfaceScale(100)
        let review = try await host.evaluate("(()=>{const actions=document.querySelector('.specimen-card .card-actions');return {navigatorTabs:document.querySelectorAll('.catalog-switcher button').length,candidateTruncation:[...document.querySelectorAll('.candidate-name strong,.candidate-name small')].filter(item=>getComputedStyle(item).textOverflow==='ellipsis').length,reviewLabels:[...actions.querySelectorAll('button small')].map(item=>item.textContent?.trim()).join('|'),trayPresent:Boolean(document.querySelector('.tray')),asideCount:document.querySelectorAll('aside').length}})()") as? [String: Any] ?? [:]

        try await setCopyThroughSimple("THE UNREASONABLY LONG TITLE THAT MUST NEVER BE CUT OFF OR TURN INTO DOTS")
        _ = try await host.evaluate("[...document.querySelectorAll('.stage-nav button')].find(item=>item.textContent?.includes('Compare'))?.click(); true")
        try await wait("Studio Compare") { try await self.bool("document.querySelectorAll('.compare-card').length >= 2") }
        _ = try await host.evaluate("document.querySelector('input[name=\"fit-policy\"][value=\"fit\"]')?.click(); true")
        try await wait("Studio Compare fitting") { try await self.bool("document.querySelectorAll('.simple-fitted-compare[data-natural-fit]').length === document.querySelectorAll('.compare-card').length") }
        let compare = try await host.evaluate(#"(()=>{const expected='THE UNREASONABLY LONG TITLE THAT MUST NEVER BE CUT OFF OR TURN INTO DOTS';const cards=[...document.querySelectorAll('.compare-card')];const copies=cards.map(card=>card.querySelector('.compare-copy'));return {count:cards.length,fullText:copies.every(copy=>copy?.textContent===expected),withinFrames:copies.every((copy,index)=>{const text=copy.getBoundingClientRect(),card=cards[index].getBoundingClientRect();return text.left>=card.left-1&&text.right<=card.right+1&&text.top>=card.top-1&&text.bottom<=card.bottom+1}),noEllipsis:copies.every(copy=>getComputedStyle(copy).textOverflow!=='ellipsis'),overflow:cards.filter(card=>card.scrollWidth>card.clientWidth||card.scrollHeight>card.clientHeight).length}})()"#) as? [String: Any] ?? [:]
        try await host.snapshot(to: output.appendingPathComponent("19-studio-compare-long-copy.png"))

        try await setCopyThroughSimple("A House\nWith No Doors")
        _ = try await host.evaluate("[...document.querySelectorAll('.stage-nav button')].find(item=>item.textContent?.includes('Compare'))?.click(); document.querySelector('input[name=\"fit-policy\"][value=\"locked-lines\"]')?.click(); true")
        try await wait("Studio locked lines") { try await self.bool("document.querySelectorAll('.simple-fitted-compare[data-natural-fit]').length === document.querySelectorAll('.compare-card').length && [...document.querySelectorAll('.simple-fitted-compare')].every(item=>getComputedStyle(item).whiteSpace==='pre')") }
        let lockedLines = try await host.evaluate(#"(()=>{const expected='A House\nWith No Doors';const copies=[...document.querySelectorAll('.simple-fitted-compare')];const sizes=copies.map(item=>Number.parseFloat(getComputedStyle(item).fontSize));return {count:copies.length,fullText:copies.every(copy=>copy.textContent===expected),whiteSpace:copies.every(copy=>getComputedStyle(copy).whiteSpace==='pre'),sharedSize:new Set(sizes.map(value=>value.toFixed(3))).size===1}})()"#) as? [String: Any] ?? [:]
        try await host.snapshot(to: output.appendingPathComponent("20-studio-compare-locked-lines.png"))

        try await setCopyThroughSimple("A House With No Doors")
        _ = try await host.evaluate("[...document.querySelectorAll('.stage-nav button')].find(item=>item.textContent?.includes('System'))?.click(); true")
        try await wait("Studio System") { try await self.bool("document.querySelector('.deck-scene .role-display') && !document.querySelector('.tray')") }
        let system = try await host.evaluate("(()=>{const display=document.querySelector('.deck-scene .role-display');return {trayAbsent:!document.querySelector('.tray'),asideCount:document.querySelectorAll('aside').length,displayComplete:display?.textContent?.replace(/\\s+/g,' ').trim()==='Display unassigned',displayOverflow:Boolean(display&&(display.scrollWidth>display.clientWidth||display.scrollHeight>display.clientHeight))}})()") as? [String: Any] ?? [:]
        _ = try await host.evaluate("[...document.querySelectorAll('.stage-nav button')].find(item=>item.textContent?.includes('Handoff'))?.click(); true")
        try await wait("Studio Handoff") { try await self.bool("document.querySelector('.handoff-workspace') && document.querySelectorAll('aside').length===0 && !document.querySelector('.tray')") }
        let handoff = try await host.evaluate("(()=>{const shell=document.querySelector('.app-shell').getBoundingClientRect();const workspace=document.querySelector('.handoff-workspace').getBoundingClientRect();const titlebar=document.querySelector('.titlebar').getBoundingClientRect();return {asideCount:document.querySelectorAll('aside').length,trayAbsent:!document.querySelector('.tray'),panels:document.querySelectorAll('.handoff-panel').length,workspaceFullWidth:Math.abs(workspace.left-shell.left)<=1&&Math.abs(workspace.right-shell.right)<=1,titlebarVisible:titlebar.top>=-1&&titlebar.bottom>0,rootScroll:document.scrollingElement?.scrollTop??0,horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}})()") as? [String: Any] ?? [:]
        _ = try await host.evaluate("[...document.querySelectorAll('.stage-nav button')].find(item=>item.textContent?.includes('Review'))?.click(); true")
        try await wait("Studio Review restoration") { try await self.bool("document.querySelector('.review-workspace') && document.querySelector('.tray')") }
        return ["compare": compare, "handoff": handoff, "lockedLines": lockedLines, "review": review, "scale": scale, "system": system]
    }
    private func setCopyThroughSimple(_ value: String) async throws {
        _ = try await host.evaluate("[...document.querySelectorAll('.interface-switch button')].find(item=>item.textContent?.trim()==='Simple')?.click(); true")
        try await wait("Simple copy field") { try await self.bool("document.querySelector('.simple-copy-field textarea')") }
        let literal = String(data: try JSONEncoder().encode(value), encoding: .utf8) ?? "\"\""
        _ = try await host.evaluate("(()=>{const field=document.querySelector('.simple-copy-field textarea');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(field,\(literal));field.dispatchEvent(new Event('input',{bubbles:true}));return true})()")
        _ = try await host.evaluate("[...document.querySelectorAll('.interface-switch button')].find(item=>item.textContent?.trim()==='Studio')?.click(); true")
        try await wait("Studio after shared copy") { try await self.bool("document.querySelector('.stage-nav')") }
    }
    private func studioScaleMetrics() async throws -> [String: Any] {
        let metrics = try await host.evaluate(#"""
        (() => {
          const shell = document.querySelector('.app-shell');
          const title = document.querySelector('.titlebar');
          const stages = document.querySelector('.stage-nav');
          const workspace = document.querySelector('.workspace');
          const shellRect = shell.getBoundingClientRect();
          const controls = [...document.querySelectorAll('.titlebar button,.titlebar input,.stage-nav button,.catalog-switcher button,.catalog-tools input,.catalog-tools select,.candidate-row,.segmented-control button')]
            .filter((item) => {
              const rect = item.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            });
          const measuredControls = controls
            .map((item) => ({ item, height: item.getBoundingClientRect().height }))
            .sort((left, right) => left.height - right.height);
          const minimum = measuredControls[0];
          const minimumStyle = minimum ? getComputedStyle(minimum.item) : null;
          const titleButtons = [...title.querySelectorAll('button')].filter((item) => {
            const rect = item.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          return {
            scale: Number(shell.dataset.uiScale),
            headerOverflow: title.scrollWidth > title.clientWidth,
            stageOverflow: stages.scrollWidth > stages.clientWidth,
            workspaceOverflow: workspace.scrollWidth > workspace.clientWidth,
            clippedTitleButtons: titleButtons.filter((item) => {
              const rect = item.getBoundingClientRect();
              return rect.left < shellRect.left - 1 || rect.right > shellRect.right + 1;
            }).length,
            titleTextClipped: (() => {
              const input = title.querySelector('.document-title input');
              return Boolean(input && input.scrollWidth > input.clientWidth);
            })(),
            minTouchHeight: minimum?.height ?? 0,
            minTouchElement: minimum ? {
              tag: minimum.item.tagName,
              className: minimum.item.className,
              ariaLabel: minimum.item.getAttribute('aria-label') ?? '',
              text: minimum.item.textContent?.trim().slice(0, 80) ?? '',
              cssHeight: minimumStyle?.height ?? '',
              cssMinHeight: minimumStyle?.minHeight ?? '',
            } : null,
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            candidateTruncation: [...document.querySelectorAll('.candidate-name strong,.candidate-name small')]
              .filter((item) => getComputedStyle(item).textOverflow === 'ellipsis').length,
          };
        })()
        """#)
        return metrics as? [String: Any] ?? [:]
    }
    private func simpleVisualAudit() async throws -> [String: Any] {
        _ = try await host.evaluate("[...document.querySelectorAll('.interface-switch button')].find(item=>item.textContent?.trim()==='Simple')?.click(); true")
        try await wait("Simple mode") { try await self.bool("document.querySelector('.simple-workspace') && document.querySelector('.simple-hero-actions')") }
        try await host.snapshot(to: output.appendingPathComponent("07-simple.png"))
        let boards = try await simpleBoardAudit()
        let tuning = try await simpleTuningAudit()
        let bodyCopy = try await simpleBodyAudit()
        var scale: [String: Any] = [:]
        for target in [80, 90, 100, 110, 120, 130, 140] {
            try await setInterfaceScale(target)
            scale[String(target)] = try await simpleScaleMetrics()
            if target == 80 { try await host.snapshot(to: output.appendingPathComponent("11-simple-scale-80.png")) }
            if target == 140 { try await host.snapshot(to: output.appendingPathComponent("10-simple-scale-140.png")) }
        }
        try await setInterfaceScale(100)
        _ = try await host.evaluate("[...document.querySelectorAll('.simple-hero-actions button')].find(item=>item.textContent?.includes('Installed Fonts'))?.click(); true")
        try await wait("Simple installed Catalog") { try await self.bool("document.querySelectorAll('.simple-catalog-family').length > 0") }
        let catalog = try await host.evaluate("(()=>{const dialog=document.querySelector('.simple-catalog-dialog');const dialogRect=dialog?.getBoundingClientRect();const cards=[...document.querySelectorAll('.simple-catalog-family')].map((element)=>{const rect=element.getBoundingClientRect();return {left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height}});let overlaps=0;for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){const a=cards[i],b=cards[j];if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps++}const controls=[...dialog.querySelectorAll(\"button:not(:disabled),input:not(:disabled),[href],[tabindex]:not([tabindex='-1'])\")];const first=controls[0],last=controls.at(-1);const initialFocus=document.activeElement?.matches('.simple-catalog-search input')===true;last.focus();last.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));const forwardWrap=document.activeElement===first;first.focus();first.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));const backwardWrap=document.activeElement===last;document.querySelector('.simple-catalog-search input')?.focus();return {count:cards.length,overlaps,initialFocus,forwardWrap,backwardWrap,dialog:dialogRect?{left:dialogRect.left,top:dialogRect.top,right:dialogRect.right,bottom:dialogRect.bottom,width:dialogRect.width,height:dialogRect.height}:null,viewport:{width:innerWidth,height:innerHeight},horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,cards:cards.slice(0,12)}})()") as? [String: Any] ?? [:]
        try await host.snapshot(to: output.appendingPathComponent("08-simple-catalog.png"))
        _ = try await host.evaluate("document.querySelector('.simple-catalog-family button')?.click(); true")
        try await wait("Simple family styles") { try await self.bool("document.querySelector('.simple-catalog-family-detail') && document.activeElement?.textContent?.includes('All families')") }
        var detail = try await host.evaluate("(()=>{const panel=document.querySelector('.simple-catalog-family-detail')?.getBoundingClientRect();return {rendered:Boolean(panel),width:panel?.width??0,height:panel?.height??0,styleRows:document.querySelectorAll('.simple-catalog-style-grid > section').length,backFocused:document.activeElement?.textContent?.includes('All families')===true,horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}})()") as? [String: Any] ?? [:]
        try await host.snapshot(to: output.appendingPathComponent("09-simple-styles.png"))
        _ = try await host.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));true")
        try await wait("Simple family return") { try await self.bool("!document.querySelector('.simple-catalog-family-detail') && document.querySelectorAll('.simple-catalog-family').length > 0") }
        detail["returnFocus"] = try await bool("document.activeElement?.dataset.familyKey != null")
        let stateTravel = try await host.evaluateAsync(#"""
        (async () => {
          const count = () => Number(document.querySelector('.simple-font-summary > span:first-child')?.textContent ?? -1);
          const before = count();
          document.querySelector('.simple-catalog-family header > div button:last-child:not(:disabled)')?.click();
          const deadline = performance.now() + 10000;
          while (count() <= before && performance.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, 25));
          }
          const simpleAfter = count();
          document.querySelector('.simple-catalog-dialog > header button')?.click();
          document.querySelector('input[name="simple-fit-policy"][value="locked-lines"]')?.click();
          [...document.querySelectorAll('.interface-switch button')]
            .find(item => item.textContent?.trim() === 'Studio')?.click();
          while (!document.querySelector('.stage-nav') && performance.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, 25));
          }
          [...document.querySelectorAll('.stage-nav button')]
            .find(item => item.textContent?.includes('Compare'))?.click();
          const studioCount = () => Number(
            [...document.querySelectorAll('.catalog-switcher button')]
              .find(item => item.textContent?.trim().startsWith('Study'))
              ?.querySelector('span')?.textContent ?? -1
          );
          while (
            (studioCount() !== simpleAfter
              || !document.querySelector('input[name="fit-policy"][value="locked-lines"]:checked'))
            && performance.now() < deadline
          ) {
            await new Promise(resolve => setTimeout(resolve, 25));
          }
          return {
            before,
            simpleAfter,
            studioAfter: studioCount(),
            added: simpleAfter - before,
            fitPolicy: document.querySelector('input[name="fit-policy"]:checked')?.value ?? null,
          };
        })()
        """#) as? [String: Any] ?? [:]
        try await wait("Studio restore") { try await self.bool("document.querySelector('.stage-nav') && document.querySelector('.candidate-row')") }
        host.sendMenu(["type": "undo-study"])
        let originalCount = stateTravel["before"] as? Int ?? -1
        try await wait("Simple-to-Studio state cleanup") { try await self.bool("Number([...document.querySelectorAll('.catalog-switcher button')].find(item=>item.textContent?.trim().startsWith('Study'))?.querySelector('span')?.textContent??-1)===\(originalCount)") }
        var verifiedStateTravel = stateTravel
        verifiedStateTravel["restored"] = true
        return ["boards": boards, "bodyCopy": bodyCopy, "catalog": catalog, "detail": detail, "stateTravel": verifiedStateTravel, "scale": scale, "tuning": tuning]
    }
    private func simpleBoardAudit() async throws -> [String: Any] {
        _ = try await host.evaluateAsync(#"(async()=>{const field=document.querySelector('.simple-copy-field textarea');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(field,'THE UNREASONABLY LONG TITLE THAT MUST NEVER BE CUT OFF OR TURN INTO DOTS');field.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('input[name="simple-fit-policy"][value="fit"]')?.click();const deadline=performance.now()+10000;while(!([...document.querySelectorAll('.simple-quadrant-copy')].length===4&&[...document.querySelectorAll('.simple-quadrant-copy')].every(item=>item.dataset.naturalFit))&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,16));document.querySelector('.simple-pages-section')?.scrollIntoView({block:'start'});await new Promise(resolve=>setTimeout(resolve,32));return true})()"#)
        try await host.snapshot(to: output.appendingPathComponent("12-simple-long-copy.png"))
        let longCopy = try await host.evaluate(#"(()=>{const expected='THE UNREASONABLY LONG TITLE THAT MUST NEVER BE CUT OFF OR TURN INTO DOTS';const board=document.querySelector('.simple-board');const quadrants=[...board.querySelectorAll('.simple-quadrant')];const copies=quadrants.map(item=>item.querySelector('.simple-quadrant-copy'));return {quadrants:quadrants.length,fullText:copies.every(item=>item?.textContent===expected),withinFrames:copies.every((item,index)=>{const copy=item.getBoundingClientRect(),frame=quadrants[index].getBoundingClientRect();return copy.left>=frame.left-1&&copy.right<=frame.right+1&&copy.top>=frame.top-1&&copy.bottom<=frame.bottom+1}),noEllipsis:copies.every(item=>getComputedStyle(item).textOverflow!=='ellipsis'),paletteCount:new Set(quadrants.map(item=>getComputedStyle(item).backgroundColor)).size}})()"#) as? [String: Any] ?? [:]
        _ = try await host.evaluateAsync(#"(async()=>{const field=document.querySelector('.simple-copy-field textarea');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(field,'A House\nWith No Doors');field.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('input[name="simple-fit-policy"][value="locked-lines"]')?.click();const deadline=performance.now()+10000;while(!(()=>{const copies=[...document.querySelectorAll('.simple-quadrant-copy')];const sizes=copies.map(item=>getComputedStyle(item).fontSize);return copies.length===4&&copies.every(item=>item.dataset.naturalFit&&getComputedStyle(item).whiteSpace==='pre')&&new Set(sizes).size===1})()&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,16));return true})()"#)
        let lockedLines = try await host.evaluate(#"(()=>{const board=document.querySelector('.simple-board');const copies=[...board.querySelectorAll('.simple-quadrant-copy')];const sizes=copies.map(item=>Number.parseFloat(getComputedStyle(item).fontSize));return {count:copies.length,fullText:copies.every(item=>item.textContent==='A House\nWith No Doors'),whiteSpace:copies.every(item=>getComputedStyle(item).whiteSpace==='pre'),sharedSize:new Set(sizes.map(value=>value.toFixed(3))).size===1}})()"#) as? [String: Any] ?? [:]
        try await host.snapshot(to: output.appendingPathComponent("13-simple-locked-lines.png"))
        let stress = try await host.evaluateAsync(#"(async()=>{const checkbox=[...document.querySelectorAll('.simple-options input[type="checkbox"]')].find(item=>item.closest('label')?.textContent?.includes('Stress test'));checkbox?.click();const deadline=performance.now()+10000;while(!document.querySelector('.simple-quadrant-copy')?.textContent?.includes('₹')&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,16));const text=document.querySelector('.simple-quadrant-copy')?.textContent??'';return {rupee:text.includes('₹'),copyright:text.includes('©'),trademark:text.includes('™'),numerals:text.includes('0123456789')}})()"#) as? [String: Any] ?? [:]
        _ = try await host.evaluateAsync(#"(async()=>{const field=document.querySelector('.simple-copy-field textarea');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(field,'A House With No Doors');field.dispatchEvent(new Event('input',{bubbles:true}));const checkbox=[...document.querySelectorAll('.simple-options input[type="checkbox"]')].find(item=>item.closest('label')?.textContent?.includes('Stress test'));if(checkbox?.checked)checkbox.click();document.querySelector('input[name="simple-fit-policy"][value="fit"]')?.click();document.querySelector('.simple-hero')?.scrollIntoView({block:'start'});await new Promise(resolve=>setTimeout(resolve,32));return true})()"#)
        return ["lockedLines": lockedLines, "longCopy": longCopy, "stress": stress]
    }
    private func simpleBodyAudit() async throws -> [String: Any] {
        _ = try await host.evaluateAsync(#"""
        (async () => {
          [...document.querySelectorAll('.simple-page-mode-choices button')]
            .find(item => item.textContent?.includes('Body Copy'))?.click();
          const deadline = performance.now() + 10000;
          while (!document.querySelector('.simple-body-page-list') && performance.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, 25));
          }
          const second = [...document.querySelectorAll('.simple-body-samples button')][1];
          second?.click();
          while (
            (!document.querySelector('.simple-body-reading-copy')?.textContent?.startsWith('The workshop is quiet')
              || [...document.querySelectorAll('.simple-body-reading-copy')].some(item => !item.dataset.naturalFit))
            && performance.now() < deadline
          ) {
            await new Promise(resolve => setTimeout(resolve, 25));
          }
          document.querySelector('.simple-body-compose')?.scrollIntoView({block: 'start'});
          await new Promise(resolve => setTimeout(resolve, 64));
          return true;
        })()
        """#)
        try await host.snapshot(to: output.appendingPathComponent("17-simple-body-compose.png"))
        var metrics = try await host.evaluate(#"""
        (() => {
          const pages = [...document.querySelectorAll('.simple-body-page-wrap')];
          const copies = pages.map(page => page.querySelector('.simple-body-reading-copy'));
          const frames = pages.map(page => page.querySelector('.simple-body-reading'));
          const expected = document.querySelector('#simple-body-copy')?.value ?? '';
          const sizes = copies.map(item => Number.parseFloat(getComputedStyle(item).fontSize));
          const touch = [...document.querySelectorAll('.simple-page-mode-choices button,.simple-body-samples button')]
            .map(item => item.getBoundingClientRect().height)
            .filter(value => value > 0);
          return {
            pageCount: pages.length,
            includedCount: Number(document.querySelector('.simple-body-page-topline span')?.textContent?.match(/\/\s*(\d+)/)?.[1] ?? -1),
            sampleCount: document.querySelectorAll('.simple-body-samples button').length,
            fullText: copies.every(item => item?.textContent === expected),
            twoParagraphs: expected.includes('\n\n') && copies.every(item => item?.textContent?.includes('\n\n')),
            sharedSize: sizes.length === pages.length && new Set(sizes.map(value => value.toFixed(3))).size === 1,
            withinFrames: copies.every((item, index) => {
              const copy = item?.getBoundingClientRect();
              const frame = frames[index]?.getBoundingClientRect();
              return Boolean(copy && frame && copy.left >= frame.left - 1 && copy.right <= frame.right + 1 && copy.top >= frame.top - 1 && copy.bottom <= frame.bottom + 1);
            }),
            noEllipsis: copies.every(item => getComputedStyle(item).textOverflow !== 'ellipsis'),
            metadataTruncation: [...document.querySelectorAll('.simple-body-page-meta h3,.simple-body-page-meta p,.simple-body-page-wrap > header span')]
              .filter(item => getComputedStyle(item).textOverflow === 'ellipsis').length,
            minTouchHeight: Math.min(...touch),
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        })()
        """#) as? [String: Any] ?? [:]
        _ = try await host.evaluateAsync(#"(async()=>{document.querySelector('.simple-body-page-wrap')?.scrollIntoView({block:'start'});await new Promise(resolve=>setTimeout(resolve,64));return true})()"#)
        try await host.snapshot(to: output.appendingPathComponent("18-simple-body-page.png"))
        metrics["export"] = try await host.verifySimpleBodyExport(in: output.appendingPathComponent("body-handoff-target", isDirectory: true))
        var scale: [String: Any] = [:]
        for target in [80, 140] {
            try await setInterfaceScale(target)
            try await waitForSimpleBodyFit("Body Copy fit at \(target)%")
            scale[String(target)] = try await simpleBodyScaleMetrics()
        }
        try await setInterfaceScale(100)
        metrics["scale"] = scale
        _ = try await host.evaluate("[...document.querySelectorAll('.interface-switch button')].find(item=>item.textContent?.trim()==='Studio')?.click(); true")
        try await wait("Body Copy Studio sharing") { try await self.bool("document.querySelector('.stage-nav') && document.querySelector('.specimen-select p')?.textContent?.startsWith('The workshop is quiet in the useful way')") }
        metrics["studioShared"] = true
        _ = try await host.evaluate("[...document.querySelectorAll('.interface-switch button')].find(item=>item.textContent?.trim()==='Simple')?.click(); true")
        try await wait("Body Copy Simple restore") { try await self.bool("document.querySelector('.simple-body-page-list')") }
        _ = try await host.evaluateAsync(#"(async()=>{[...document.querySelectorAll('.simple-page-mode-choices button')].find(item=>item.textContent?.includes('Boards'))?.click();const deadline=performance.now()+10000;while(!document.querySelector('.simple-copy-field textarea')&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,25));const field=document.querySelector('.simple-copy-field textarea');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(field,'A House With No Doors');field.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.simple-hero')?.scrollIntoView({block:'start'});await new Promise(resolve=>setTimeout(resolve,64));return true})()"#)
        return metrics
    }
    private func waitForSimpleBodyFit(_ label: String) async throws {
        try await wait(label) {
            try await self.bool(#"""
            (() => {
              const copies = [...document.querySelectorAll('.simple-fitted-body')];
              return copies.length > 0 && copies.every(item => {
                const frame = item.parentElement;
                return item.dataset.naturalFit
                  && frame
                  && item.dataset.fitFrame === `${frame.clientWidth}x${frame.clientHeight}`;
              });
            })()
            """#)
        }
    }
    private func simpleBodyScaleMetrics() async throws -> [String: Any] {
        try await host.evaluate(#"""
        (() => {
          const shell = document.querySelector('.app-shell');
          const title = document.querySelector('.titlebar');
          const workspace = document.querySelector('.simple-workspace');
          const editor = document.querySelector('.simple-body-editor textarea');
          const pages = [...document.querySelectorAll('.simple-body-reading')];
          const controls = [...document.querySelectorAll('.simple-page-mode-choices button,.simple-body-samples button,.simple-hero-actions button,.ui-scale-control button')]
            .filter(item => { const rect = item.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; });
          return {
            scale: Number(shell?.dataset.uiScale),
            headerOverflow: title.scrollWidth > title.clientWidth,
            workspaceOverflow: workspace.scrollWidth > workspace.clientWidth,
            pageOverflow: pages.some(item => item.scrollWidth > item.clientWidth || item.scrollHeight > item.clientHeight),
            editorOverflow: editor.scrollHeight > editor.clientHeight + 1,
            minTouchHeight: Math.min(...controls.map(item => item.getBoundingClientRect().height)),
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        })()
        """#) as? [String: Any] ?? [:]
    }
    private func simpleTuningAudit() async throws -> [String: Any] {
        _ = try await host.evaluateAsync(#"(async()=>{document.querySelector('.simple-section-actions button[aria-expanded]')?.click();const deadline=performance.now()+10000;while(!document.querySelector('.simple-font-card')&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,16));document.querySelector('.simple-font-section')?.scrollIntoView({block:'start'});await new Promise(resolve=>setTimeout(resolve,32));return true})()"#)
        try await host.snapshot(to: output.appendingPathComponent("14-simple-tuning.png"))
        var metrics = try await host.evaluateAsync(#"(async()=>{const cards=[...document.querySelectorAll('.simple-font-card')];const first=cards[0];const labels=[...first.querySelectorAll('.simple-casing button')].map(item=>item.textContent?.trim());const ap=[...first.querySelectorAll('.simple-casing button')].find(item=>item.textContent?.trim()==='AP Title');const field=document.querySelector('.simple-copy-field textarea');const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;setter.call(field,'war and peace: a field guide');field.dispatchEvent(new Event('input',{bubbles:true}));ap?.click();const deadline=performance.now()+10000;while(first.querySelector('.simple-card-copy')?.textContent!=='War and Peace: a Field Guide'&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,16));const touch=[...first.querySelectorAll('button')].map(item=>item.getBoundingClientRect().height);const result={cards:cards.length,casingLabels:labels.join('|'),apTitle:first.querySelector('.simple-card-copy')?.textContent==='War and Peace: a Field Guide',axisSliders:document.querySelectorAll('.simple-axes input[type="range"]').length,minButtonHeight:Math.min(...touch),cardOverflow:cards.filter(item=>item.scrollWidth>item.clientWidth).length};[...first.querySelectorAll('.simple-casing button')].find(item=>item.textContent?.trim()==='As is')?.click();setter.call(field,'A House With No Doors');field.dispatchEvent(new Event('input',{bubbles:true}));return result})()"#) as? [String: Any] ?? [:]
        _ = try await host.evaluate("const trigger=document.querySelector('.simple-font-preview'); trigger?.focus(); trigger?.click(); true")
        try await wait("Simple full-size preview") { try await self.bool("document.querySelector('.simple-preview-dialog') && document.activeElement?.textContent?.trim()==='Close'") }
        try await host.snapshot(to: output.appendingPathComponent("15-simple-full-preview.png"))
        metrics["preview"] = try await host.evaluateAsync(#"(async()=>{const dialog=document.querySelector('.simple-preview-dialog');const close=dialog?.querySelector('button');const trigger=document.querySelector('.simple-font-preview');const initialFocus=document.activeElement===close;close?.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));const forwardWrap=document.activeElement===close;close?.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));const backwardWrap=document.activeElement===close;window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));const deadline=performance.now()+10000;while((document.querySelector('.simple-preview-dialog')||document.activeElement!==trigger)&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,16));return {initialFocus,forwardWrap,backwardWrap,escapeClosed:!document.querySelector('.simple-preview-dialog'),returnFocus:document.activeElement===trigger}})()"#) as? [String: Any] ?? [:]
        _ = try await host.evaluateAsync(#"(async()=>{document.querySelector('.simple-section-actions button[aria-expanded]')?.click();document.querySelector('.simple-hero')?.scrollIntoView({block:'start'});await new Promise(resolve=>setTimeout(resolve,32));return true})()"#)
        return metrics
    }
    private func setInterfaceScale(_ target: Int) async throws {
        _ = try await host.evaluateAsync("(async()=>{const shell=document.querySelector('.app-shell');const decrease=document.querySelector('[aria-label=\"Decrease interface scale\"]');const increase=document.querySelector('[aria-label=\"Increase interface scale\"]');let guardCount=0;while(Number(shell?.dataset.uiScale)!==\(target)&&guardCount<12){(Number(shell?.dataset.uiScale)<\(target)?increase:decrease)?.click();await new Promise(resolve=>setTimeout(resolve,16));guardCount++}return Number(shell?.dataset.uiScale)})()")
        try await wait("Interface scale \(target)") { try await self.bool("document.querySelector('.app-shell')?.dataset.uiScale==='\(target)'") }
    }
    private func simpleScaleMetrics() async throws -> [String: Any] {
        try await host.evaluate("(()=>{const shell=document.querySelector('.app-shell');const title=document.querySelector('.titlebar');const workspace=document.querySelector('.simple-workspace');const shellRect=shell.getBoundingClientRect();const titleInput=title.querySelector('.document-title input');const controls=[...document.querySelectorAll('.simple-hero-actions button,.ui-scale-control button')].filter(item=>{const rect=item.getBoundingClientRect();return rect.width>0&&rect.height>0});const titleButtons=[...title.querySelectorAll('button')].filter(item=>{const rect=item.getBoundingClientRect();return rect.width>0&&rect.height>0});return {scale:Number(shell.dataset.uiScale),headerOverflow:title.scrollWidth>title.clientWidth,workspaceOverflow:workspace.scrollWidth>workspace.clientWidth,clippedTitleButtons:titleButtons.filter(item=>{const rect=item.getBoundingClientRect();return rect.left<shellRect.left-1||rect.right>shellRect.right+1}).length,titleTextClipped:Boolean(titleInput&&titleInput.scrollWidth>titleInput.clientWidth),minTouchHeight:Math.min(...controls.map(item=>item.getBoundingClientRect().height)),horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}})()") as? [String: Any] ?? [:]
    }
    private func keyboardAccessibilityAudit() async throws -> [String: Any] {
        _ = try await host.evaluate("document.querySelector('#import-fonts-button')?.focus(); true")
        host.sendMenu(["type": "new-study"])
        try await wait("New Study dialog") { try await self.bool("document.querySelector('.new-study-dialog') && document.activeElement?.closest('.new-study-dialog')") }
        let trap = try await host.evaluate("(()=>{const d=document.querySelector('.new-study-dialog');const f=[...d.querySelectorAll(\"button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])\")];const first=f[0],last=f.at(-1);last.focus();last.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));const forwardWrap=document.activeElement===first;first.focus();first.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));return {forwardWrap,backwardWrap:document.activeElement===last}})()") as? [String: Any] ?? [:]
        _ = try await host.evaluateAsync("(async()=>{await new Promise(resolve=>setTimeout(resolve,32));document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));return true})()")
        try await wait("New Study close") { try await self.bool("!document.querySelector('.new-study-dialog') && document.activeElement?.id==='import-fonts-button'") }
        let nativeHistoryBefore = host.nativeTextHistoryCommands
        let studyMenuBefore = host.menuCommands
        _ = try await host.evaluate("document.querySelector('.document-title input')?.focus(); true")
        try performMenu("Edit", "Undo")
        try await wait("native text undo route") { self.host.nativeTextHistoryCommands == nativeHistoryBefore + 1 }
        let textInputStillFocused = try await bool("document.activeElement?.matches('.document-title input')")
        let nativeTextUndo = host.menuCommands == studyMenuBefore && textInputStillFocused
        let collision = try await host.evaluateAsync("(async()=>{const s=document.querySelector('.stage-nav [aria-current=\"step\"]');const beforeCandidate=document.querySelector('.candidate-row[aria-current=\"true\"]')?.textContent;const beforeTray=document.querySelectorAll('.tray-item').length;s.focus();s.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));s.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,16));return {candidateUnchanged:beforeCandidate===document.querySelector('.candidate-row[aria-current=\"true\"]')?.textContent,trayUnchanged:beforeTray===document.querySelectorAll('.tray-item').length,returnFocus:document.activeElement===s}})()") as? [String: Any] ?? [:]
        return trap.merging(collision) { _, right in right }.merging(["nativeTextUndo": nativeTextUndo]) { _, right in right }
    }
    private func inspect() async throws -> [String: Any] { (try await host.evaluate("(()=>({heading:document.querySelector('#workspace-heading')?.textContent?.replace(/\\s+/g,' ').trim()??null,stage:document.querySelector('.stage-nav [aria-current=\"step\"]')?.textContent?.replace(/\\s+/g,' ').trim()??null,reviewState:document.querySelector('.candidate-row[aria-current=\"true\"]')?.dataset.reviewState?.replace(/^./,character=>character.toUpperCase())??null,activeElement:document.activeElement?.id||document.activeElement?.tagName||null,durability:document.querySelector('.document-title > span:last-child')?.textContent?.trim()??null}))()")) as? [String: Any] ?? [:] }
    private func currentReviewState() async throws -> String? { try await host.evaluate("document.querySelector('.candidate-row[aria-current=\"true\"]')?.dataset.reviewState") as? String }
    private func bool(_ expression: String) async throws -> Bool { (try await host.evaluate("Boolean(\(expression))")) as? Bool == true }
    private func wait(_ label: String, condition: @escaping () async throws -> Bool) async throws { let deadline = Date().addingTimeInterval(20); while Date() < deadline { if try await condition() { return }; try await Task.sleep(nanoseconds: 100_000_000) }; throw HostError.unavailable("Timed out waiting for \(label)") }
}
