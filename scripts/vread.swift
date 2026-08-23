// vread.swift — macOS 15 provenance 驱逐文件读取助手(NSFileCoordinator 水合)
// 用法: swift vread.swift <path> [path...]
import Foundation

for arg in CommandLine.arguments.dropFirst() {
    let url = URL(fileURLWithPath: arg)
    var output = ""
    var coordError: NSError?
    let coordinator = NSFileCoordinator()
    coordinator.coordinate(readingItemAt: url, options: [], error: &coordError) { (u) in
        do {
            let data = try Data(contentsOf: u)
            output = String(data: data, encoding: .utf8) ?? "<binary \(data.count) bytes>"
        } catch {
            output = "READ_ERROR: \(error)"
        }
    }
    if let e = coordError {
        print("=== \(arg) ===\nCOORD_ERROR: \(e)")
    } else {
        print("=== \(arg) ===\n\(output)")
    }
}
