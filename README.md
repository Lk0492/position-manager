# 仓位管理器

一个纯前端的加密货币仓位计算 PWA，使用 React 19、TypeScript 和 Vite。计算与历史记录全部在浏览器中完成，无账户、数据库或外部行情请求。

## 功能

- 账户风险预算、做多 / 做空仓位、保证金、真实杠杆、数量计算。
- 币安、OKX、Bybit、火币和独立手续费预设；支持自定义 Maker / Taker 费率（含零费率）。
- 自动生成目标盈亏比 3:1 的止盈价格，也可手动输入。
- 保本价格、净盈利、预估爆仓价格和七项风险检查。
- 币种添加、删除、点击使用、拖动排序；键盘 Alt + 左右方向键也可调整顺序。
- 最近 100 条计算历史、方向筛选、单条 / 批量删除和清空。
- Excel 导出保留「计算明细」「统计摘要」两个工作表。
- 手机布局、添加到主屏幕、PWA 离线计算与离线 Excel 导出。

## 本地开发

要求 Node.js 22.12+（本机使用 Node.js 24）。

```bash
npm ci
npm run dev
```

```bash
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

`tests/legacy.html` 是重构前的源码快照，仅用于测试，不会打包发布。回归测试直接运行旧版公式，比较多空方向、各费率预设和自定义费率的结果。

## 计算口径

```text
最大亏损金额 = 账户总额 × 最大亏损比例
实际止损成本% = 止损距离% + Taker 费率% × 2
名义仓位 = 最大亏损金额 ÷ (实际止损成本% / 100)
保证金 = 名义仓位 ÷ 杠杆
真实杠杆 = 名义仓位 ÷ 账户总额
预期净盈利 = 名义仓位 × 止盈距离% / 100 − 双边手续费
盈亏比 = 预期净盈利 ÷ 最大亏损金额
```

保留旧版以开仓名义仓位计算双边 Taker 手续费、以固定 0.5% 维持保证金率估算爆仓价的口径。未建模资金费率、滑点、交易所风险档位、全仓资产和精确成交数量步长；实际强平价格以交易所为准。

重构修复了：空止盈触发初始化错误、自定义 0 费率被默认值覆盖、低于 1 的价格自动止盈精度不足、非有限数字进入计算。普通价格的自动止盈仍沿用两位小数，极窄止损下四舍五入后不一定精确等于 3:1。

## 备案页脚配置

备案页脚是独立组件 `src/components/SiteFooter.tsx`，样式位于同目录的 `SiteFooter.module.css`。备案信息位于页面最底部居中，点击后在新标签页打开工信部备案网站。

集中配置位于 `src/config/site.ts`：

```ts
export const filingConfig = {
  enabled: true, // true：默认显示备案栏；false：全站关闭备案栏
  number: "桂ICP备2026024052号", // 如网站备案号带 -1 等后缀，在这里填写完整号码
  url: "https://beian.miit.gov.cn/",
};
```

修改配置后，执行 `./deploy/deploy.sh` 发布。关闭备案栏不影响工具原有页脚、计算或历史记录。已经打开的 PWA 需要接受页面上的新版本提示，才能使用新配置。

单次访问 / 分享可使用以下链接：

- 正常显示：`https://btc.imkai.xyz/`
- 隐藏备案栏：`https://btc.imkai.xyz/?filing=0`
- 恢复显示：去掉 `filing=0`，或访问 `https://btc.imkai.xyz/?filing=1`

链接参数只影响当前链接，不写入浏览器存储，也不改变其他访问者的默认显示。全站配置为 `enabled: false` 时，链接参数不能重新开启备案栏。隐藏只控制页面呈现，公开前端源码中的备案号仍可被查看。

## 数据兼容与迁移

继续使用旧版 `positionCalcHistory` 和 `positionSymbolList` 键及记录字段。同一浏览器、同一源（协议 + 域名 + 端口）的历史可直接读取。损坏的数据不会在启动时被空数组覆盖；读取失败时暂停写入，并显示提示。

**从 GitHub Pages 更换到自定义域名后，浏览器无法自动读取旧域名的 localStorage。** 请先在旧站导出 Excel 留档。当前 Excel 导出不提供导入恢复功能；需要继续使用原记录时，可通过浏览器开发者工具将旧站这两个键的 JSON 值复制到新站同名键，再刷新页面。

存储不可用或额度不足会显示提示。请定期导出重要记录；清理浏览器数据、隐私模式或更换设备可能导致记录丢失。

## 部署在本机

源码：`/root/position-manager`。

生产部署无需 Docker。Vite 构建静态文件，由一个使用 Node.js 标准库的轻量服务托管，systemd 管理开机启动与失败重启；Caddy 负责域名、压缩、反向代理和自动 HTTPS。

```text
https://btc.imkai.xyz
        ↓ Caddy :443
http://127.0.0.1:4178
        ↓ position-manager.service
/var/www/position-manager/current → releases/<发布版本>
```

