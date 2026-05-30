# Zabbix 模板生成器桌面端设计说明

**日期:** 2026-05-30  
**方向:** 自研桌面端优先  
**目标版本:** Zabbix 7.0 LTS  
**第一阶段:** 交换机物理层监控模板生成

---

## 1. 最终产品定位

项目仓库：

```text
https://github.com/kos991/zabtem.git
```

做我们自己的桌面端工具，不直接 fork `YangZhiqiang98/my-mibbrowser`。

产品名称暂定：

```text
MIB2Zabbix Desktop
```

核心目标：

- 在内网电脑上直接连接交换机、安全设备、服务器管理口等目标。
- 在线执行 SNMP GET / WALK / BULK WALK。
- 加载厂商 MIB，解析 OID 名称、描述、枚举、表结构。
- 把真实 snmpwalk 结果转换成可审核的监控项候选。
- 自动生成适合 Zabbix 7.0 LTS 导入的中文 YAML 模板。
- 让用户在导出前人工确认，避免“自动转换一堆不能用的 OID”。

这个工具不是单纯的 MIB 浏览器，也不是单纯 snmpwalk GUI。它的核心价值是：

```text
MIB 浏览 + 在线 SNMP 采集 + 中文规则引擎 + Zabbix 7.0 模板生成
```

---

## 2. 为什么从 Cloudflare 改为桌面端

Cloudflare 方案适合做在线模板库、账号、共享、下载，但不适合做内网 SNMP 查询。

Cloudflare Worker 的限制：

- 不能直接访问用户内网设备。
- 不能可靠运行 net-snmp 命令行工具。
- 不适合作为 SNMP 探测节点。
- 用户需要上传 MIB 和 snmpwalk，流程更绕。
- 内网设备信息、序列号、OID、拓扑信息上传到云端有安全顾虑。

桌面端优势：

- 可以直接访问内网 IP。
- 可以直接发起 SNMP v2c / v3 查询。
- 可以读取本地 MIB 目录。
- 可以离线使用。
- 可以把敏感数据留在本机。
- 可以给 Windows / Linux 运维人员提供“一键采集、审核、导出”的体验。第一阶段正式验收优先覆盖 Windows x86_64 和 Linux x86_64，ARM64 作为架构兼容与技术验证目标。

结论：

```text
第一主线做桌面端。
Cloudflare 后续只作为可选的模板库、更新源、规则库同步平台。
```

---

## 3. 与 my-mibbrowser 的关系

参考项目：

```text
https://github.com/YangZhiqiang98/my-mibbrowser
```

根据 GitHub README，`my-mibbrowser` 是 Electron + React + TypeScript 桌面 SNMP/MIB 工具，支持 MIB 加载、OID 树浏览、SNMP GET/SET/GETBULK/WALK/BULK WALK、Table Viewer、Trap/Inform 监听、Profiles、Debug Logs 等能力。项目按 GPL-3.0 协议发布。

我们参考它的产品思路，不复制实现代码。

可参考：

- MIB 目录递归加载体验。
- MIB 树浏览、搜索、节点详情。
- 从 MIB 节点右键发起 SNMP 查询。
- SNMP Profile 保存方式。
- WALK / BULK WALK 流式展示。
- Table Viewer 的表格化查看体验。
- Debug Logs 的排错体验。
- 主进程、preload、renderer 分层方式。

不直接照搬：

- 不复制 GPL-3.0 源码。
- 不复用它的文件结构作为我们的源码基础。
- 不把 SET、Trap、RowStatus 编辑作为第一阶段核心。
- 不把产品定位做成通用 MIB Browser。

许可证边界：

- 如果 fork 或复制 GPL-3.0 代码，后续分发大概率要按 GPL-3.0 履行开源义务。
- 如果我们要做自有闭源或商业分发，应自研实现，并只把它当竞品/参考。
- 可借鉴交互模式和功能清单，但代码、文案、资源、结构设计都要自己写。

---

## 4. 技术栈建议

桌面端建议：

```text
Electron + React + TypeScript + Vite
```

本地存储：

```text
SQLite
```

SNMP 能力：

```text
Node.js net-snmp 库优先
可选支持调用系统 snmpwalk / snmpget / snmpbulkwalk
```

模板导出：

```text
YAML 生成器，目标 Zabbix 7.0 LTS import/export 格式
```

打包：

