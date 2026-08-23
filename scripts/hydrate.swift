// hydrate.swift — 批量水合 macOS 驱逐文件(NSFileCoordinator)
// 用法: swift hydrate.swift <dir> [dir...]  — 遍历目录内所有文件触发水合
import Foundation

let fm = FileManager.default

func hydrate(_ url: URL) {
    var coordError: NSError?
    let coordinator = NSFileCoordinator()
    coordinator.coordinate(readingItemAt: url, options: [], error: &coordError) { (u) in
        _ = try? Data(contentsOf: u)
    }
}

for arg in CommandLine.arguments.dropFirst() {
    let root = URL(fileURLWithPath: arg)
    if let enumerator = fm.enumerator(at: root, includingPropertiesForKeys: [.isRegularFileKey], options: []) {
        var n = 0
        for case let item as URL in enumerator {
            if item.pathExtension == "DS_Store" { continue }
            if item.lastPathComponent == ".DS_Store" { continue }
            hydrate(item)
            n += 1
            if n % 20 == 0 { print("hydrated \(n)...") }
        }
        print("done \(root.path): \(n) files")
    }
}
