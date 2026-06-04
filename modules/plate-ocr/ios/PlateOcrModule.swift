import ExpoModulesCore
import Vision
import UIKit

/// OCR on-device con Apple Vision (VNRecognizeTextRequest). Recibe la placa
/// recortada en base64 y devuelve las líneas de texto reconocidas.
public class PlateOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PlateOcr")

    AsyncFunction("recognizeText") { (imageBase64: String) -> [String] in
      // Quitar prefijo data:image/...;base64, si viene.
      let cleaned: String
      if let comma = imageBase64.firstIndex(of: ",") {
        cleaned = String(imageBase64[imageBase64.index(after: comma)...])
      } else {
        cleaned = imageBase64
      }

      guard
        let data = Data(base64Encoded: cleaned),
        let image = UIImage(data: data),
        let cgImage = image.cgImage
      else {
        return []
      }

      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = false

      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      try handler.perform([request])

      guard let observations = request.results else { return [] }
      return observations.compactMap { $0.topCandidates(1).first?.string }
    }
  }
}