```text
electron-builder
第一阶段正式发布 Windows x86_64 与 Linux x86_64；代码和构建体系保持 ARM64 兼容，Linux ARM64 / Windows ARM64 作为技术验证和后续正式发布目标
```

为什么不用纯 Web：

- 浏览器无法直接发 SNMP UDP。
- Web 页面不能直接扫描内网 SNMP。
- 不能很好调用本地 snmpwalk 工具。

为什么不用 Python 桌面优先：

- Python 适合解析和规则引擎，但桌面 UI、打包、跨平台一致性较弱。
- 如果以后需要 Python MIB 解析能力，可以把 Python 作为本地 worker 或独立 CLI，而不是第一 UI 技术栈。

---

## 5. 总体架构

建议目录：

```text
apps/desktop/
  src/
    main/
      ipc/
      snmp/
      mib/
      storage/
      zabbix/
      project/
    preload/
    renderer/
      pages/
      components/
      features/
    shared/
      types/
      constants/

packages/
  core/
    walk-parser/
    mib-parser/
    oid-matcher/
    cn-dictionary/
    zabbix-yaml-builder/
    template-model/
  modules/
    switch/
    server-hardware/
    security-device/
    database/

tools/
  bundled-snmp-tools/

docs/
  plans/
  specs/
```

设计原则：

- `core` 放通用能力，不写设备类型特例。
- `modules/switch` 放交换机规则。
- `modules/server-hardware` 后续放 Redfish/IPMI 规则。
- `modules/security-device` 后续放防火墙、EDR、网关等设备规则。
- `modules/database` 后续放 SQL/ODBC/HTTP Agent 模板规则。
- Electron main 进程负责本机能力：文件、SNMP、SQLite、导出。
- Renderer 只负责 UI，通过 preload 暴露的安全 API 调用 main。
- 代码生成、模板生成验证、构建验证、测试验证必须在 GitHub Actions 中执行并留下可追溯日志；本地可以做开发调试，但不得把仅本地验证作为完成依据。

---

## 6. 第一阶段范围：交换机物理层

第一阶段只做交换机，不同时铺开服务器、安全设备、数据库。

重点监控项：

- 设备可达性。
- 系统信息。
- 接口描述、别名、运行状态、管理状态。
- 接口错误包、丢弃包、CRC。
- 光模块存在状态。
- 光模块 RX/TX 光功率。
- 光模块温度、电压、电流。
- 电源模块状态。
- 风扇状态。
- 温度传感器。
- 板卡/槽位状态。
- 堆叠成员状态。
- CPU、内存基础指标。

第一阶段不重点做：

- Trap 监听。
- SNMP SET。
- RowStatus 表编辑。
- 自动识别所有厂商私有 OID。
- 复杂接口拓扑识别。
- 云端多租户。

---

## 7. 输入与输出

输入：

- 厂商 MIB 文件或 MIB 目录。
- 设备 IP。
- SNMP 版本。
- SNMP v2c community 或 SNMP v3 认证信息。
- 厂商、型号、设备角色。
- 可选：已有 snmpwalk 文本文件。

输出：

- Zabbix 7.0 LTS YAML 模板。
- 项目本地记录。
- SNMP walk 原始结果。
- OID 解析结果。
- 用户审核后的监控项候选。
- 中文命名和枚举映射。

模板命名：

```text
Template SNMP <Vendor> <Model> Physical CN
```

示例：

```text
Template SNMP H3C S6520X-30QC-EI Physical CN
Template SNMP Huawei S5735-L48T4S-A1 Physical CN
Template SNMP Ruijie RG-S5750C Physical CN
```

---

## 8. 核心流程

```text
创建项目
  -> 填写厂商/型号/角色
  -> 配置 SNMP Profile
  -> 加载 MIB 目录
  -> 在线 WALK 标准树和企业树
  -> 解析 snmpwalk
  -> 解析 MIB
  -> OID 匹配
  -> 指标分类
  -> 中文命名
  -> 用户审核
  -> 生成 YAML 预览
  -> 导出 Zabbix 7.0 模板
```

关键原则：

```text
snmpwalk 是真实存在的依据。
MIB 是增强信息，不是唯一依据。
```

原因：

- 厂商 MIB 往往覆盖多个产品线。
- 同一 MIB 下某型号只实现一部分 OID。
- 私有 OID 表索引经常不标准。
- 光模块、电源、风扇、板卡尤其容易厂商差异很大。

