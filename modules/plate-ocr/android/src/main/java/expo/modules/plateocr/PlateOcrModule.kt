package expo.modules.plateocr

import android.graphics.BitmapFactory
import android.util.Base64
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * OCR on-device con ML Kit (Latin). Recibe la placa recortada en base64 y
 * devuelve las líneas de texto reconocidas.
 */
class PlateOcrModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PlateOcr")

    AsyncFunction("recognizeText") { imageBase64: String, promise: Promise ->
      val cleaned = if (imageBase64.contains(",")) imageBase64.substringAfter(",") else imageBase64
      val bytes = try {
        Base64.decode(cleaned, Base64.DEFAULT)
      } catch (e: Exception) {
        null
      }
      val bitmap = bytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
      if (bitmap == null) {
        promise.resolve(emptyList<String>())
        return@AsyncFunction
      }

      val image = InputImage.fromBitmap(bitmap, 0)
      val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      recognizer.process(image)
        .addOnSuccessListener { result ->
          val lines = result.textBlocks.flatMap { block -> block.lines.map { it.text } }
          promise.resolve(lines)
        }
        .addOnFailureListener { e ->
          promise.reject("OCR_ERROR", e.message ?: "OCR failed", e)
        }
    }
  }
}
