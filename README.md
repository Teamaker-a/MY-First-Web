# 个人网站项目

这是个人网站的工作目录。网站已经可以本地运行：深色烫金花卉首页、Coding 作品、旅行地图游戏、信纸写作页和文章详情。页面视觉在 2026-10-22 统一为「深色法式烫金 + 浅色复古手账」两个模块；旅行地图交互完整，但内容（照片、去过的地方、音乐、作品、文章）仍是示例数据。

## 目录结构

```
personal-website/
├─ AGENTS.md                 # 给 AI 的长期协作规则
├─ PROJECT_MEMORY.md         # 跨会话项目记忆（当前进度、决定、踩坑）
├─ README.md                 # 本文件
├─ CREDITS.md                # 参考项目、许可和素材署名
├─ start-site.bat            # Windows 双击启动网站
├─ licenses/
│  └─ carousel-lamp-LICENSE.txt  # 参考项目的非商业许可全文
├─ docs/
│  ├─ 00-方案讨论.md          # 主题方向 + 需要确认的内容
│  ├─ 01-需求与结构.md        # 网站结构、旅行地图需求、技术方案
│  └─ 02-内容管理后台.md      # GitHub Token 登录、路径配置、发布与安全
├─ site/                     # 网站源码
│  ├─ index.html             # 首页
│  ├─ travel.html            # 旅行地图游戏
│  ├─ works.html             # Coding 作品
│  ├─ writing.html           # 信纸写作页
│  ├─ article.html           # 文章详情
│  ├─ admin.html             # Git 内容管理后台（noindex）
│  ├─ content/
│  │  └─ site.json            # 后台管理的个人资料 + 文章
│  ├─ css/                   # base / home / scrapbook / natural-history / admin / travel / carousel-skin / fonts / intro 等
│  ├─ js/
│  │  ├─ data.js             # 旅行、作品与文章 fallback
│  │  ├─ home.js             # 首页花卉分层视差
│  │  ├─ profile.js          # 首页读取个人资料
│  │  ├─ content-store.js    # 展示页读取 content/site.json
│  │  ├─ pages.js            # 作品卡片 / 文章详情 / 入场和装饰视差
│  │  ├─ writing-room.js     # 写作页信纸卡片 + 分层视差
│  │  ├─ admin.js            # 后台登录、文章 CRUD、图片上传、资料编辑
│  │  ├─ github-client.js    # GitHub Contents API
│  │  ├─ travel.js           # 地球 + 中国地图 + 木马交互
│  │  ├─ carousel3d.js       # Three.js 3D 旋转木马场景
│  │  └─ music.js            # 示例背景音乐（WebAudio）
│  ├─ assets/                # 图片、地图数据、官方木马贴图、字体子集、原创装饰、之后上传的照片和音频
│  └─ vendor/                # Three.js 和 GSAP（本地文件）
├─ layout-editor/            # 本地排版编辑器
│  ├─ server.py              # 本地服务器（共享数据 + 素材上传）
│  ├─ start.bat              # Windows 双击启动
│  ├─ assets/                # 上传的美术素材
│  └─ shared-data/
│     └─ current.json        # 当前排版工程
└─ tools/                    # 生成首页小地球等一次性脚本
```

## 启动网站

**Windows：** 双击 `start-site.bat`。

**命令行：**

```bash
python -m http.server 8780 --directory site
```

浏览器打开 `http://127.0.0.1:8780/`。

> 旅行地图用 ES module 和本地 JSON，必须通过本地服务器打开，直接双击 HTML 文件会加载失败。

## 当前页面

- **首页**：深墨黑底的法式烫金花卉封面；金线 / 香槟金花卉从四角生长，中心留白，放名字、短句和「作品 / 旅行 / 文章」三个入口。标题分层入场，四角花卉有鼠标视差。
- **作品**：B 版「博物图鉴」：深鼠尾草绿旧纸、三张奶油纸项目图版、白百合 / 蕨类 / 鼠尾草蝴蝶封面纹样、胶带、边缘蕨类 / 手稿 / 蕾丝，以及一张 `CYGNUS OLOR` 天鹅便签。项目仍是示例内容，链接待补。
- **旅行**：暗茶褐 / 灰豆沙棕旧纸底，四周是低透明度的维多利亚花卉 / 鎏金边框和浅米金细星，中心留给地球和标题。进入页面先是 Moooi 式开场：金色星盘纹样 + 文楷大标题「去有风的地方」+ 进入 / SOUND ON，点击后标题放大到裁切、圆形光圈收拢，露出地球。每个浏览器会话播放一次，右上角 SKIP 可跳过。之后是卡通地球（可拖动 / 滚轮缩放）→ 点击进入中国地图 → 去过粉色、最想去蓝色 → 点省份进入 Three.js 3D 旋转木马：官方 Carousel Lamp 贴图的顶篷 / 灯柱 / 底座，一圈悬挂旅行相框，角色暂时是简化占位；木马保留金色装饰，桌面端文字在左侧、手机端文字在上方；支持拖拽视角、滚轮缩放、起风、暂停旋转、日夜切换、背景音乐，点相框放大。地球、文字、导航、地图配色和交互位置都没有改动。
- **文章**：B 版「博物图鉴」：深鼠尾草绿底上的三张奶油旧纸信笺，带 `PLATE I/II/III` 邮票标签、白百合 / 蕨类 / 鼠尾草蝴蝶、旧书边缘和鼠标视差。点开信纸进入撕边图鉴纸页，页边有白百合、蕨类、旧邮票和金色火漆，正文采用可读的 15–17px 衬线排版与首行缩进。
- **后台**：`/admin.html`。GitHub Token 登录，新建 / 编辑 / 删除文章，上传图片，修改个人资料，通过 GitHub Contents API 提交到仓库。纯静态、无数据库；Token 只放当前标签页。详细配置见 `docs/02-内容管理后台.md`。

