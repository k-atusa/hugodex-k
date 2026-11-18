---
title: "푸리에 변환과 신호 처리의 수학적 기초"
date: 2026-11-16T09:15:00+09:00
draft: false
category: "신호 처리"
tags: ["수학", "푸리에변환", "신호처리"]
math: true
mermaid: false
---

푸리에 해석(Fourier Analysis)은 복잡한 시간 영역의 신호를 여러 주파수를 갖는 정현파의 합으로 분해하여 해석하는 현대 신호 처리 및 수학의 핵심 도구입니다.

---

## 1. 연속 시간 푸리에 변환 (CTFT)

연속 신호 $f(t) \in L^1(\mathbb{R})$에 대한 푸리에 변환 $\hat{f}(\xi)$ 및 그 역변환은 다음과 같이 정의됩니다:

$$
\hat{f}(\xi) = \int_{-\infty}^{\infty} f(t) \, e^{-2\pi i \xi t} \, dt
$$

$$
f(t) = \int_{-\infty}^{\infty} \hat{f}(\xi) \, e^{2\pi i \xi t} \, d\xi
$$

{{< callout type="theorem" title="플랑슈렐 정리 (Plancherel's Theorem)" >}}
시간 영역에서의 총 에너지는 주파수 영역에서의 총 에너지와 정확히 보존됩니다:
$$
\int_{-\infty}^{\infty} |f(t)|^2 \, dt = \int_{-\infty}^{\infty} |\hat{f}(\xi)|^2 \, d\xi
$$
{{< /callout >}}

---

## 2. 이산 푸리에 변환 (DFT)과 고속 알고리즘 (FFT)

컴퓨터 상에서 이산 신호 $x[n]$ ($n = 0, 1, \dots, N-1$)를 처리할 때는 이산 푸리에 변환(DFT)을 사용합니다:

$$
X[k] = \sum_{n=0}^{N-1} x[n] \cdot e^{-i \frac{2\pi}{N} k n}, \quad k = 0, 1, \dots, N-1
$$

직접 계산 시 $O(N^2)$의 시간 복잡도가 소요되지만, 쿨리-튜키(Cooley-Tukey) 알고리즘을 활용한 고속 푸리에 변환(FFT)을 적용하면 시간 복잡도를 $O(N \log N)$으로 획기적으로 낮출 수 있습니다.

```python
import numpy as np

def compute_fft(signal: np.ndarray, sample_rate: float):
    """Compute frequency spectrum using FFT."""
    n = len(signal)
    freqs = np.fft.rfftfreq(n, d=1.0/sample_rate)
    magnitudes = np.abs(np.fft.rfft(signal)) / n
    return freqs, magnitudes
```

---

## 3. 컨볼루션 정리 (Convolution Theorem)

시간 영역에서의 합성곱(Convolution) 연산은 주파수 영역에서 단순 곱셈으로 변환됩니다:

$$
\mathcal{F}\{f * g\} = \mathcal{F}\{f\} \cdot \mathcal{F}\{g\}
$$

이 정리는 복잡한 필터링 연산을 주파수 영역에서 곱셈을 수행한 후 역변환하는 방식으로 초고속 필터링을 가능하게 만듭니다.
