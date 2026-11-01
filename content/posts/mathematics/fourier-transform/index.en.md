---
title: "Mathematical Rigor of the Continuous Fourier Transform & L² Isometry"
date: 2026-11-01T10:00:00+09:00
draft: false
tags: ["Mathematics", "Analysis", "Fourier", "Linear Algebra", "Signal Processing"]
categories: ["Mathematics"]
math: true
mermaid: false
description: "A rigorous mathematical review of the Continuous Fourier Transform, Plancherel's Theorem, and Gaussian eigenfunctions in Hilbert space L²(R)."
---

## 1. Overview

The Fourier Transform is a fundamental linear operator mapping functions from the time/spatial domain into orthogonal frequency basis representations.

In this article, we rigorously review the transform from the perspective of real analysis in Hilbert space $L^2(\mathbb{R})$.

---

## 2. Mathematical Definition

{{< callout type="definition" title="Definition: Continuous Fourier Transform" >}}
For any Lebesgue integrable function $f \in L^1(\mathbb{R})$, the **Fourier transform** $\widehat{f} = \mathcal{F}\{f\}$ is defined by:

$$
\widehat{f}(\xi) = \int_{-\infty}^{\infty} f(x) e^{-2\pi i x \xi} \, dx, \quad \forall \xi \in \mathbb{R}
$$

where $i = \sqrt{-1}$ and $\xi$ denotes the frequency parameter.
{{< /callout >}}

### 2.1 Inversion Formula

When $\widehat{f} \in L^1(\mathbb{R})$, the original function can be reconstructed almost everywhere:

$$
f(x) = \int_{-\infty}^{\infty} \widehat{f}(\xi) e^{2\pi i x \xi} \, d\xi
$$

---

## 3. Plancherel's Theorem and Isometry

{{< callout type="theorem" title="Theorem: Plancherel's Theorem" >}}
For all $f, g \in L^2(\mathbb{R}) \cap L^1(\mathbb{R})$, the Fourier operator preserves inner products and norms:

$$
\langle f, g \rangle_{L^2} = \langle \widehat{f}, \widehat{g} \rangle_{L^2} \implies \|f\|_{L^2} = \|\widehat{f}\|_{L^2}
$$
{{< /callout >}}

---

## 4. Eigenfunction Property of the Gaussian

The standard Gaussian function $f(x) = e^{-\pi x^2}$ satisfies:

$$
\widehat{f}(\xi) = e^{-\pi \xi^2}
$$

proving that the Gaussian is an invariant eigenfunction under the Fourier transform operator with eigenvalue $\lambda = 1$.