初次安装 Caddy 后，以 root 执行：

```bash
npm ci
./deploy/deploy.sh
install -m 644 deploy/Caddyfile /etc/caddy/Caddyfile
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

已有其他 Caddy 站点时，应把 `deploy/Caddyfile` 中的站点块合并到现有配置。DNS 必须指向本机公网地址，TCP 80、443 必须可达。若使用 Cloudflare 代理，建议选择 SSL/TLS「完全（严格）」模式，避免「灵活」模式的重定向循环。不要设置缓存所有 HTML 或 Service Worker 的规则。

后续发布：

```bash
cd /root/position-manager
npm ci
npm test
./deploy/deploy.sh
```

发布脚本使用版本目录和原子软链接切换，保留旧版本用于回滚，并保留旧哈希资源供尚未更新的客户端使用。Service Worker 由构建生成，离线资源包含 Excel 模块；有更新时在页面提示，用户确认后刷新。

```bash
systemctl status position-manager caddy
journalctl -u position-manager -u caddy -n 80 --no-pager
ls -lt /var/www/position-manager/releases
```

回滚时，将 `current` 原子切换到指定旧版本，再重启服务：

```bash
ln -s /var/www/position-manager/releases/<旧版本> /var/www/position-manager/rollback.next
mv -Tf /var/www/position-manager/rollback.next /var/www/position-manager/current
systemctl restart position-manager
```

客户端已缓存新版时，需要接收对应的 Service Worker 更新；服务器回滚不会立即替换所有离线客户端的缓存。

## 目录结构

```text
src/theme.css         跟随系统的浅色/深色语义配色与高对比度适配
src/styles.css        基础布局与组件样式
src/appearance.css    参考 A 方案的字号、间距与响应式细节
src/components/       表单、结果、历史、PWA 更新提示
src/lib/calculator.ts 无界面依赖的计算公式、校验、风险检查
src/lib/storage.ts    兼容旧记录的本地存储
src/lib/export.ts     Excel 明细与摘要导出（按需加载）
public/               图标和原有静态图片
vite.config.ts        React 与 PWA 构建配置
tests/                旧版对照测试与浏览器端到端测试
deploy/               静态服务、systemd、Caddy 和发布脚本
```

## 外观与深色模式

页面默认用 `prefers-color-scheme` 跟随操作系统；顶部“外观”可手动选择浅色、深色或跟随系统。手动选择保存在 positionAppearance 中，首屏提前应用，刷新不闪回系统配色。`color-scheme: light dark` 让原生控件、下拉菜单和滚动条也使用系统外观；HTML 中分别声明浅色/深色浏览器栏颜色。标题与普通数值统一使用中性色，红绿仅用于风险和盈亏语义。主题色集中在 `src/theme.css`，组件禁止直接写浅色专用背景或字体颜色。

深色采用石墨色背景、分层卡片与更明亮的提示文字，输入框、警告、历史选中行、更新通知、页脚与图标均适配。`prefers-contrast: more` 提升边界和次要文字对比度。PWA manifest 的启动背景使用静态浅色兜底；部分系统的安装图标与启动屏显示由系统决定，页面载入后始终跟随当前系统配色。

验证包括两种配色下的桌面/手机显示、关键文字至少 4.5:1 对比度、选中与错误状态、系统实时切换时输入/历史保留，以及深色离线重载。浏览器测试入口：`npm run test:e2e`。

设计参考：

- [Apple Dark Mode 设计规范](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Apple 官网](https://www.apple.com/) 的中性色文字层级
- [MDN color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)

## 滚动与动态效果

保留浏览器原生的触摸、鼠标与惯性滚动。锚点导航使用 CSS smooth；下方模块通过 IntersectionObserver 在进入视口时播放 820ms、40px 的上移、轻微缩放和淡入，只动画 transform／opacity，不注册滚轮／touchmove 拦截，不运行逐帧布局测量。模块默认可见，首屏表单、滚动恢复、键盘聚焦、缺少观察器时均直接显示；主标题首次载入也有进场过渡；模块离开视口后重新进入会再次播放，完成后移除动画状态，不保留 will-change。系统启用“减少动态效果”时关闭进场及平滑锚点动画。

时间问候栏独立更新时钟，避免每秒使表单、计算结果和最多 100 条历史记录一起重新渲染。PWA 在返回页面、网络恢复及定时间隔检查更新，同一分钟内合并检查，发现新版后继续由用户点击“更新”，不会自动刷新未完成的输入。


版本号显示在页脚，便于确认当前页面是否已更新。/sw.js 返回 no-store，并添加 CDN-Cache-Control、Cloudflare-CDN-Cache-Control，避免更新入口被 CDN 当作普通 JS 缓存。若 CDN 有更高优先级的强制缓存规则，还需要调整该规则；部署后应检查公网响应头。