---

## 9. 桌面端页面设计

### 9.1 项目列表

显示：

- 项目名称。
- 设备类型。
- 厂商。
- 型号。
- 最近连接 IP。
- 最近生成模板版本。
- 最近更新时间。

操作：

- 新建项目。
- 打开项目。
- 复制项目。
- 导出 YAML。
- 删除项目。

### 9.2 新建项目

字段：

- 设备类型：第一阶段只有交换机。
- 厂商。
- 型号。
- 角色：核心、汇聚、接入、其他。
- Zabbix 版本：固定 7.0 LTS。

### 9.3 连接配置

字段：

- Host/IP。
- Port，默认 161。
- SNMP version：v2c / v3。
- Community。
- SNMPv3 username。
- Security level。
- Auth protocol。
- Auth password。
- Privacy protocol。
- Privacy password。
- Timeout。
- Retries。
- Bulk size。

安全要求：

- 密码默认不明文展示。
- 本地保存凭据时要有明确提示。
- 后续可接 Windows Credential Manager。

### 9.4 MIB 管理

能力：

- 选择 MIB 文件。
- 选择 MIB 目录。
- 递归扫描 `.mib`、`.my`、`.txt`。
- 显示加载成功数量。
- 显示缺失依赖。
- 显示解析失败文件。
- 支持搜索 OID/name/description。

### 9.5 在线采集

默认采集：

```text
1.3.6.1.2.1
1.3.6.1.4.1
1.3.6.1.2.1.1
```

按钮：

- 测试连接。
- 采集系统信息。
- 采集标准树。
- 采集企业树。
- 自定义 OID 采集。
- 导入已有 walk 文件。

采集结果要保存原文，方便排错和复现。

### 9.6 指标候选审核

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
- 是否触发器。
- 严重级别。
- 来源：MIB / WALK / 用户。

过滤：

- 分类。
- 启用状态。
- 未识别。
- 有触发器。
- 有 MIB 描述。
- 表格型/标量型。

批量操作：

- 启用。
- 禁用。
- 设置分类。
- 设置单位。
- 设置触发器级别。
- 保存中文映射。

### 9.7 YAML 预览

显示：

- 模板名称。
- Items 数量。
- Discovery rules 数量。
- Item prototypes 数量。
- Trigger prototypes 数量。
- Value maps 数量。
- YAML 内容。

操作：

- 生成预览。
- 保存版本。
- 导出 YAML。
- 打开导出目录。

---

## 10. 数据模型

SQLite 表建议：

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

## 11. 模块职责

### walk-parser

解析 SNMP 输出，支持：

```text
.1.3.6.1.2.1.1.1.0 = STRING: H3C Switch
1.3.6.1.2.1.2.2.1.8.1 = INTEGER: 1
iso.3.6.1.2.1.2.2.1.8.1 = INTEGER: up(1)
IF-MIB::ifOperStatus.1 = INTEGER: up(1)
```

输出：

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

### mib-parser

第一版做实用解析，不追求完整 ASN.1 编译器。

解析：

- OBJECT IDENTIFIER。
- OBJECT-TYPE。
- SYNTAX。
- MAX-ACCESS。
- STATUS。
- DESCRIPTION。
- 简单 INTEGER 枚举。
- table / entry / column 结构线索。

### oid-matcher

规则：

- `.0` 结尾标量优先匹配完整对象。
- 表格 OID 用最长前缀匹配。
- 没有 MIB 匹配的 walk OID 保留为 unknown。
- MIB 有但 walk 没有的对象默认不生成。

### switch-classifier

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

### cn-dictionary

中文化策略：

- 精确对象名匹配。
- 厂商覆盖。
- 型号覆盖。
- 关键词规则生成。
- 用户手动编辑后保存。

注意：

- 只翻译展示名称、描述、值映射。
- 不翻译 item key。
- 不翻译 OID。
- 不翻译宏名。
- 不翻译 LLD 宏。
- 不翻译触发表达式内部函数。

### zabbix-yaml-builder

生成：

- Template groups。
- Templates。
- Macros。
- Items。
- Discovery rules。
- Item prototypes。
- Trigger prototypes。
- Value maps。
- Tags。

目标：

```text
Zabbix 7.0 LTS 可导入 YAML
```

---

## 12. 中文命名示例

基础映射：

