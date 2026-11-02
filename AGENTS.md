# 个人网站项目协作规则

## 适用范围

本目录及子目录中的个人网站项目（作品集 / 旅行地图 / 文章）。当前已有可本地运行的完整原型；首页与内页已统一为复古高级调性，真实内容和部分素材仍在替换中。

## 项目与文件

- 本地优先的静态网站，技术栈暂定原生 HTML / CSS / JS，动效使用 GSAP，地球使用 Three.js。
- 关键目录：
  - `site/`：网站源码
    - `index.html`：首页（深色法式烫金花卉封面 + 三个栏目入口）
    - `travel.html`：旅行地图游戏
    - `works.html`：Coding 作品（B 版博物图鉴图版）
    - `writing.html` / `article.html`：写作页信笺 / 图鉴纸页
    - `admin.html`：Git 内容管理后台（noindex，首页页脚有低调入口）
    - `content/site.json`：后台管理的个人资料 + 文章 + 旅行 + 作品内容（展示页读取）
    - `js/data.js`：旅行、作品、文章 fallback 数据
    - `js/home.js`：首页花卉分层视差
    - `js/profile.js`：首页姓名 / 标语 / 短句读取内容文件
    - `js/content-store.js`：展示页加载 `content/site.json`，失败时回退 `data.js`
    - `js/pages.js`：作品卡片（含可选封面）、文章详情、滚动入场和装饰视差
    - `js/carousel3d.js`：Three.js 3D 旋转木马场景
    - `js/writing-room.js`：写作页信纸卡片与鼠标分层视差
    - `js/admin.js` / `js/github-client.js`：后台交互与 GitHub Contents API
    - `css/home.css`：深色烫金花卉首页
    - `css/scrapbook.css`：作品 / 写作 / 文章的版式和卡片基础（底层）
    - `css/natural-history.css`：作品 / 写作 / 文章的深鼠尾草绿博物图鉴皮肤（当前生效）
    - `css/admin.css`：内容后台样式（不加载到展示页）
    - `css/carousel-skin.css` + `css/intro.css`：旅行木马皮肤和 Moooi 式开场
    - `css/fonts.css` + `assets/fonts/`：LXGW WenKai Lite 字体子集（OFL）
    - `assets/carousel/`：Carousel Lamp 官方木马贴图（非商业许可，保留署名）
    - `assets/images/home/floral-corner.svg`：首页金线花卉（原创）
    - `assets/images/travel/victorian-frame.svg`：旅行页四周维多利亚花卉 / 鎏金边框（原创）
    - `assets/images/natural-history/`：白百合、铃兰、天鹅、蕨类、鼠尾草蝴蝶（原创 SVG，当前内页使用）
    - `assets/images/scrapbook/`：旧手账版蝴蝶、樱花枝、蕾丝、信封等 SVG 装饰（部分仍作边缘装饰）
    - `assets/images/writing/`：用户提供的信纸 / 花卉参考素材（当前 B 版已不参与页面，保留备选；发布前确认版权）
    - `css/writing-room.css`：旧的深色写作室样式，已不在页面中引用，仅作历史备份
  - `layout-editor/`：本地排版编辑器，用来摆放素材、导出布局
  - `docs/`：方案、需求、参考、内容清单
  - `tools/`：生成插画等一次性脚本
  - `CREDITS.md` / `licenses/`：参考项目署名和许可
  - `PROJECT_MEMORY.md`：跨会话项目记忆
- 网站启动：双击 `start-site.bat`，或运行 `python -m http.server 8780 --directory site`，入口 `http://127.0.0.1:8780/`。
- 排版编辑器启动：双击 `layout-editor/start.bat`，或运行 `python layout-editor/server.py`，入口 `http://127.0.0.1:8765/`。
- 编辑器数据：`layout-editor/shared-data/current.json`；上传的素材：`layout-editor/assets/`。

## 新会话如何接手

1. 先读 `PROJECT_MEMORY.md` 的「当前快照」「当前有效决定」「制作与验收状态」「下一步边界」。
2. 用一句话复述当前进度和本次目标，再开始改动。
3. 新旧信息冲突时，以较新的用户确认和 `PROJECT_MEMORY.md` 为准；无法核实的信息标为「待确认」，不要编造。

