// fOrca のアイコンを、本家のアイコンから作る。
// 使い方: swift fork/make-icon.swift resources/build/icon.png resources/build/fork/icon.png
// 黒を暗い緑、白をミントに置き換え、左上に丸い「f」の札を付ける。
import AppKit
import CoreImage

let args = CommandLine.arguments
guard args.count == 3, let source = NSImage(contentsOfFile: args[1]),
  let cg = source.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
  FileHandle.standardError.write("usage: make-icon.swift <in.png> <out.png>\n".data(using: .utf8)!)
  exit(1)
}

let size = CGFloat(cg.width)
let input = CIImage(cgImage: cg)
let darkGreen = CIColor(red: 0.07, green: 0.16, blue: 0.13)
let mint = CIColor(red: 0.62, green: 0.90, blue: 0.78)
let recolored = input.applyingFilter("CIFalseColor", parameters: ["inputColor0": darkGreen, "inputColor1": mint])
// 角丸の外側（透明）を元のアルファで切り抜き直す。
let masked = recolored.applyingFilter(
  "CIBlendWithAlphaMask",
  parameters: ["inputBackgroundImage": CIImage.empty(), "inputMaskImage": input])

let rep = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: cg.width, pixelsHigh: cg.height, bitsPerSample: 8,
  samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
  bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
let context = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = context
let ciContext = CIContext(cgContext: context.cgContext, options: nil)
ciContext.draw(masked, in: CGRect(x: 0, y: 0, width: size, height: size), from: input.extent)

// 左上の「f」の札。
let badge = NSRect(x: size * 0.15, y: size * 0.62, width: size * 0.22, height: size * 0.22)
NSColor(calibratedRed: 0.62, green: 0.90, blue: 0.78, alpha: 1).setFill()
NSBezierPath(ovalIn: badge).fill()
let base = NSFont.systemFont(ofSize: size * 0.17, weight: .bold)
let font = base.fontDescriptor.withDesign(.rounded).flatMap { NSFont(descriptor: $0, size: size * 0.17) } ?? base
let text = NSAttributedString(
  string: "f",
  attributes: [
    .font: font,
    .foregroundColor: NSColor(calibratedRed: 0.07, green: 0.16, blue: 0.13, alpha: 1),
  ])
let textSize = text.size()
text.draw(at: NSPoint(x: badge.midX - textSize.width / 2, y: badge.midY - textSize.height / 2))
NSGraphicsContext.restoreGraphicsState()

let png = rep.representation(using: .png, properties: [:])!
try! png.write(to: URL(fileURLWithPath: args[2]))