```text
ifDescr -> 接口描述
ifName -> 接口名称
ifAlias -> 接口别名
ifOperStatus -> 接口运行状态
ifAdminStatus -> 接口管理状态
ifSpeed -> 接口速率
ifHighSpeed -> 接口高速速率
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
stackStatus -> 堆叠状态
boardStatus -> 板卡状态
```

触发器示例：

```text
{HOST.NAME}: 设备不可达
{HOST.NAME}: 电源模块 {#PSU.NAME} 状态异常
{HOST.NAME}: 风扇 {#FAN.NAME} 状态异常
{HOST.NAME}: 温度 {#TEMP.NAME} 过高
{HOST.NAME}: 板卡 {#BOARD.NAME} 状态异常
{HOST.NAME}: 堆叠成员 {#STACK.ID} 状态异常
{HOST.NAME}: 接口 {#IFNAME} 已断开
{HOST.NAME}: 接口 {#IFNAME} CRC 错误持续增长
{HOST.NAME}: 接口 {#IFNAME} 错误包持续增长
{HOST.NAME}: 接口 {#IFNAME} 丢弃包持续增长
{HOST.NAME}: 光模块 {#IFNAME} 接收光功率过低
{HOST.NAME}: 光模块 {#IFNAME} 发送光功率异常
{HOST.NAME}: 光模块 {#IFNAME} 温度过高
```

---

## 13. 默认触发器策略

默认生成：

- 设备不可达。
- 电源异常。
- 风扇异常。
- 温度过高。
- 板卡异常。
- 堆叠成员异常。
- CRC 持续增长。
- 错误包持续增长。
- 丢弃包持续增长。
- 光功率过低或异常。
- 光模块温度过高。

默认不生成：

- 所有接入口 down 告警。
- 所有接口流量利用率告警。
- 管理 down 告警。
- unknown OID 告警。

原因：

- 接入口 down 容易造成告警风暴。
- 流量阈值强依赖现场角色。
- unknown OID 需要人工确认。

接口 down 规则：

- 核心上联口：用户标记后可设为 High 或 Disaster。
- 汇聚上联口：用户标记后可设为 High。
- 服务器接入口：用户标记后可设为 Warning 或 High。
- 普通用户接入口：默认关闭。

---

## 14. Zabbix 模板内容

默认模板组：

```text
Templates/Network devices
```

默认宏：

```text
{$SNMP.TIMEOUT}
{$TEMP.WARN}
{$TEMP.HIGH}
{$IF.ERRORS.WARN}
{$IF.DISCARDS.WARN}
{$OPTICAL.RX.LOW}
{$OPTICAL.TX.LOW}
```

后续可加：

```text
{$OPTICAL.RX.HIGH}
{$OPTICAL.TX.HIGH}
{$IF.UTIL.WARN}
{$STACK.STATUS.OK}
{$PSU.STATUS.OK}
{$FAN.STATUS.OK}
```

默认值映射：

- 接口运行状态。
- 接口管理状态。
- 通用正常/异常状态。
- 存在/不存在状态。
- up/down 状态。

---

## 15. 风险点

### 15.1 MIB 解析风险

风险：

- 厂商 MIB 依赖缺失。
- MIB 编码不是 UTF-8，可能是 GBK。
- 私有语法不标准。
- 多个 MIB 定义重复对象。
- 表结构定义不完整。
- MIB 中有对象，但设备实际不支持。

应对：

- snmpwalk 作为事实来源。
- MIB 解析允许部分成功。
- UI 显示缺失依赖和解析失败。
- unmatched OID 保留为 unknown。
- 支持用户手动分类、命名、启用。

### 15.2 SNMP 在线查询风险

风险：

- 设备 ACL 不允许查询。
- SNMP v3 参数复杂。
- 企业树 walk 时间很长。
- 大表可能返回大量数据。
- 防火墙或安全设备可能限速。
- BULK WALK 在部分设备上兼容性差。

应对：

- 先做测试连接。
- 默认 timeout/retry 保守。
- 支持停止采集。
- 支持按 OID 分段采集。
- BULK WALK 失败时回退 WALK。
- 保存错误日志。

### 15.3 模板导入风险

风险：

- Zabbix 7.0 YAML schema 不匹配。
- 生成的 key 重复。
- LLD 宏命名不合法。
- 触发表达式引用不存在 item。
- 单位不合适。

应对：

