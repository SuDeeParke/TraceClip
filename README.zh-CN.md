# traceClip

[English](./README.md) | [中文](./README.zh-CN.md)

traceClip 是一个 Chrome Performance Trace 切片工具。
它可以从大型 trace 中裁出一个更聚焦的时间窗口，保持结果可被 Chrome trace 查看器重新导入，并额外生成一个便于快速查看热点的 summary sidecar。

## 功能概览

- 按时间窗口切片 Chrome trace
- 保持输出可被 Chrome trace 查看器导入
- 生成带热点行的 summary sidecar
- 在 Web UI 中预览 summary 行
- 按事件 category 和 event name 过滤
- 同时支持 `ms` 和 `us` 单位的 trace

## 项目结构

- `slice-trace.js` — 核心切片 CLI 与 summary 生成逻辑
- `server.js` — 本地 Express 服务与 API
- `src/` — React + Vite 前端演示界面
- `raw/` — 本地测试用样例 trace
- `test/` — 回归测试

## 环境要求

- Node.js 18+
- npm

## 安装

```bash
npm install
```

## 启动应用

启动本地服务：

```bash
npm run dev
```

然后打开：

```text
http://127.0.0.1:3000
```

## 运行测试

```bash
npm test
```

## 构建前端

```bash
npm run client:build
```

## CLI 用法

直接运行切片器：

```bash
npm run slice -- --input raw/sample-basic.json --output output/frame.json --start 1000 --end 1016.666
```

或者直接用 Node：

```bash
node slice-trace.js --input raw/sample-basic.json --output output/frame.json --start 1000 --end 1016.666
```

### CLI 参数

- `--input` — 输入 trace JSON
- `--output` — 输出切片文件路径
- `--start` — 切片起始时间，单位毫秒
- `--end` — 切片结束时间，单位毫秒
- `--duration` — `--end` 的替代写法
- `--cat` — 逗号分隔的 category 过滤条件
- `--name` — 逗号分隔的事件名过滤条件

CLI 会输出：
- 一个切片后的 trace JSON
- 一个与输出文件同目录的 `.summary.json` sidecar

## Web UI 工作流

这个 Web demo 面向第一次接触项目的使用者：

1. 上传一个 Chrome trace JSON 文件
2. 查看自动识别出的 trace range
3. 以相对 trace 起点的方式填写 `Start at (ms)` 和 `End at (ms)`
4. 如有需要，从多选列表中选择 category 和 name 过滤条件
5. 执行切片
6. 下载切片 trace 和 summary
7. 在页面中查看 summary preview 表格

## API

### `POST /api/trace-metadata`

接收一个包含 `file` 字段的 multipart form data，并返回：

- 识别出的 trace range
- 内置的 category/name 选项
- 从 trace 动态提取的 category/name 选项

### `POST /api/slice`

接收以下 multipart form data：

- `file`
- `start`
- `end` 或 `duration`
- 可选 `cat`
- 可选 `name`

返回：

- 输入/输出事件数量
- 相对时间语义下的 start/end/duration
- 识别出的 trace unit
- 带 token 的下载地址
- summary preview 行

### `GET /api/download/:token`

通过单次有效 token 下载生成的产物。

## 说明

- 服务默认仅监听本地：`127.0.0.1:3000`
- 上传大小限制为 100 MB
- API 中单次切片时长限制为 60,000 ms
- 下载地址使用短时有效的 token

## 样例文件

你可以直接用 `raw/` 下的样例 trace 测试，例如：

- `raw/sample-basic.json`
- `raw/sample-array.json`
- `raw/sample-webgl.json`

## License

ISC
