# 参考与署名

## 旋转木马结构

- 参考项目：[Carousel Lamp](https://github.com/Daria1216/carousel-lamp) by 咕噜蛋Daria
- 作者许可：仅限非商业使用，必须保留作者署名及许可说明。许可证全文见 `licenses/carousel-lamp-LICENSE.txt`。
- 本站是个人非商业项目，已在旅行地图的照片木马界面保留署名。
- 当前实现使用该仓库公开的 `carousel-base.png` / `carousel-column.png` / `carousel-panels.png` 贴图（压缩后放在 `site/assets/carousel/`）；3D 场景代码用 Three.js 重新实现，没有直接复制它的 React / Vinext 代码。
- 如果之后要商用，需要另行取得原作者授权。

## 暹罗厘普视觉参考

- 用户提供了 5 张暹罗厘普角色参考图。
- 这些参考图只用于早期木马的角色数量和可爱感判断；当前旅行页已改为暗茶褐 / 灰豆沙棕旧纸 + 维多利亚花卉边框，木马保留金色装饰，不再使用奶油粉、粗黑描边和漫画分格的视觉语言。
- 参考图带有小红书水印，没有把角色原图嵌进网页。如果之后要使用角色贴纸 / 立绘，需要确认授权并提供无水印素材。
- 当前木马里的照片仍是旅行照片占位插画，角色不参与照片内容。

## 角色 SVG

- `site/assets/images/characters/` 里的兔子、小狗、猫、胡萝卜人、鹈鹕、星星，是按参考图气质画的**简化原创 SVG 演绎**，用于原型交互和氛围占位。
- 它们不是暹罗厘普官方素材，也不是对原图的描摹；正式发布前建议替换为有授权的官方角色图，或确认这些简化版本可以这样使用。

## 开场视觉推进参考

- Moooi “A Life Extraordinary”（2020，Build in Amsterdam）：满屏分层图案、超大标题、Enter / Sound On、门户式转场和缓慢镜头。
- 本站只借鉴「分层图案 + 大标题放大 + 光圈 / 门户 + 慢转场」的机制，用 CSS / GSAP 重新实现；没有使用该项目的图片、视频或代码。

## 信纸参考素材

- 用户提供的两张粉色信纸图：`letter-butterfly.jpg`、`letter-blossom.jpg`。
- 2026-10-29 用户选择 B「博物图鉴」后，当前写作 / 文章页改用 CSS 奶油旧纸，不再使用这两张粉色信纸；文件保留在 `site/assets/images/writing/` 作为备选。
- 用户另外提供的 BLOOMING / Nature in Contrast 花卉画也保留在同一目录，当前不参与页面。
- 这些图片是用户提供的参考素材，正式公开发布前需要确认版权，或替换成有授权的版本 / 自己拍摄制作的素材。

## 首页 / 旅行页 / 内页装饰

- `site/assets/images/home/floral-corner.svg`：首页四角的金线 / 香槟金花卉，按“牡丹 + 兰花”的意象绘制的原创 SVG。
- `site/assets/images/travel/victorian-frame.svg`：旅行页四周的维多利亚风格百合 / 玫瑰 / 藤蔓 / 鎏金边框，参考 Fornasetti、Dior 复古植物版画的构图气质，原创 SVG；只作为四周边缘的低透明度底纹，中心透明。
- `site/assets/images/natural-history/`：B 版内页的白百合、铃兰、天鹅、蕨类、鼠尾草蝴蝶，原创 SVG；用于作品卡片封面、写作页纸笺、文章页边缘和天鹅便签。
- `site/assets/images/scrapbook/butterfly.svg`、`blossom-branch.svg`、`envelope.svg`、`lace-doily.svg`：旧手账版的蝴蝶、樱花枝、小信封和蕾丝垫；当前内页仍复用其中的蕾丝垫 / 信封，其余作为备选。
- 内页的复古英文手稿是 HTML 文本装饰，不是扫描件；胶带、撕边、纸张纹理由 CSS 绘制。
- 这些新装饰可随项目一起使用；如果之后替换成外部素材，需要另行记录来源和许可。

## 背景音乐

- 旅行页背景音乐：**Water Lily** by Kevin MacLeod ([incompetech.com](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400035))。
- 授权：Creative Commons Attribution 4.0 International（CC BY 4.0），允许商用和修改，需要保留署名与许可链接。许可证全文：<https://creativecommons.org/licenses/by/4.0/>。
- 音频文件：`site/assets/audio/water-lily.mp3`；旅行木马界面的 credits 行和页面音乐按钮的提示文本也保留了署名。

## 字体

- 首页、旅行页和内页标题使用 **LXGW WenKai Lite（霞鹜文楷 Lite）**，SIL Open Font License 1.1。
- 字体子集来自 Carousel Lamp 仓库的 `public/fonts/`，已放到 `site/assets/fonts/`；许可证全文见 `licenses/lxgw-wenkai-OFL.txt`。
- 排版：`site/css/fonts.css` 把字体声明和 unicode-range 拆成子集，浏览器只加载页面实际用到的字。

## 第三方依赖

- Three.js：MIT License
- GSAP：GreenSock 标准许可（个人 / 非商业使用免费）
- 中国省份 GeoJSON：DataV.GeoAtlas
- 世界地图 GeoJSON：Natural Earth
- 字体：首页、旅行页和内页标题使用 LXGW WenKai Lite（OFL），其余使用系统字体，没有额外打包商用字体。

## 内容管理后台

- 纯原生 HTML / CSS / JavaScript，使用 GitHub Contents API 提交内容，没有引入第三方后台框架。
- GitHub Token 仅保存在当前标签页的 sessionStorage，不进入仓库、localStorage、URL 或日志。
- 后台样式与展示页分离；管理入口只在首页页脚低调出现。