- YAML builder 单独测试。
- 生成前做内部校验。
- 每个 discovery rule 检查 prototype 引用。
- 用固定样例做导入测试。
- 第一版先少生成，保证可导入。

### 15.4 中文化风险

风险：

- 机器翻译导致术语不统一。
- 厂商私有对象含义不清。
- 同一英文词在不同设备含义不同。

应对：

- 使用规则字典优先。
- 用户编辑优先级最高。
- 保存厂商/型号级映射。
- 不确定的名称标记为需审核。

### 15.5 许可证风险

风险：

- 直接复制 GPL-3.0 项目代码会影响分发策略。
- 部分 MIB 文件来自厂商，可能有再分发限制。
- net-snmp 命令行或依赖包许可证需要确认。

应对：

- 不复制 my-mibbrowser 代码。
- MIB 文件只保存在用户本地项目，不内置厂商 MIB。
- 上线前整理第三方依赖许可证清单。

### 15.6 安全风险

风险：

- SNMP community、v3 密码泄露。
- 项目文件包含内网 IP、设备名、序列号。
- 日志里误记录认证信息。

应对：

- 密码字段脱敏。
- 本地凭据加密存储。
- 日志不写 community 和密码。
- 导出项目时提示可能包含敏感信息。

### 15.7 GitHub Actions 验证规则

原则：

- 仓库地址固定为 `https://github.com/kos991/zabtem.git`。
- 代码生成、Zabbix YAML 模板生成、单元测试、集成测试、构建打包、跨平台兼容验证必须通过 GitHub Actions 执行。
- 本地运行只作为开发调试手段，不能作为“已完成/已验证/可发布”的唯一依据。
- 每次关键变更应保留 GitHub Actions run 记录，方便回溯输入、输出、日志和产物。
- 模板生成器输出的 YAML 应在 Actions 中用固定样例和校验器做自动验证。
- Windows x86_64 与 Linux x86_64 的正式验收构建必须在 Actions 中产出产物；ARM64 构建先作为技术验证 job，可以允许非阻塞失败，稳定后再改为必过。

建议 Actions 工作流：

```text
pull_request:
  - lint
  - typecheck
  - unit tests
  - walk parser samples
  - mib parser samples
  - zabbix yaml builder samples
  - yaml schema/import compatibility checks

main branch:
  - full test matrix
  - Windows x86_64 build
  - Linux x86_64 build
  - Linux ARM64 experimental build
  - Windows ARM64 experimental build
  - upload artifacts
```

### 15.8 一键 goal 规则

目标：

- 仓库必须提供 GitHub Actions 手动触发 workflow：`.github/workflows/goal.yml`。
- 一键 goal 是项目正式验证入口，本地命令只用于开发调试，不能作为验收依据。

确认规则：

1. 一键 goal 正式只认 GitHub Actions 结果。
2. 默认 goal 跑 `full`。
3. `workflow_dispatch` 支持输入：`verify`、`generate-template`、`build`、`full`。
4. 第一阶段正式构建 Windows x86_64 与 Linux x86_64。
5. ARM64 作为 experimental，可手动选择，不阻塞正式验收。
6. 仓库允许放脱敏 snmpwalk 样例和自制测试 MIB。
7. 第一版 YAML 验证先做离线结构校验。
8. goal 默认只上传 artifacts，不自动创建 GitHub Release。
9. 包管理器使用 pnpm。

`goal` 类型定义：

```text
verify
  - lint
  - typecheck
  - unit tests
  - parser / matcher / classifier samples

generate-template
  - 脱敏 snmpwalk 样例解析
  - 自制测试 MIB 解析
  - 指标候选生成
  - Zabbix 7.0 YAML 生成
  - YAML parse 和内部结构校验

build
  - Windows x86_64 desktop build
  - Linux x86_64 desktop build
  - 可选 ARM64 experimental build

full
  - verify
  - generate-template
  - build
  - 上传 YAML 样例、测试报告、桌面端安装包 artifacts
```

样例数据规则：

```text
fixtures/
  snmpwalk/
    h3c-sample.walk
    huawei-sample.walk
    ruijie-sample.walk
  mib/
    test-switch-minimal.mib
    README.md
  expected/
    sample-template.yaml
```

注意：

- 厂商完整 MIB 可能有版权或再分发限制，默认不提交仓库。
- 真实现场 walk 必须脱敏后才能进入 fixtures。
- Zabbix 真实导入验证后续再接 Docker 或测试实例；第一版 goal 先保证离线结构校验必过。

