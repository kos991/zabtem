# Zabbix 7.0 桌面端模板生成器实施计划

**目标:** 自研一个 Windows / Linux 桌面端工具，从 MIB + 在线 SNMP WALK + 人工审核生成中文 Zabbix 7.0 LTS YAML 模板。第一阶段正式交付 Windows x86_64 与 Linux x86_64，ARM64 作为兼容验证与后续正式发布目标。

**架构:** Electron 负责桌面端壳、本地文件、SNMP 调用和 SQLite；React 负责 UI；核心解析、匹配、分类、中文化、YAML 生成拆成可复用包。第一阶段只做交换机物理层模板，后续再扩展物理服务器、安全设备、数据库。

**仓库:** https://github.com/kos991/zabtem.git

**强制规则:** 代码生成、模板生成验证、测试验证、构建验证必须在 GitHub Actions 中执行并留下可追溯日志；本地运行只作为开发调试，不能作为完成或发布依据。一键 `goal` 正式只认 GitHub Actions 的 `.github/workflows/goal.yml` 结果。

**技术栈:** Electron、React、TypeScript、Vite、SQLite、Node net-snmp、YAML、electron-builder、pnpm。

---

## 1. 产品边界

第一阶段做：

- Windows x86_64 与 Linux x86_64 桌面端正式交付；Linux ARM64 / Windows ARM64 做兼容验证。
- 交换机项目管理。
- SNMP v2c/v3 连接配置。
- 在线测试连接。
- 在线 SNMP WALK / BULK WALK。
- 导入已有 snmpwalk 文本。
- 加载本地 MIB 文件或目录。
- 解析 walk 和 MIB。
- OID 匹配。
- 交换机指标分类。
- 中文名称建议。
- 用户审核候选监控项。
- 生成 Zabbix 7.0 LTS YAML。
- 导出 YAML 文件。

第一阶段不做：

- Cloudflare 部署。
- 云端账号体系。
- 在线共享模板库。
- Trap 监听。
- SNMP SET。
- 数据库模板。
- 安全设备模板。
- 物理服务器 Redfish/IPMI 模板。
- 直接 Zabbix API 导入。

---

## 2. my-mibbrowser 参考边界

参考项目：

```text
https://github.com/YangZhiqiang98/my-mibbrowser
```

可参考：

- Electron + React 桌面形态。
- MIB 树浏览交互。
- OID 搜索。
- SNMP Profile 管理。
- GET/WALK/BULK WALK 操作流。
- Table Viewer 思路。
- Debug Logs 思路。

不要做：

- 不 fork。
- 不复制代码。
- 不复用 GPL-3.0 源码。
- 不把第一版做成通用 MIB Browser。

原因：

- 我们的核心产品是 Zabbix 模板生成器。
- GPL-3.0 代码会影响后续闭源或商业分发。
- 第一阶段需要少做功能，把模板生成链路跑通。

---

## 3. 推荐目录结构

```text
apps/
  desktop/
    package.json
    electron-builder.yml
    src/
      main/
        index.ts
        ipc/
          project-ipc.ts
          snmp-ipc.ts
          mib-ipc.ts
          template-ipc.ts
        snmp/
          snmp-client.ts
          snmp-profile-store.ts
        storage/
          database.ts
          migrations.ts
        project/
          project-store.ts
        zabbix/
          template-exporter.ts
      preload/
        index.ts
      renderer/
        main.tsx
        App.tsx
        pages/
          ProjectListPage.tsx
          ProjectCreatePage.tsx
          ProjectWorkspacePage.tsx
        features/
          snmp/
          mib/
          candidates/
          template-preview/
        components/
        styles/
      shared/
        types/
          project.ts
          snmp.ts
          mib.ts
          candidate.ts
          zabbix.ts

packages/
  core/
    src/
      walk-parser/
      mib-parser/
      oid-matcher/
      cn-dictionary/
      zabbix-yaml-builder/
      template-model/
  modules/
    switch/
      src/
        classifier.ts
        normalizer.ts
        trigger-rules.ts
        switch-template-builder.ts
    server-hardware/
      README.md
    security-device/
      README.md
    database/
      README.md

tools/
  bundled-snmp-tools/

docs/
  plans/
```

---

## 4. 数据库表

本地 SQLite 表：

```text
projects
snmp_profiles
mib_files
walk_runs
walk_entries
mib_objects
oid_matches
metric_candidates
cn_mappings
template_versions
app_settings
```

### projects

- id
- name
- device_type
- vendor
- model
- role
- zabbix_version
- created_at
- updated_at

