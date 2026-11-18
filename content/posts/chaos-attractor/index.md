---
title: "비선형 동역학과 카오스 이론: 로렌츠 끌개 실시간 시뮬레이션"
date: 2026-11-01T16:00:00+09:00
draft: false
tags: ["수학", "카오스이론", "시뮬레이션", "인터랙티브", "JavaScript"]
categories: ["Mathematics", "Programming"]
math: true
mermaid: false
description: "에드워드 로렌츠의 3차원 비선형 상미분방정식(ODE) 계와 실시간 인터랙티브 캔버스 궤적 시뮬레이터."
---

## 1. 나비 효과와 로렌츠 방정식

1963년 에드워드 로렌츠(Edward Lorenz)는 대기 대류 현상을 단순화한 3차원 비선형 연립 상미분방정식(ODE)을 제시했습니다.

$$
\begin{cases}
\dfrac{dx}{dt} = \sigma (y - x) \\[10pt]
\dfrac{dy}{dt} = x (\rho - z) - y \\[10pt]
\dfrac{dz}{dt} = x y - \beta z
\end{cases}
$$

일반적으로 표준 카오스 거동을 관찰하기 위해 다음의 파라미터가 사용됩니다.
- 프란틀 수 (Prandtl number): $\sigma = 10$
- 레일리 수 (Rayleigh number): $\rho = 28$
- 기하학적 종횡비 파라미터: $\beta = \frac{8}{3}$

---

## 2. 마크다운 내장 실시간 인터랙티브 시뮬레이션

아래 영역은 `hugodex-k`의 `{{< interactive >}}` 확장 단축코드를 통해 마크다운 내부에 안전하게 격리된 HTML5 캔버스와 JavaScript 엔진으로 구동되는 **실시간 로렌츠 끌개 3D 투영 궤적**입니다.

{{< interactive id="lorenz-sim" height="340px" title="로렌츠 끌개(Lorenz Attractor) 실시간 궤적" >}}
<style>
  body { margin: 0; background: #090d16; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; }
  canvas { background: #090d16; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
  .stat { color: #38bdf8; font-size: 11px; margin-top: 6px; font-family: monospace; }
</style>
<canvas id="chaosCanvas" width="480" height="280"></canvas>
<div class="stat" id="statDisplay">계산 스텝: 0 | 현재 좌표 (X, Y, Z)</div>

<script>
  const canvas = document.getElementById('chaosCanvas');
  const ctx = canvas.getContext('2d');
  const stat = document.getElementById('statDisplay');

  let x = 0.1, y = 0, z = 0;
  const sigma = 10, rho = 28, beta = 8/3;
  const dt = 0.01;
  const points = [];
  const maxPoints = 1200;
  let steps = 0;

  function run() {
    for (let i = 0; i < 4; i++) {
      const dx = (sigma * (y - x)) * dt;
      const dy = (x * (rho - z) - y) * dt;
      const dz = (x * y - beta * z) * dt;
      x += dx; y += dy; z += dz;
      points.push({ x, y, z });
      if (points.length > maxPoints) points.shift();
      steps++;
    }

    // 렌더링
    ctx.fillStyle = 'rgba(9, 13, 22, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 30;
    const scale = 5.2;

    ctx.lineWidth = 1.2;
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const hue = (i * 0.3 + steps * 0.1) % 360;
      ctx.strokeStyle = `hsl(${hue}, 85%, 60%)`;
      ctx.beginPath();
      ctx.moveTo(cx + p1.x * scale, cy - p1.z * scale);
      ctx.lineTo(cx + p2.x * scale, cy - p2.z * scale);
      ctx.stroke();
    }

    stat.innerText = `스텝: ${steps} | X=${x.toFixed(2)}, Y=${y.toFixed(2)}, Z=${z.toFixed(2)}`;
    requestAnimationFrame(run);
  }
  run();
</script>
{{< /interactive >}}

---

## 3. 구현 코드 비교 (Multi-language Tabs)

동일한 미분방정식 수치 적분(Euler / Runge-Kutta 4th)을 언어별 탭으로 구성했습니다.

{{< tabs >}}
{{< tab name="Python (NumPy / SciPy)" >}}
```python
import numpy as np
from scipy.integrate import solve_ivp

def lorenz(t, state, sigma=10.0, rho=28.0, beta=8.0/3.0):
    x, y, z = state
    return [sigma * (y - x), x * (rho - z) - y, x * y - beta * z]

# RK45 적분기로 해 계산
sol = solve_ivp(lorenz, (0, 40), [0.1, 0.0, 0.0], max_step=0.01)
print(f"생성된 궤적 점 수: {sol.y.shape[1]}")
```
{{< /tab >}}

{{< tab name="Rust" >}}
```rust
struct LorenzState {
    x: f64,
    y: f64,
    z: f64,
}

impl LorenzState {
    fn step(&mut self, dt: f64) {
        let (sigma, rho, beta) = (10.0, 28.0, 8.0 / 3.0);
        let dx = sigma * (self.y - self.x) * dt;
        let dy = (self.x * (rho - self.z) - self.y) * dt;
        let dz = (self.x * self.y - beta * self.z) * dt;
        self.x += dx;
        self.y += dy;
        self.z += dz;
    }
}
```
{{< /tab >}}
{{< /tabs >}}

---

## 4. 요약

`hugodex-k`의 확장 마크다운 시스템은 단순한 텍스트 전달을 넘어, 복잡한 비선형 미분방정식 궤적을 브라우저에서 직접 독자가 인터랙티브하게 체험할 수 있는 차세대 학술/기술 블로그 환경을 제공합니다.