---

## 16. 后续模块预留

### 16.1 物理服务器

数据源：

- Redfish。
- IPMI。
- 厂商 SNMP。

监控项：

- BMC 可达。
- 整机健康。
- 电源状态。
- 风扇状态。
- 温度。
- 电压。
- 磁盘。
- RAID。
- 内存。
- CPU 硬件健康。

### 16.2 安全设备

数据源：

- SNMP。
- Syslog 样例。
- REST API 样例。

监控项：

- HA 状态。
- CPU/内存/磁盘。
- 接口。
- 会话数。
- VPN。
- 授权/特征库版本。
- 高风险事件数量。

### 16.3 数据库

数据源：

- SQL 查询。
- ODBC/JDBC。
- HTTP API。

监控项：

- 可用性。
- 连接数。
- QPS/TPS。
- 慢查询。
- 锁等待。
- 复制延迟。
- 表空间。
- 备份状态。

数据库模块不要强行套 SNMP/MIB 流程，应单独设计模板生成器。

---

## 17. 第一阶段验收标准

第一阶段完成时必须做到：

1. 能创建交换机项目。
2. 能保存 SNMP v2c/v3 连接配置。
3. 能测试连接并读取 sysDescr。
4. 能在线 walk 标准树和企业树。
5. 能导入已有 snmpwalk 文件。
6. 能加载 MIB 文件或目录。
7. 能解析基础 MIB 对象、描述和枚举。
8. 能把 walk OID 与 MIB 对象匹配。
9. 能分类常见接口、风扇、电源、温度、光模块指标。
10. 能生成中文候选监控项。
11. 用户能编辑中文名、分类、单位、启用状态、触发器。
12. 能生成 Zabbix 7.0 YAML。
13. YAML 能导入 Zabbix 7.0。
14. 至少包含系统信息、接口发现、接口状态、错误包、丢弃包。
15. 如果 walk 中有风扇/电源/温度/光模块，能生成对应候选项。

---

## 18. 推荐开发顺序

1. 桌面端项目骨架。
2. SQLite 本地数据层。
3. 项目管理。
4. SNMP Profile 管理。
5. SNMP 测试连接。
6. 在线 WALK 采集。
7. snmpwalk 文本导入。
8. walk-parser。
9. MIB 文件加载。
10. 轻量 MIB parser。
11. OID matcher。
12. switch classifier。
13. 中文字典。
14. 指标候选审核 UI。
15. Zabbix YAML builder。
16. YAML 预览和导出。
17. 模板版本管理。
18. Windows 打包。
19. 示例数据和使用文档。

---

## 19. 下一步需要确认

建议先确认这些，不然开工后容易返工：

1. 第一阶段正式验收平台是否确定为 Windows x86_64 和 Linux x86_64，ARM64 作为兼容验证与后续发布目标。
2. 是否允许本地保存 SNMP 密码。
3. 第一台样机选 H3C、华为、锐捷还是其他。
4. 有没有真实 MIB + walk 样例。
5. 第一版明确同时做 SNMP v2c 和 v3。
6. 是否需要内置 net-snmp 命令行，还是只用 Node net-snmp。
7. 是否未来要商业闭源分发。

我的建议：

1. 第一阶段正式交付 Windows x86_64 和 Linux x86_64；代码、路径、SNMP 调用、打包配置从一开始避免写死平台差异，Linux ARM64 / Windows ARM64 先作为技术验证目标，稳定后再纳入正式发布矩阵。
2. 允许保存，但默认提醒并加密。
3. 优先选你现场最容易拿到 walk 的交换机型号。
4. 没有样例也能开工，但分类器质量必须靠真实样例迭代。
5. v2c 和 v3 第一版一起完成，连接表单、凭据存储、测试连接和采集流程都要覆盖两种版本。
6. 优先 Node net-snmp，命令行 snmpwalk 做备用通道。
7. 代码完全自研，避免 GPL 传染风险。

---

## 20. 最重要的产品原则

不要承诺“全自动完美转换”。

正确流程是：

```text
在线采集 -> 自动识别 -> 自动建议 -> 人工审核 -> 生成模板
```

这个工具的价值不是替代专家判断，而是把专家从重复查 OID、翻译名称、拼 YAML 的体力活里解放出来。