### snmp_profiles

- id
- project_id
- name
- host
- port
- version
- community_encrypted
- v3_user
- v3_security_level
- v3_auth_protocol
- v3_auth_password_encrypted
- v3_priv_protocol
- v3_priv_password_encrypted
- timeout_ms
- retries
- bulk_size

### walk_runs

- id
- project_id
- profile_id
- root_oid
- mode
- status
- started_at
- finished_at
- raw_file_path
- error_message

### walk_entries

- id
- walk_run_id
- oid
- base_oid
- index_value
- value_type
- raw_value
- display_value

### mib_files

- id
- project_id
- file_path
- file_name
- module_name
- status
- error_message
- loaded_at

### mib_objects

- id
- project_id
- module_name
- object_name
- oid
- syntax
- access
- status
- description
- enum_json
- source_file

### metric_candidates

- id
- project_id
- oid
- base_oid
- index_pattern
- category
- object_name
- english_name
- chinese_name
- unit
- generation_mode
- enabled
- trigger_enabled
- trigger_severity
- trigger_rule_json
- tags_json
- source

### template_versions

- id
- project_id
- version_number
- template_name
- yaml_file_path
- summary_json
- created_at

---

## 5. 模块任务

### Task 1: 建桌面端项目骨架

创建：

- Electron main/preload/renderer。
- React + Vite。
- TypeScript。
- 基础路由。
- 空白首页。
- 健康检查 IPC。

验收：

- `npm run dev` 能启动桌面端。
- Renderer 能调用 preload 暴露的 `app.getVersion()`。
- Electron 安全配置启用 `contextIsolation`，关闭 `nodeIntegration`。

### Task 2: GitHub Actions 一键 goal 验证与生成流水线

创建：

- `.github/workflows/goal.yml`。
- `workflow_dispatch` 输入：`verify`、`generate-template`、`build`、`full`。
- 默认 goal：`full`。
- `template-generation` job。
- `build-desktop` job。
- Actions 产物上传规则。
- `fixtures/snmpwalk/` 脱敏 walk 样例。
- `fixtures/mib/` 自制测试 MIB。
- `fixtures/expected/` 期望 YAML 样例。

强制规则：

- 代码生成、Zabbix YAML 模板生成、测试验证、构建验证必须在 GitHub Actions 中执行。
- 一键 `goal` 正式只认 GitHub Actions 结果；本地 `pnpm` 命令只作为开发调试。
- pull request 至少执行 verify：lint、typecheck、unit tests、parser samples、YAML builder samples。
- `full` 执行 verify、generate-template、build，并上传 YAML 样例、测试报告、桌面端安装包 artifacts。
- goal 默认不创建 GitHub Release；只有后续 tag 发布流程才创建 Release。
- main 分支执行完整测试矩阵，并产出 Windows x86_64 / Linux x86_64 构建产物。
- Linux ARM64 / Windows ARM64 先作为 experimental job，可以允许非阻塞失败；稳定后改为必过。

验收：

- GitHub Actions 能在 `https://github.com/kos991/zabtem.git` 仓库运行。
- 每次关键变更都有可追溯 run 日志。
- 模板生成样例在 Actions 中产出 YAML artifact，并通过离线结构校验。
- Windows x86_64 与 Linux x86_64 build job 能上传安装包或便携包 artifact。

### Task 3: 建 monorepo 包结构

创建：

- `packages/core`。
- `packages/modules/switch`。
- 共享 TypeScript 类型。
- 单元测试框架。

验收：

- `core` 能被桌面端引用。
- `switch` 模块能引用 `core` 的模板模型。
- 测试命令能运行。

### Task 3: SQLite 本地存储

实现：

- 数据库初始化。
- migrations。
- project CRUD。
- snmp_profile CRUD。
- template_versions CRUD。

验收：

- 第一次启动自动创建数据库。
- 新建项目后重启仍存在。
- 数据库文件位置可在设置中查看。

### Task 4: 项目列表和新建项目 UI

实现页面：

- 项目列表。
- 新建项目。
- 项目工作台。

验收：

- 能创建交换机项目。
- 能打开项目。
- 能删除项目。
- 设备类型第一版固定为交换机。

### Task 5: SNMP Profile 管理

实现：

- v2c 表单。
- v3 表单。
- timeout/retry/bulk size。
- 密码脱敏显示。
- 本地保存。

验收：

- 能保存多个 profile。
- 切换项目时只显示当前项目 profile。
- 日志不打印 community 或密码。

### Task 6: SNMP 测试连接

