---
title: "연속 푸리에 변환의 수학적 엄밀성과 L² 직교 공간"
date: 2026-11-01T10:00:00+09:00
draft: false
tags: ["수학", "해석학", "푸리에변환", "선형대수", "신호처리"]
categories: ["Mathematics"]
math: true
mermaid: false
description: "학부 고급 해석학 관점에서 바라본 연속 푸리에 변환(Continuous Fourier Transform)의 정의와 플랑슈렐 정리(Plancherel Theorem) 및 수치 계산 구현."
---

## 1. 개요

푸리에 변환(Fourier Transform)은 시간(Time) 또는 공간(Space) 영역의 함수를 주파수(Frequency) 영역의 기저 함수(Basis Function)로 분해하는 선형 연산자(Linear Operator)입니다.

이 글에서는 학부 실해석학(Real Analysis) 관점에서 $L^1(\mathbb{R})$ 및 $L^2(\mathbb{R})$ 힐베르트 공간 상의 푸리에 변환 성질을 엄밀하게 정리합니다.

---

## 2. 수학적 정의

{{< callout type="definition" title="정의: 연속 푸리에 변환" >}}
가측 함수 $f \in L^1(\mathbb{R})$에 대하여, $f$의 **푸리에 변환** $\widehat{f} = \mathcal{F}\{f\}$는 다음과 같이 정의된다.

$$
\widehat{f}(\xi) = \int_{-\infty}^{\infty} f(x) e^{-2\pi i x \xi} \, dx, \quad \forall \xi \in \mathbb{R}
$$

여기서 $i = \sqrt{-1}$이며, $\xi$는 주파수(Frequency)를 나타낸다.
{{< /callout >}}

### 2.1 역 푸리에 변환 (Inverse Fourier Transform)

만약 $\widehat{f} \in L^1(\mathbb{R})$이라면, 다음의 반전 공식(Inversion Formula)이 성립하여 거의 어디서나(almost everywhere) $f$를 복원할 수 있습니다.

$$
f(x) = \int_{-\infty}^{\infty} \widehat{f}(\xi) e^{2\pi i x \xi} \, d\xi
$$

---

## 3. 플랑슈렐 정리와 등거리 동형사상

$L^1(\mathbb{R})$ 상에서 정의된 푸리에 변환은 힐베르트 공간 $L^2(\mathbb{R})$로 자연스럽게 확장될 수 있습니다.

{{< callout type="theorem" title="정리: 플랑슈렐 정리 (Plancherel's Theorem)" >}}
임의의 함수 $f, g \in L^2(\mathbb{R}) \cap L^1(\mathbb{R})$에 대하여, 푸리에 변환 $\mathcal{F}$는 $L^2$ 내적을 보존한다.

$$
\langle f, g \rangle_{L^2} = \langle \widehat{f}, \widehat{g} \rangle_{L^2}
$$

즉, 다음의 노름 보존(Isometry) 관계가 성립한다.

$$
\|f\|_{L^2}^2 = \int_{-\infty}^{\infty} |f(x)|^2 \, dx = \int_{-\infty}^{\infty} |\widehat{f}(\xi)|^2 \, d\xi = \|\widehat{f}\|_{L^2}^2
$$
{{< /callout >}}

{{< callout type="proof" title="증명 개요" >}}
슈바르츠 공간(Schwartz space) $\mathcal{S}(\mathbb{R})$ 상에서 푸시-풀 합성곱(Convolution)과 컨볼루션 정리(Convolution Theorem)를 적용한 뒤, $\mathcal{S}(\mathbb{R})$이 $L^2(\mathbb{R})$에서 조밀(dense)하다는 성질과 유니타리 연산자의 연속적 확장 정리를 이용한다.
$$
\int |f(x)|^2 dx = \int f(x) \overline{f(x)} dx = \iint \widehat{f}(\xi) \overline{\widehat{f}(\eta)} e^{2\pi i x (\xi - \eta)} d\xi d\eta dx = \int |\widehat{f}(\xi)|^2 d\xi \quad \blacksquare
$$
{{< /callout >}}

---

## 4. 다차원 가우시안 함수의 변환 유도

가우시안 함수 $f(x) = e^{-\pi x^2}$의 푸리에 변환은 고유함수(Eigenfunction) 성질을 갖습니다.

$$
\begin{aligned}
\widehat{f}(\xi) &= \int_{-\infty}^{\infty} e^{-\pi x^2} e^{-2\pi i x \xi} dx \\
&= \int_{-\infty}^{\infty} e^{-\pi (x^2 + 2i x \xi - \xi^2) - \pi \xi^2} dx \\
&= e^{-\pi \xi^2} \int_{-\infty}^{\infty} e^{-\pi (x + i\xi)^2} dx \\
&= e^{-\pi \xi^2} \cdot 1 = e^{-\pi \xi^2}
\end{aligned}
$$

따라서 가우시안 함수는 고유값 $\lambda = 1$에 해당하는 푸리에 연산자의 고유함수입니다.

---

## 5. 수치적 계산 (Python NumPy & SciPy)

이산 신호에 대해 고속 푸리에 변환(FFT, Fast Fourier Transform)을 수행하는 구현 예제입니다.

```python
import numpy as np
import matplotlib.pyplot as plt

def compute_fft(signal: np.ndarray, sample_rate: float):
    """
    1차원 시계열 신호의 진폭 스펙트럼 계산
    """
    N = len(signal)
    fft_vals = np.fft.fft(signal)
    fft_freq = np.fft.fftfreq(N, 1.0 / sample_rate)
    
    # 양수 주파수 영역만 필터링
    positive_mask = fft_freq >= 0
    freqs = fft_freq[positive_mask]
    amplitudes = (2.0 / N) * np.abs(fft_vals[positive_mask])
    
    return freqs, amplitudes

# 샘플 신호 생성 (50Hz + 120Hz 사인파)
fs = 1000.0 # 샘플링 주파수
t = np.linspace(0.0, 1.0, int(fs), endpoint=False)
sig = 0.7 * np.sin(2.0 * np.pi * 50.0 * t) + 1.2 * np.sin(2.0 * np.pi * 120.0 * t)

freqs, amps = compute_fft(sig, fs)
print(f"주파수 계산 완료: 최대 피크 주파수 = {freqs[np.argmax(amps)]:.1f} Hz")
```

---

## 6. 결론

연속 푸리에 변환은 단순한 신호 분석 기법을 넘어, 편미분방정식(PDE)의 기본해 유도, 양자역학의 운동량 표상, 복소 해석학의 팔리-위너 정리(Paley-Wiener Theorem) 등 현대 순수/응용수학 전반의 핵심 주춧돌입니다.

