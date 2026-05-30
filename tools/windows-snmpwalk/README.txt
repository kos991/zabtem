SNMPWALK Windows 一键采集包
============================

用途
----
本工具用于在 Windows 运维电脑上采集交换机、存储、安全设备的 SNMP 实际输出。
生成的 walk.txt 文件可上传到 Zabbix 模板生成平台，用于生成厂商型号专用模板。

目录结构
--------
请保持如下目录：

snmpwalk-pack/
  run_snmpwalk.cmd
  README.txt
  bin/
    snmpwalk.exe
    相关 DLL
  output/

准备 snmpwalk.exe
----------------
本包不内置 snmpwalk.exe。
请下载 Windows 版 net-snmp 工具，并将 snmpwalk.exe 及运行所需 DLL 放入 bin 目录。

运行方式
--------
双击 run_snmpwalk.cmd。

按提示输入：

1. 设备 IP
2. SNMP 版本：2c 或 3
3. SNMPv2c community，或 SNMPv3 用户/认证/加密信息

输出文件
--------
采集完成后，output 目录会生成：

<ip>_<timestamp>_standard.walk.txt
<ip>_<timestamp>_enterprise.walk.txt
<ip>_<timestamp>_system.walk.txt

含义：

standard.walk.txt
  标准 MIB 树 1.3.6.1.2.1

enterprise.walk.txt
  厂商私有 MIB 树 1.3.6.1.4.1

system.walk.txt
  系统信息 1.3.6.1.2.1.1

上传建议
--------
上传到平台时建议同时上传：

1. 厂商 MIB 文件
2. standard.walk.txt
3. enterprise.walk.txt
4. system.walk.txt

注意事项
--------
1. 请优先在设备管理网中运行。
2. 请使用只读 SNMP 凭据。
3. 输出文件可能包含设备名称、型号、序列号、内网地址等信息，请妥善保管。
4. 如果 enterprise.walk.txt 很小或为空，可能是设备未开放私有 MIB 树，或 SNMP 权限不足。
5. 如果采集速度很慢，可以先只采集 system.walk.txt 验证凭据是否正确。