实现：

- 读取 `1.3.6.1.2.1.1.1.0` sysDescr。
- 读取 `1.3.6.1.2.1.1.5.0` sysName。
- 返回耗时、错误、原始值。

验收：

- 连接成功显示设备描述。
- 连接失败显示明确错误。
- 超时不会卡死 UI。

### Task 7: 在线 WALK 采集

默认 root OID：

```text
1.3.6.1.2.1
1.3.6.1.4.1
1.3.6.1.2.1.1
```

实现：

- WALK。
- BULK WALK。
- 进度日志。
- 停止采集。
- 保存原始结果。
- 保存结构化 entries。

验收：

- 能采集标准树。
- 能采集企业树。
- 大量返回时 UI 不冻结。
- 采集失败能保留已完成结果。

### Task 8: snmpwalk 文本导入

支持格式：

```text
.1.3.6.1.2.1.1.1.0 = STRING: H3C Switch
1.3.6.1.2.1.2.2.1.8.1 = INTEGER: 1
iso.3.6.1.2.1.2.2.1.8.1 = INTEGER: up(1)
IF-MIB::ifOperStatus.1 = INTEGER: up(1)
```

验收：

- 能导入 Windows helper 生成的文件。
- 能解析 numeric OID。
- 对非 numeric OID 做最佳解析，无法解析时提示。

### Task 9: walk-parser

实现标准化：

```json
{
  "oid": "1.3.6.1.2.1.2.2.1.8.1",
  "baseOid": "1.3.6.1.2.1.2.2.1.8",
  "index": "1",
  "type": "INTEGER",
  "value": "1",
  "displayValue": "up"
}
```

测试覆盖：

- STRING。
- INTEGER。
- INTEGER enum。
- Counter32。
- Counter64。
- Gauge32。
- Timeticks。
- Hex-STRING。
- No Such Object。
- No Such Instance。

验收：

- parser 单测通过。
- 错误行不影响整文件解析。
- 输出包含 warnings。

### Task 10: MIB 文件加载和轻量解析

解析：

- OBJECT IDENTIFIER。
- OBJECT-TYPE。
- SYNTAX。
- MAX-ACCESS。
- STATUS。
- DESCRIPTION。
- 简单 enum。
- 表结构线索。

验收：

- 能加载单个 MIB。
- 能加载目录。
- 能显示缺失依赖。
- 能提取 object name、oid、syntax、description、enum。

### Task 11: OID matcher

规则：

- walk 中 `.0` 标量匹配 MIB 对象。
- 表格列按最长前缀匹配。
- MIB 有但 walk 没有的默认不生成。
- walk 有但 MIB 没有的进入 unknown。

验收：

- IF-MIB 常见项能匹配。
- 厂商私有 OID 无 MIB 时保留。
- 匹配结果可追溯来源。

### Task 12: 交换机分类器

分类：

- system
- interface
- power
- fan
- temperature
- board
- stack
- optical
- error
- discard
- cpu
- memory
- unknown

验收：

- `ifOperStatus` 分类为 interface。
- `ifInErrors` 分类为 error。
- `ifOutDiscards` 分类为 discard。
- `fanStatus` 分类为 fan。
- `powerStatus` 分类为 power。
- `rxPower` / `txPower` 分类为 optical。
- 无法判断的私有 OID 保持 unknown。

### Task 13: 中文字典

实现：

- 全局字典。
- 厂商覆盖。
- 型号覆盖。
- 用户编辑后保存。
- fallback 命名。

基础映射：

```text
ifDescr -> 接口描述
ifName -> 接口名称
ifAlias -> 接口别名
ifOperStatus -> 接口运行状态
ifAdminStatus -> 接口管理状态
ifInErrors -> 入方向错误包
ifOutErrors -> 出方向错误包
ifInDiscards -> 入方向丢弃包
ifOutDiscards -> 出方向丢弃包
temperature -> 温度
fanStatus -> 风扇状态
powerStatus -> 电源状态
rxPower -> 接收光功率
txPower -> 发送光功率
voltage -> 电压
current -> 电流
```

验收：

- 已知项自动中文化。
- 用户修改后同项目复用。
- 不翻译 OID、key、宏、表达式。

### Task 14: 指标候选审核 UI

表格列：

- 启用。
- 分类。
- OID。
- 对象名。
- 中文名。
- 类型。
- 示例值。
- 单位。
- 生成方式。
- 触发器。
- 严重级别。

验收：

- 支持筛选 unknown。
- 支持批量启用/禁用。
- 支持编辑中文名。
- 支持修改分类、单位、触发器级别。
- 修改保存到 SQLite。

