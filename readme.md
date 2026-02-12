# 🌙 本命杯杯 BaeBae
> **不是亂數，也不是占卜。**<br>
這是一套把你「為誰心動」這件事，寫進數學裡的系統。<br>
**當「三元九運」遇上「非線性動力學」，這不再只是機率，這是你與本命的量子糾纏。**

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-ff4400?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Engine-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![Rapier Physics](https://img.shields.io/badge/Rapier-Realtime%20Physics-blue?style=for-the-badge)](https://rapier.rs/)
[![Engine](https://img.shields.io/badge/Core-Deep%20Fate%20Engine%20v1.0-purple?style=for-the-badge)](https://github.com/misterp8)

<p align="center">
  <img src="./icon512.png" width="180" alt="BaeBae" style="border-radius: 20px; box-shadow: 0 0 20px rgba(255, 68, 0, 0.5);">
</p>

## 簡介 (Introduction)

**本命杯杯** 是一款專為追星族（以及所有迷惘的靈魂）打造的 **PWA 3D 擲筊應用**。<br>
如果你有用過其他擲筊 App，你大概知道結果怎麼來的：<br>
一行 Math.random()，配一個看起來很玄的動畫。<br>
本命杯杯不是。<br>
我們的前提很簡單：<br>
現實世界裡，你為不同偶像擲筊、在不同時間擲、心情不同時擲，<br>
結果本來就不可能一樣。那 App 為什麼要一樣？<br>
所以這不是「幫你抽結果」，<br>
而是把你當下的狀態，完整丟進一個系統裡，讓它自己算出結果。<br>

透過獨家研發的 **「三元九運混沌引擎 (Deep Fate Engine)」**<br>
系統將你當下的 **時空座標**、**命理生辰** 與 **物理模擬** 完美融合，如果現實世界的每一次擲筊，都會因為時間、位置、力道而不同，那 App 也該如此。
>**所以你按下去的那一刻，結果就已經不可能再重來。**

---

## 安裝至手機 (PWA Installation)

本程式採用 **PWA (Progressive Web App)** 技術，**強烈建議** 將其安裝至手機主畫面，以獲得 **全螢幕、無網址列、如同原生 App** 的沈浸式體驗。

### Android 使用者
1. 使用 **Chrome** 瀏覽器開啟網頁。
2. 點擊右上角的 **「三點選單」**。
3. 點選 **「安裝」** 或 **「加到主畫面」**。
4. 依照提示確認安裝。
5. 回到桌面，點擊 **「本命杯杯」** 圖示即可啟動。

### iOS (iPhone/iPad) 使用者
1. 使用 **Safari** 瀏覽器開啟網頁。
2. 點擊下方選單中間的 **「分享」按鈕** (方框向上箭頭)。
3. 往下滑動，找到並點選 **「加入主畫面」 (Add to Home Screen)**。
4. 點擊右上角的 **「新增」**。
5. 回到桌面，點擊 **「本命杯杯」** 圖示即可啟動。

---

我們不相信運氣，我們相信數學。
本系統移除了電腦偽隨機數，改用 **泛函分析** 與 **混沌理論 (Chaos Theory)** 來決定物理參數。

### 📜 命運總方程式 (The Grand Destiny Equation)

每一次的擲筊結果 $\Psi(t)$，皆由以下 **多維度時空張量** 收斂得出：

$$
\Psi_{fate}(t) = \lim_{\epsilon \to 0} \left[ \oint_{\partial \Omega} \left( \frac{\partial \mathcal{B}_{user}}{\partial t} + \nabla \cdot \vec{GPS}_{flux} \right) d\mu + \sum_{k=1}^{\infty} \frac{\text{MoonPhase}(t)^k}{k!} \right] \times \mathcal{L}_{chaos}(r)
$$

其中：

* **$\mathcal{B}_{user}$ (User Bio-Entropy)**：使用者生辰八字經由 SHA-256 雜湊後的時間導數。
* **$\nabla \cdot \vec{GPS}_{flux}$ (Geo-Spatial Divergence)**：當下地理位置（經緯度）的磁場散度，即時影響物理引擎的摩擦係數。
* **$\sum \text{MoonPhase}$ (Lunar Series)**：月相引力的無窮級數，在滿月時收斂至最大值，增強擲筊力矩 (Torque)。
* **$\mathcal{L}_{chaos}(r)$ (Logistic Map Operator)**：
    $$x_{n+1} = r \cdot x_n (1 - x_n)$$
    這是混沌系統的核心，確保極微小的初始條件差異（如手抖 0.01 秒），都能引發蝴蝶效應，導致截然不同的結果。

**簡單的說**
> 你的生日、你在哪裡、現在月亮圓不圓、你按下去的那一毫秒... 宇宙萬物都在影響這對杯杯怎麼轉。
    這是混沌系統的核心，確保極微小的初始條件差異（如手抖 0.01 秒），都能引發蝴蝶效應，導致截然不同的結果。<br>**這不是隨機，這是命定。**


---

## ✨ 核心功能 (Key Features)

* **真實物理模擬**：搭載 **Rapier 3D** 物理引擎，計算摩擦力、彈性係數與空氣阻力。
* **實時光影質感**：Three.js 打造的真實光影，每一擲都充滿神聖感。
* **本命加持**：可上傳你的本命照片和輸入專屬文字加強念力，讓偶像加持為你指引迷津。
* **觸覺回饋**：支援 Taptic Engine 震動回饋，還原真實手感。

---

## ☕ 支持開發者 (Support the Oracle)

如果這個系統幫助你抽中了小卡，搶到了演唱會門票，或是你的本命真的回應了你...<br>
**歡迎請我喝杯咖啡☕，讓系統繼續運轉。**

<a href="https://buymeacoffee.com/mister.p" target="_blank">
  <img src="./coffee.png" alt="Buy Me A Coffee" style="height: 180px !important;width: 180px !important;" >
</a>

---

<p align="center">
 Made with ❤️❤️❤️ by Mister P
</p>