## 执行方式与授权边界

- 改代码或素材前，先说明目标、影响范围和预期结果；用户确认范围后再动手。
- 不擅自重构、替换整站、删除素材或修改部署配置。
- 用户说「按这个来」「可以」视为对当前改动范围的确认；范围外的新需求先确认。
- 每次只做当前任务相关的改动，遵循现有风格，不顺手增加未要求的功能。

## 视觉系统（2026-10-22 起）

- 全站保持低饱和、柔和、复古高级，不做刺眼强对比。分两个模块：
  1. **首页**：深墨黑底、金线花卉从四角向中间生长、香槟金 / 米白花、中心留白、WenKai / 衬线大字；动效为标题分层入场、花卉慢浮动、鼠标视差。
  2. **内页（作品 / 写作 / 文章）**：当前为 B「博物图鉴」：深鼠尾草绿旧纸底、奶油色图版、暗金细线、白百合、铃兰、天鹅、蕨类、鼠尾草蝴蝶、老信纸 / 邮票 / 蕾丝。装饰只放页边或卡片边缘，不能盖住正文。2026-10-29 用户从三套预览中选定 B，浅裸粉手账方向不再作为当前视觉。
- 文字必须清楚可读；正文不使用低于 12px 的字号，次要文字也不要靠极低对比度制造“氛围”。
- 旅行页底色为暗茶褐 / 灰豆沙棕旧纸，四周用低透明度的维多利亚花卉 / 鎏金边框，星星为浅米金；木马内部保留深紫 / 金色细节。和首页同属复古高级调性，不再使用深蓝 / 深紫星空底。
- 首页入口的英文小字、内页的装饰标签可以很轻，但主要标题、正文、按钮、导航必须清楚。
- 动效优先级：慢、轻、分层；不使用突发弹跳、强烈闪烁或大范围位移。所有动效在 `prefers-reduced-motion` 下关闭。

## 修改规范

- 原生 HTML / CSS / JS，除非用户同意，不引入构建工具和框架。
- 样式用 CSS 变量管理配色、字体、间距；布局优先响应式。
- 尊重 `prefers-reduced-motion`，动效不能影响阅读。
- 内容后台是纯静态方案：GitHub Fine-grained Token 只放 `sessionStorage`；绝不把 Token 写入仓库、URL、日志或 localStorage。后台现在管理文章、作品、个人资料和旅行（省份状态 / 文案 / 多图）。
- 内容源：文章 / 个人资料 / 旅行 / 作品都在 `site/content/site.json`。写作页、文章页、首页、旅行页、作品页通过 `content-store.js` 读取，失败时回退 `data.js`。改后台时不要改展示页视觉与布局。
- 后台保存使用 GitHub Contents API；文章图片放 `site/assets/images/uploads/`，旅行照片放 `site/assets/images/travel/`，作品封面放 `site/assets/images/works/`（路径可通过后台设置调整）。上传前校验类型和大小。
- 后台页面必须保持 `noindex, nofollow`；管理入口只在首页页脚，低调显示。
- 不要为了后台登录引入前端密码校验；纯静态页面没有安全的密码后端。
- 图片放 `site/assets/` 或 `layout-editor/assets/`，文件名用英文 / 拼音 + 短横线，避免空格和中文路径。
- 不把大图 base64 写进 HTML，用文件引用。
- 交付前检查：本地打开无控制台报错；桌面 1440px 和手机 390px 宽度各看一遍。

## 完成标准

- 需求中的页面和交互可用；无横向滚动；文字不重叠、不溢出；图片有 `alt`。
- 键盘可操作，颜色对比度可读。
- 动效流畅，低性能设备不卡顿。

## 何时更新项目记忆

- 用户确认主题、视觉方向或页面结构后
- 完成一个页面或一个关键交互后
- 出现踩坑、返工或方案变更后
- 部署方式确定后

## 语言

- 与用户沟通、文档、注释使用中文；代码标识符用英文。
