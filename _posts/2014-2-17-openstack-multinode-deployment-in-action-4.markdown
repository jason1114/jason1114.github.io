---
layout: post
title:  "OpenStack 实战 - 多节点部署案例（四）：网络节点"
date:   2014-02-17 20:16:51
categories: openstack ubuntu
lan: cn
abstract: |
 接下来，我们将要设置网络节点。就像之前提到的一样，网络节点主要为计算节点上创建出来的虚拟机提供网络服务，使他们能够被外面的主机访问到。本文将涉及到具体配置方法以及对配置过程中可能会碰到某个奇怪问题给出解决方案。
---
##引言
接下来，我们将要设置网络节点。就像之前提到的一样，网络节点主要为计算节点上创建出来的虚拟机提供网络服务，使他们能够被外面的主机访问到。本文将涉及到具体配置方法以及对配置过程中可能会碰到某个奇怪问题给出解决方案。

##准备节点
和控制节点一样，首先要进行一些类似的准备工作，当然后面这些命令也是一样运行在root之下的，不再赘述。
{% highlight bash %}
$ apt-get update -y
$ apt-get upgrade -y
$ apt-get dist-upgrade -y
{% endhighlight %}

安装ntp服务，使网络节点的时间与控制节点同步：
{% highlight bash %}
$ apt-get install -y ntp
#Comment the ubuntu NTP servers
$ sed -i 's/server 0.ubuntu.pool.ntp.org/#server 0.ubuntu.pool.ntp.org/g' /etc/ntp.conf
$ sed -i 's/server 1.ubuntu.pool.ntp.org/#server 1.ubuntu.pool.ntp.org/g' /etc/ntp.conf
$ sed -i 's/server 2.ubuntu.pool.ntp.org/#server 2.ubuntu.pool.ntp.org/g' /etc/ntp.conf
$ sed -i 's/server 3.ubuntu.pool.ntp.org/#server 3.ubuntu.pool.ntp.org/g' /etc/ntp.conf

#Set the network node to follow up your conroller node
$ sed -i 's/server ntp.ubuntu.com/server 10.10.10.51/g' /etc/ntp.conf

$ service ntp restart
{% endhighlight %}

安装其他服务，开启ip数据包转发：
{% highlight bash %}
$ apt-get install -y vlan bridge-utils
$ sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
# To save you from rebooting, perform the following
$ sysctl net.ipv4.ip_forward=1
{% endhighlight %}

##网络设置

与控制节点类似，网络接口设置如下所示：
{% highlight bash %}
# OpenStack management
auto eth0
iface eth0 inet static
address 10.10.10.52
netmask 255.255.255.0

# VM Configuration
auto eth1
iface eth1 inet static
address 10.20.20.52
netmask 255.255.255.0

# VM internet Access
auto eth3
iface eth3 inet static
address 192.168.100.52
netmask 255.255.255.0
{% endhighlight %}

>注意：在“概述”中提到的一共4个网络接口这里先配置3个，第四个eth2会在随后配置，这里先留白。

##OpenVSwitch（第一部分）
安装软件包，创建网桥：
{% highlight bash %}
$ apt-get install -y openvswitch-switch openvswitch-datapath-dkms
#br-int will be used for VM integration
$ ovs-vsctl add-br br-int

#br-ex is used to make to VM accessible from the internet
$ ovs-vsctl add-br br-ex
{% endhighlight %}

##Quantum
安装软件包，Quantum 的 OpenVSwitch 插件，I3插件，DHCP插件等：
{% highlight bash %}
$ apt-get -y install quantum-plugin-openvswitch-agent quantum-dhcp-agent quantum-l3-agent quantum-metadata-agent
{% endhighlight %}

编辑 */etc/quantum/api-paste.ini* 指定部分为：
{% highlight bash %}
[filter:authtoken]
paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
auth_host = 10.10.10.51
auth_port = 35357
auth_protocol = http
admin_tenant_name = service
admin_user = quantum
admin_password = service_pass
{% endhighlight %}

编辑OVS插件的配置文件(**/etc/quantum/plugins/openvswitch/ovs_quantum_plugin.ini**)指定部分为：
{% highlight bash %}
#Under the database section
[DATABASE]
sql_connection = mysql://quantumUser:quantumPass@10.10.10.51/quantum

#Under the OVS section
[OVS]
tenant_network_type = gre
tunnel_id_ranges = 1:1000
integration_bridge = br-int
tunnel_bridge = br-tun
local_ip = 10.20.20.52
enable_tunneling = True

#Firewall driver for realizing quantum security group function
[SECURITYGROUP]
firewall_driver = quantum.agent.linux.iptables_firewall.OVSHybridIptablesFirewallDriver
{% endhighlight %}

