# 手机使用检测 - 小程序

## 项目概览

微信小程序 + 云开发，帮助用户记录7天手机使用情况并生成分析建议。

## 目录结构

```
cloudfunctions/cloudUserInfo/   -- 云函数（wx-server-sdk）
miniprogram/
  pages/
    welcome/       -- 入口页：登录 + 7天打卡进度
    usage-form/    -- 每日使用情况填写表单
    history/       -- 历史记录汇总
    index/         -- 云开发模板页（未启用）
    example/       -- 示例页（未启用）
  components/
    advice-modal/  -- 分析结果弹窗
    cloudTipModal/ -- 云开发提示弹窗
  app.js           -- 全局入口（含 env 配置）
  app.json         -- 页面注册
```

## 开发命令

- 根目录无 `package.json`，没有统一的 npm build/test 命令。主要开发流程是用微信开发者工具打开项目根目录。
- `cloudfunctions/cloudUserInfo/package.json` 只有模板占位 `npm test`，会输出 `Error: no test specified` 并失败，不要把它当作有效测试。
- 微信开发者工具项目配置：`project.config.json` 中 `miniprogramRoot = miniprogram/`、`cloudfunctionRoot = cloudfunctions/`。
- 部署云函数通常在微信开发者工具中操作。`uploadCloudFunction.sh` 仍有 `${installPath}`、`${envId}`、`${projectPath}` 占位，并且部署名是模板的 `quickstartFunctions`，而业务前端调用的是 `cloudUserInfo`。

## 架构要点

- **周期固定为 7 天**，定义在 `miniprogram/app.js` 的 `globalData.period = 7`。
- **实际注册页面**：`welcome`、`usage-form`、`history`。`index`、`example` 目录是云开发模板页，当前未在 `miniprogram/app.json` 注册。
- **数据流**：入口页读取进度 → 表单页提交 `wx.cloud.callFunction({ name: 'cloudUserInfo', type: 'analyzeUsage' })` → 云函数写入 `usageRecords` 集合 → 返回评分与建议 → `advice-modal` 展示结果。
- **云函数集合**：`usageRecords`（业务使用记录含得分）、`users`（模板用户信息）、`solutions`（云开发模板遗留）。
- 所有业务数据访问都应通过 `wx.cloud.callFunction` 走云函数；不要在 active pages 中新增前端直连数据库逻辑。

### 云函数类型（`event.type`）
| type | 功能 |
|---|---|
| `getOpenId` | 获取当前用户 openid |
| `getCheckinProgress` | 查询已填写记录与当前进度 |
| `analyzeUsage` | 保存记录 + 评分 + 生成建议（最后一天汇总） |

`cloudfunctions/cloudUserInfo/index.js` 还保留了 `userInfo`、`createCollection`、`selectRecord`、`updateRecord`、`insertRecord`、`deleteRecord` 等模板 CRUD 分支，通常不属于本项目业务改动范围。`getMiniProgramCode` 在 switch 中存在，但当前文件内没有对应函数定义，调用会出错。

### 评分逻辑（`analyzeUsage` 内）
- 初始 100 分，根据社交娱乐/游戏/视频/购物时长扣分
- `score >= 85`：优秀 | `>= 70`：良好 | `>= 55`：一般 | 其他：需改进

## 关键约定

- `wx.cloud` 最低基础库 2.2.3；本地 `project.private.config.json` 可能覆盖为更高基础库版本。
- 云环境 ID 当前硬编码在 `miniprogram/app.js` 的 `globalData.env`；`miniprogram/envList.js` 为空模板配置，不是当前运行时来源。
- **表单字段**（`usage-form/index.js`）：`weekdayHours`、`weekendHours`、`socialHours`、`workHours`、`gameHours`、`videoHours`、`shopHours`
- 主导航栏颜色 `#667eea`，按钮渐变 `#667eea → #764ba2`
- 页面样式以移动端 WXSS 和 `rpx` 为主，沿用圆角卡片、渐变 header/button 的现有视觉语言。
- 组件事件参考 `miniprogram/components/advice-modal/`：属性接收展示数据，通过 `close`、`retry`、`finish` 事件回传页面。
- 目标登录流程是 `wx.getUserProfile` → `cloudUserInfo(type:getOpenId)` → 缓存 openid 到 `app.globalData`，但当前 `welcome.goToForm` 走的是 `wx.login` + “模拟登录成功”并直接跳转，可能导致 `app.globalData.openid` 仍为空。

## 注意点

- `README.md` 是云开发模板生成的通用文件，不描述本项目实际功能
- 精确行为以源码为准：`miniprogram/pages/usage-form/` 是表单提交与校验主入口，`cloudfunctions/cloudUserInfo/index.js` 是评分和建议逻辑主入口，`miniprogram/pages/history/` 复用进度查询做历史汇总。
- `cloudUserInfo` 中遗留了 `solutions` 集合的 CRUD 操作（来自模板），非业务所需
- `analyzeUsage` 返回值包含 `adviceList[]`、`summary`、`score`、`isFinal`，在前端 `advice-modal` 组件中渲染。
- `analyzeUsage` 会先新增记录再按 `{ openid, day }` 更新最近记录；重复提交同一天可能产生重复记录，改动历史或进度逻辑时要留意。