## 内容管理后台

- 打开 `http://127.0.0.1:8780/admin.html`，或用首页页脚的「管理」入口。
- 登录需要 **GitHub Fine-grained Token**（Contents 读写 + Metadata 读取）和仓库信息。
- 文章数据现在是 `site/content/site.json`；写作页、文章页和首页资料都读取它。作品和旅行数据仍在 `site/js/data.js`。
- 保存会产生 Git commit，GitHub Pages / Netlify / Vercel 监听分支后自动构建。
- 后台改的是 GitHub 仓库；本地 `site/` 需要 `git pull`，线上等构建完成。
- 路径怎么填、Token 怎么建、常见错误和安全限制见 [docs/02-内容管理后台.md](docs/02-内容管理后台.md)。

## 旅行地图数据怎么改

打开 `site/js/data.js`：

- `travel.visited`：去过的省份，用 DataV 的完整省名，例如 `浙江省`、`新疆维吾尔自治区`。
- `travel.wishlist`：最想去的省份，同样用完整省名。
- `travel.places`：每个地方的照片和文字。照片加 `src`（放到 `site/assets/images/`），没有 `src` 时会自动生成一张示例插画。
- `works`：作品内容；文章和资料已迁到 `site/content/site.json`，通过后台维护。

当前 `travel.demo = true`，地图上会显示「示例数据 · 待替换」；换成真实数据后改成 `false`。

## 背景音乐

现在用的是 `site/js/music.js` 里 WebAudio 合成的示例音乐盒循环，打开目的地时自动播放。之后你把 MP3 / OGG 放到 `site/assets/audio/`，再把 `music.js` 换成 `<audio loop>` 播放即可；也可以直接告诉我，我来接。

## 启动排版编辑器

**Windows：** 双击 `layout-editor/start.bat`。

**命令行：**

```bash
python layout-editor/server.py
```

浏览器会自动打开 `http://127.0.0.1:8765/`。如果端口被占用，会自动尝试 8766、8767 等。

停止：在启动窗口按 `Ctrl+C`，或直接关闭窗口。

## 编辑器怎么用

1. 左侧「上传透明图片」把素材加入美术资产库（支持 PNG、JPG、WebP、GIF、SVG、AVIF）。
2. 点击素材缩略图，把素材加入当前页面画布。
3. 拖动元素移动位置；选中后拖四角缩放；拖上方圆点旋转；方向键微调，`Shift` 加速。
4. 右侧「图层」调整上下层级（拖动排序）、隐藏、锁定、删除。
5. 右侧属性面板改文字、字号、颜色、透明度；没选中元素时改页面背景、尺寸、页面名。
6. 顶部标签切换 / 新建页面，每页布局独立、素材库共用。
7. 自动保存；也可以「导出项目」备份成 JSON，「导入项目」恢复（素材会一起打包）。
8. 「预览」进入全屏查看，底部可切换页面。

快捷键：`Ctrl+Z` 撤销，`Ctrl+Shift+Z` / `Ctrl+Y` 重做，`Ctrl+S` 立即保存，`Delete` 删除选中元素，`Esc` 取消选中 / 退出预览。

## 数据说明

- 排版工程保存在 `layout-editor/shared-data/current.json`，建议定期用「导出项目」备份。
- 上传的素材保存在 `layout-editor/assets/`，删除画布元素不会删除素材文件。
- 多个浏览器窗口打开同一地址时，会自动同步最新排版。

## 参考与署名

- 旋转木马结构参考 [Carousel Lamp](https://github.com/Daria1216/carousel-lamp) by 咕噜蛋Daria（仅限非商业使用，已在页面保留署名；许可证全文见 `licenses/carousel-lamp-LICENSE.txt`）。
- 暹罗厘普的角色图目前只作为配色和线条参考，没有直接嵌入带水印的原图；如果之后要使用角色贴纸 / 立绘，需要确认授权并提供无水印素材。
- 旅行页大标题字体：LXGW WenKai Lite（霞鹜文楷 Lite），SIL Open Font License 1.1；字体子集在 `site/assets/fonts/`，许可证见 `licenses/lxgw-wenkai-OFL.txt`。
- 开场视觉推进参考 Moooi 的 “A Life Extraordinary”（Build in Amsterdam）：分层图片、超大标题、门户转场和慢节奏音效；只借鉴机制，没有使用它的图片或代码。
- 用户提供的两张粉色信纸和 BLOOMING / Nature in Contrast 花卉画目前保留为备选素材，B 版写作 / 文章页已改用 CSS 奶油旧纸；正式发布前如需使用这些图片，请确认版权或替换成有授权的素材。
- 首页金线花卉、内页蝴蝶 / 樱花枝 / 信封 / 蕾丝垫为本项目原创 SVG，详见 [CREDITS.md](CREDITS.md)。

## 下一步

1. 换真实旅行数据：去过 / 最想去的省份、照片、文字、背景音乐。
2. 补 Coding 作品和文章的真实内容；把作品卡片链接换成可访问的项目地址。
3. 确认用户提供的信纸素材版权，或替换为有授权的纸张 / 扫描件。
4. 做一次真机检查（尤其是 390px 手机和触屏滚动），再考虑部署上线（GitHub Pages / Vercel / Netlify）。