更新 **/etc/quantum/metadata_agent.ini** 指定部分内容为以下行：

{% highlight bash %}
# The Quantum user information for accessing the Quantum API.
auth_url = http://10.10.10.51:35357/v2.0
auth_region = RegionOne
admin_tenant_name = service
admin_user = quantum
admin_password = service_pass

# IP address used by Nova metadata server
nova_metadata_ip = 10.10.10.51

# TCP Port used by Nova metadata server
nova_metadata_port = 8775

metadata_proxy_shared_secret = helloOpenStack
{% endhighlight %}

确保 */etc/quantum/quantum.conf* 中的 *RabbitMQ* IP正确指向控制节点，同时更新keystone认证部分：
{% highlight bash %}
rabbit_host = 10.10.10.51

#And update the keystone_authtoken section

[keystone_authtoken]
auth_host = 10.10.10.51
auth_port = 35357
auth_protocol = http
admin_tenant_name = service
admin_user = quantum
admin_password = service_pass
signing_dir = /var/lib/quantum/keystone-signing
{% endhighlight %}

编辑 **/etc/sudoers.d/quantum_sudoers** 授予用户所有权限（很不幸这一步是强制的）

{% highlight bash %}
$ nano /etc/sudoers.d/quantum_sudoers

#修改下面这行
quantum ALL=NOPASSWD: ALL

#保存退出，然后使用下面的命令重启所有 Quantum 服务
$ cd /etc/init.d/; for i in $( ls quantum-* ); do sudo service $i restart; done
{% endhighlight %}

##OpenVSwitch（第二部分）
在这里，我们将设置之前网络设置中还未设置的eth2，在网络接口设置中加入以下内容：
{% highlight bash %}
# VM internet Access
auto eth2
iface eth2 inet manual
up ifconfig $IFACE 0.0.0.0 up
up ip link set $IFACE promisc on
down ip link set $IFACE promisc off
down ifconfig $IFACE down
{% endhighlight %}

最后把 eth2 添加到之前创建的 br-ex，以完成网桥：

{% highlight bash %}
$ ovs-vsctl add-port br-ex eth2
{% endhighlight %}

##故障排除
如果 **/var/log/quantum/openvswitch-agent.log** 中出现以下错误信息：

{% highlight bash %}
ERROR [quantum.plugins.openvswitch.agent.ovs_quantum_agent] Failed to create OVS patch port. Cannot have tunneling enabled on this agent, since this version of OVS does not support tunnels or patch ports. Agent terminated!
{% endhighlight %}

那么请依次执行以下命令（具体信息请参阅参考资料）：
{% highlight bash %}
$ apt-get install -y openvswitch-datapath-source module-assistant
$ module-assistant prepare
$ cd /lib/modules/`uname -r`/build/include/linux
$ ln -s ../generated/uapi/linux/version.h .
$ module-assistant auto-install openvswitch-datapath
{% endhighlight %}
随后重启系统即可解决问题。

如果 **/var/log/quantum/openvswitch-agent.log** 中出现以下错误信息：

{% highlight bash %}
ERROR [quantum.agent.linux.ovs_lib] Unable to execute ['ovs-vsctl', '--timeout=2', 'add-port', 'br-tun', 'gre-1']. Exception:
Command: ['sudo', 'quantum-rootwrap', '/etc/quantum/rootwrap.conf', 'ovs-vsctl', '--timeout=2', 'add-port', 'br-tun', 'gre-1']
Exit code: 1
Stdout: ''
Stderr: 'ovs-vsctl: cannot create a port named gre-1 because a port named gre-1 already exists on bridge br-tun\n'
{% endhighlight %}

那么请依次执行以下命令:
{% highlight bash %}
$ ovs-vsctl del-port br-tun gre-1
$ ovs-vsctl list-ports br-tun
{% endhighlight %}
然后切换到计算节点(在计算节点已经部署完毕的情况下)，执行：
{% highlight bash %}
$ service quantum-plugin-openvswitch-agent restart
{% endhighlight %}

这样网桥恢复正常工作，计算节点上的虚拟机就能正常被访问了。

##参考资料
1. Github, [OpenStack Grizzly Install Guide][install guide]
2. Ventz, [OpenStack-Quantum-OpenvSwitch-datapath for tunnels or patch ports][ovs]

[install guide]: https://github.com/mseknibilel/OpenStack-Grizzly-Install-Guide/blob/OVS_MultiNode/OpenStack_Grizzly_Install_Guide.rst
[ovs]: http://blog.vpetkov.net/2013/08/31/openstack-quantum-open-vswitch-datapath-for-tunnels-or-patch-ports/
