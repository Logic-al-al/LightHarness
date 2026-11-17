# LightHarness 静态论文主页

英文项目主页，以 `_CVPR_27__LightHarness (3).pdf` 为内容依据。纯 HTML / CSS / JavaScript，无需 Node.js、构建工具、API 或后端，可直接部署到 GitHub Pages。当前仅完成本地制作，未发布到任何托管平台。

## 文件结构

```text
index.html          网页内容、作者、论文信息和下载入口
styles.css          桌面、平板、手机样式
app.js              场景切换、滑动对比、应用切换、图片放大
viewer3d.js          按需加载的双视窗 WebGL 3D 查看器
.nojekyll           关闭 GitHub Pages 的 Jekyll 处理
assets/             论文图像、网站图标、字体
assets/models/      30 份 GLB 及对应相机和模型元数据
assets/vendor/      随站点打包的 Three.js 及 MIT 许可证
downloads/         论文 PDF 和两份可编辑 Blender 场景
qa/                 本地截图、素材来源、场景验证和浏览器检查记录
tools/             本地素材准备、场景打包和浏览器验证脚本
```

`qa/`、`tools/` 无需上传。图片和脚本均使用相对路径，兼容 `https://用户名.github.io/lightharness/` 这样的项目站点。页面使用本地打包的 Linux Libertine 字体（常规、斜体、半粗体、粗体和粗斜体），不依赖在线字体或 CDN。字体来源及许可证位于 `assets/fonts/`。页眉、页脚和浏览器标签使用统一的深绿与金色光束矢量图标。

## 本地预览

在网页目录执行：

```bash
cd /data/luozt/lightharness-site
python -m http.server 8000 --bind 127.0.0.1
```

在同一台机器的浏览器访问 `http://127.0.0.1:8000`。如果代码在远程服务器，通过 SSH 转发端口：

```bash
ssh -L 8000:127.0.0.1:8000 用户名@服务器地址
```

然后在本机打开上述地址。图片部分可直接双击 `index.html` 浏览；**交互 3D 必须通过 HTTP 服务器打开**，不要使用 `file://`。浏览器需支持 WebGL 2，建议开启硬件加速。

## GitHub Pages 部署（推荐：分支根目录）

1. 在 GitHub 新建仓库，例如 `lightharness`。使用 GitHub Free 时选择 **Public**。如果使用下面的 Git 命令，创建空仓库，不勾选自动添加 README。
2. 把本站文件推送至该仓库。下面的 `YOUR_USERNAME` 必须替换为你的 GitHub 用户名：

```bash
cd /data/luozt/lightharness-site

git init -b main
git add index.html styles.css app.js viewer3d.js assets downloads .nojekyll .gitignore README.md
git commit -m "Add LightHarness project website"
git remote add origin https://github.com/YOUR_USERNAME/lightharness.git
git push -u origin main
```

第一次推送需使用你已配置的 GitHub 登录方式，例如凭证管理器、PAT 或 SSH。以上命令只初始化网站目录；不要在 `/data/luozt` 或论文实验目录执行。

3. 打开仓库 **Settings → Pages**。
4. 在 **Build and deployment → Source** 选择 **Deploy from a branch**。
5. **Branch** 选择 **main**，目录选择 **/(root)**，点击 **Save**。
6. 等待仓库 **Actions** 中的 Pages 部署成功，在 Pages 设置中点击 **Visit site**。项目地址通常为：

```text
https://YOUR_USERNAME.github.io/lightharness/
```

GitHub 文档说明推送后的发布可能需要最多约 10 分钟。后续更新只需要提交并推送：

```bash
git add index.html styles.css app.js viewer3d.js assets downloads README.md
git commit -m "Update project page"
git push
```

此方案不需要自定义 GitHub Actions 工作流。

