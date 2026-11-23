# Local AI runtime compatibility

| Runtime | Backend/model family | Status |
|---|---|---|
| llama.cpp | GGUF, CPU and supported GPU backends | Planned |
| ONNX Runtime | ONNX with CPU/DirectML/CUDA providers | Planned |
| ONNX Runtime GenAI | Supported generative ONNX | Planned |
| OpenVINO | OpenVINO IR and supported imports | Planned |
| LiteRT | LiteRT/TFLite and delegates | Planned |
| DirectML | Compatible ONNX provider | Planned |
| CUDA | NVIDIA-compatible backend | Planned |
| Vulkan | Backend-specific compatible models | Planned |
| WebGPU | Browser-compatible local inference | Planned |

Probe provider availability, verify checksums, report RAM/VRAM and require a real inference self-test before marking a runtime active. Downloads are optional; installed assets work offline.