### Task 15: Zabbix 7.0 YAML builder

生成：

- Template group。
- Template。
- Macros。
- Value maps。
- Items。
- Discovery rules。
- Item prototypes。
- Trigger prototypes。
- Tags。

验收：

- YAML 语法正确。
- item key 不重复。
- discovery rule 引用合法。
- trigger expression 引用存在 item。
- 能被 Zabbix 7.0 测试环境导入。

### Task 16: YAML 预览、版本、导出

实现：

- 生成预览。
- 统计数量。
- 保存版本。
- 导出 YAML。
- 打开导出目录。

验收：

- 同一项目多次生成版本递增。
- 能下载指定历史版本。
- 导出文件名包含 vendor/model/version。

### Task 18: 跨平台打包

实现：

- Windows x86_64 NSIS 安装包。
- Linux x86_64 AppImage / deb 包。
- Windows portable 包可选。
- Linux ARM64 / Windows ARM64 experimental 构建配置。

验收：

- 自动创建应用数据目录。
- Actions 上传 Windows x86_64 / Linux x86_64 正式构建产物。
- 新机器安装可启动。
- Linux x86_64 包安装或运行可启动。
- 数据库正常创建。

- 导入 MIB/walk 正常。

### Task 19: 文档和样例

创建：

- 快速开始。
- SNMP v2c 配置说明。
- SNMP v3 配置说明。
- MIB 加载说明。
- YAML 导入 Zabbix 7.0 说明。
- 常见错误排查。

验收：

- 一个 Windows 或 Linux 运维人员能按文档完成一次模板生成。

---

## 6. 测试策略

单元测试：

- walk-parser。
- mib-parser。
- oid-matcher。
- switch-classifier。
- cn-dictionary。
- zabbix-yaml-builder。

集成测试：

- 导入 walk 文件。
- 导入 MIB 文件。
- 生成候选项。
- 导出 YAML。

手工测试：

- Windows 桌面端启动。
- Linux 桌面端启动。
- SNMP 测试连接。
- WALK 真实交换机。
- Zabbix 7.0 导入 YAML。
- 模板挂载到测试主机后发现项正常。

GitHub Actions 强制验证：

- 所有 parser、matcher、classifier、YAML builder 测试必须在 Actions 通过。
- 模板生成样例必须在 Actions 中执行并上传 YAML artifact。
- Windows x86_64 / Linux x86_64 构建必须在 Actions 通过并上传产物。
- ARM64 experimental job 先保留日志和产物，稳定后纳入必过矩阵。

---

## 7. 风险控制

MIB 风险：

- 允许部分解析成功。
- 展示 warnings。
- unknown 不默认导出。

SNMP 风险：

- 支持停止 walk。
- BULK WALK 失败回退 WALK。
- 超时不阻塞 UI。

Zabbix 风险：

- YAML builder 单独测试。
- 导出前做内部一致性校验。
- 第一版少生成，先保证可导入。

安全风险：

- 日志脱敏。
- 密码加密保存。
- 项目导出时提示敏感信息。

许可证风险：

- 不复制 GPL-3.0 代码。
- 不内置厂商 MIB。
- 第三方依赖出许可证清单。

---

## 8. 第一阶段里程碑

### Milestone 1: 基础工程和 Actions 可用

完成：

- Electron 启动。
- 项目管理。
- SQLite。
- SNMP profile。
- GitHub Actions lint/typecheck/test/build 基础流水线。

### Milestone 2: 能采集

完成：

- 测试连接。
- WALK/BULK WALK。
- 导入 walk 文件。
- 保存 walk_entries。

### Milestone 3: 能识别

完成：

- MIB 解析。
- OID 匹配。
- 交换机分类。
- 中文建议。

### Milestone 4: 能审核

完成：

- 候选项表格。
- 编辑。
- 批量操作。
- 保存。

### Milestone 5: 能导出

完成：

- Zabbix YAML builder。
- 预览。
- 版本。
- 导出。
- Zabbix 7.0 导入验证。

---

## 9. 当前最需要的样例

为了让分类器更准确，需要至少一组真实样例：

```text
厂商:
型号:
设备角色:
SNMP 版本:
标准树 walk:
企业树 walk:
系统树 walk:
MIB 文件目录:
```

优先顺序：

1. 现场最常见交换机型号。
2. H3C。
3. 华为。
4. 锐捷。

没有样例也能先写框架和 parser，但模板质量必须靠真实设备数据迭代。