官方文档：
- [创建 GitHub Pages 站点](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [配置发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

请解压交付的 `lightharness-github-pages.zip`，然后使用上面的 **Git 推送流程**。新增 3D 模型中有文件超过 GitHub 网页上传的 25 MiB 限制；所有单个文件均小于普通 Git 的 100 MiB 上限，因此无需 Git LFS。Git 可能对超过 50 MiB 的文件提示警告，但仍允许推送。不要将模型改为 LFS 指针文件后直接发布。参见 [GitHub 大文件说明](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)。确保 `index.html` 位于仓库根目录，`.nojekyll` 与 `viewer3d.js` 一起提交。

## 内容和素材对应关系

- 标题、三位作者、单位与联系邮箱：PDF 第 1 页。
- 两个场景与白模、几何、材质、重打光和插入编辑：Figure 1。
- 方法图及可展开的几何、材质、光照证据：Figure 3。
- 六组重建结果与四个基线：Figure 4。特别核对了原论文的列顺序：Input、Ours、3DCodeVerse、GPT-6-Sol、VIGA、SceneRig。
- 难例与消融图：Figures 5–6。
- 纹理编辑、反射、投影和物体插入：Figures 7–10。
- 定量数据：Table 1。SSIM 最优属于 VIGA，网页表格保留这一事实。
- 局限性：Figure 11。
- 页面区分了 Blender 直接渲染、GPT-Image 直接编辑和 GPT-Image 后处理结果。

`qa/asset-provenance.json` 记录每张图片在 PDF 中的页码、对象编号或裁剪区域。`qa/scene-image-matches.json` 记录论文首图与本地场景渲染的缩略图匹配结果；八个渲染版本均找到了高度一致的本地结果。

下载区的两份 `.blend` 对应 Figure 1 中半闭合百叶和水晶球案例。已使用 Blender 4.5.14 打开、压缩并重新打开验证。场景的材质、几何、灯光和相机保留，渲染输出路径改为下载文件旁的 `renders/`，避免写回原实验路径。源场景文件未修改；哈希和处理记录保存在 `qa/blend-validation.json`。本次验证没有重新执行高采样渲染。

首图、二维对比和应用展示切换预渲染图片；新增 3D 部分使用从 `.blend` 导出的真实 GLB 几何，由浏览器 WebGL 实时绘制，不在浏览器运行 Blender。

## 修改入口

- 标题、作者、单位、链接、结果表：`index.html`。
- 品牌色、字体、间距、手机布局：`styles.css` 顶部变量与媒体查询。
- 场景编辑文案和应用切换：`app.js` 中的 `sceneData`、`comparisons`、`applicationData`。
- 后续有正式 arXiv / 代码仓库地址时，在 `index.html` 的 `hero-actions` 增加对应真实链接。当前没有虚构代码链接、会议录用信息或引用条目。

## 检查结果

已在 Chromium 中检查两个首图场景的 10 个状态、6 组重建 × 4 个基线、4 组应用、放大对话框与键盘关闭、滑块键盘操作，以及 PDF / Blender 下载链接。375、390、768、1440 像素宽度无横向溢出。测试使用 `/lightharness-site/` 子目录，检查 GitHub Pages 项目路径兼容性。

检查详情见 `qa/browser-report.json`；桌面和手机截图见 `qa/`。部署前端本身不需要运行 `tools/` 中的素材和检查脚本。


## 交互式 3D 场景

本地运行服务器后打开 `http://127.0.0.1:8000/#interactive-3d`，选择场景和对比方法，点击 **Load interactive 3D**。网页首次打开不会加载 GLB；只在点击后下载当前选中的两个模型。

覆盖论文 Figure 4 的六组场景，每组包含 **LightHarness、3DCodeVerse、GPT-6-Sol、VIGA、SceneRig**，共 30 份实际场景模型：

| 论文行 | 网页场景 | 源场景标识 |
| --- | --- | --- |
| 1 | Backlit desk | baid_input_0000 |
| 2 | Bedside lamps | fivek_a4791-Duggan_090131_4873 |
| 3 | Large interior | hypersim_ai_047_008_frame0087 |
| 4 | Mixed-lighting room | luxremix_014684_0000_front |
| 5 | Striped-shadow bedroom | hypersim_ai_051_003_frame0005 |
| 6 | Outdoor animals | fivek_a4942-kme_0895 |

我们的源文件均来自 `/data/luozt/LightProxy/exp_1113_1445_rule/runs/`，其中第 3、4 组来自 `batch_six_10rounds`，其余来自 `batch25_autodl_p25_20261115_150058`。基线来自 `/data/luozt/LightProxy/reproduced_results/` 下的对应方法目录，按论文图片及 `comparison_vis_manifest.csv` 匹配。完整路径和 SHA-256 在本地 `qa/model-provenance.csv` / `.json` 中。

第 5 组的我们方法与本地最终场景结构对应，但论文图与本地渲染存在颜色差异（64×48 RGB 缩略图 MAE 约 21.862）；其它 29 个对应渲染的同一指标均小于 1。网页二维区域保留 PDF 原图，3D 区域加载对应的本地 `.blend` 几何，未把两者当作像素一致的结果。

操作：

- 拖动旋转、滚轮缩放、右键拖动平移；触屏使用单指旋转、双指缩放/平移。
- 聚焦任一画布后，左右方向键旋转，`+` / `-` 缩放。
- **Link navigation** 联动两侧相对视角，按各方法的原相机坐标和自身尺度映射。各方法不共享世界坐标，不代表严格配准后的同一相机。
- **Materials / White model / Wireframe** 切换材质、白模和线框。
- **Cutaway** 隐藏从物体名称识别的墙壁与天花板，方便查看室内。
- **Reference cameras** 恢复各自保存的相机；**Frame scenes** 显示场景整体；`−15° / +15°` 改变附近视角。
- 每侧提供当前 GLB 下载链接；展开 **Reference image & paper renderings** 可查看输入图及论文中的结果。

### 实时预览的范围

WebGL 使用统一的中性环境光及近似 PBR 材质。没有在浏览器复现 Cycles 的原始灯光传输、程序化材质、复杂阴影或折射效果。对于可识别的程序化色带与混色，使用近似底色；其余不支持的节点按 glTF 导出结果显示。论文光照比较应以保留的原始渲染为准。

为控制网页成本，对复杂模型限制细分、按需减面并将过大贴图限制到 1024；具体调整逐模型记录在元数据中。浏览器将大量静态小物体按材质合并绘制，保留位置和可切除分组，减少绘制调用。所有处理均在内存或新导出文件上执行，未保存或覆盖源 `.blend`。

模型文件采用自包含 GLB，没有外部纹理路径。总模型体积约 240 MiB，最大单文件约 66 MiB；访客仅加载选定的模型。Three.js 固定为 0.180.0，本地随站点提供，不依赖运行时 CDN。

### 验证记录

`qa/viewer3d-browser-report.json`：已在 Chromium 中实际绘制全部 30 个模型，对 24 组双视窗组合逐一检查；验证指针与键盘导航、联动/独立导航、白模/线框、快速切换、恢复相机、响应式画布。375 / 390 / 768 / 1440 像素宽度无横向溢出，无 JavaScript 异常或 HTTP 错误。

`qa/viewer3d-recovery-report.json`：注入模型下载失败，检查错误提示、图片回退及切换回已加载模型后的恢复。

`qa/model-provenance.json`：源文件映射、哈希、论文图片匹配结果、GLB 体积与转换记录。`assets/models/*.json` 保存网页实际使用的相机参数、场景范围与可切除物体列表。
