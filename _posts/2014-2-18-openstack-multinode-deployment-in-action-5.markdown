---
layout: post
title:  "OpenStack 实战 - 多节点部署案例（五）：计算节点"
date:   2014-02-18 09:39:47
categories: openstack ubuntu
lan: cn
abstract: |
 
---
##引言
控制节点和网络节点就绪之后，就是计算节点的配置。在最初的设计里，控制节点和网络节点被设计成虚拟机，因为它们对性能要求不是很高，而计算节点不应该被安装在虚拟机里，因为“盗梦空间”告诉我们，虚拟机嵌套会导致一切都变得很慢……

##准备节点
首先还是一样，升级系统软件包：
{% highlight bash %}
$ apt-get update -y
$ apt-get upgrade -y
$ apt-get dist-upgrade -y
{% endhighlight %}
重新启动，因为可能已经更新了内核。

配置NTP服务使其指向控制节点：
{% highlight bash %}
#Comment the ubuntu NTP servers
$ sed -i 's/server 0.ubuntu.pool.ntp.org/#server 0.ubuntu.pool.ntp.org/g' /etc/ntp.conf
$ sed -i 's/server 1.ubuntu.pool.ntp.org/#server 1.ubuntu.pool.ntp.org/g' /etc/ntp.conf
$ sed -i 's/server 2.ubuntu.pool.ntp.org/#server 2.ubuntu.pool.ntp.org/g' /etc/ntp.conf
$ sed -i 's/server 3.ubuntu.pool.ntp.org/#server 3.ubuntu.pool.ntp.org/g' /etc/ntp.conf

#Set the compute node to follow up your conroller node
$ sed -i 's/server ntp.ubuntu.com/server 10.10.10.51/g' /etc/ntp.conf

$ service ntp restart
{% endhighlight %}

安装其他服务，并开启IP转发：
{% highlight bash %}
$ apt-get install -y vlan bridge-utils
$ sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf

# To save you from rebooting, perform the following
$ sysctl net.ipv4.ip_forward=1
{% endhighlight %}

##KVM
首先确定你的硬件支持虚拟化，这是一种CPU的技术，可以在处理器级别创建虚拟机，提升虚拟机的性能：
{% highlight bash %}
$ apt-get install -y cpu-checker
$ kvm-ok
{% endhighlight %}

如果输出表明CPU支持硬件虚拟化，那么就可以安装配置KVM了，KVM是OpenStack使用的虚拟化技术：
{% highlight bash %}
$ apt-get install -y kvm libvirt-bin pm-utils
{% endhighlight %}

编辑 */etc/libvirt/qemu.conf* 里的 **cgroup_device_acl**：
{% highlight bash %}
cgroup_device_acl = [
"/dev/null", "/dev/full", "/dev/zero",
"/dev/random", "/dev/urandom",
"/dev/ptmx", "/dev/kvm", "/dev/kqemu",
"/dev/rtc", "/dev/hpet","/dev/net/tun"
]
{% endhighlight %}

删除默认的虚拟网桥：
{% highlight bash %}
$ virsh net-destroy default
$ virsh net-undefine default
{% endhighlight %}

更新 */etc/libvirt/libvirtd.conf* ：
{% highlight bash %}
listen_tls = 0
listen_tcp = 1
auth_tcp = "none"
{% endhighlight %}

编辑文件 */etc/init/libvirt-bin.conf* 中的 **libvirtd_opts** 变量：
{% highlight bash %}
env libvirtd_opts="-d -l"
{% endhighlight %}

编辑 */etc/default/libvirt-bin* 文件：
{% highlight bash %}
libvirtd_opts="-d -l"
{% endhighlight %}

重启 libvirt 和 dbus 服务以载入新的值：
{% highlight bash %}
$ service dbus restart && service libvirt-bin restart
{% endhighlight %}

##OpenVSwitch

安装 OpenVSwitch 并创建网桥：
{% highlight bash %}
$ apt-get install -y openvswitch-switch openvswitch-datapath-dkms
#br-int will be used for VM integration
$ ovs-vsctl add-br br-int
{% endhighlight %}

##Quantum

安装 Quantum 的 OpenVSwitch 代理：
{% highlight bash %}
$ apt-get -y install quantum-plugin-openvswitch-agent
{% endhighlight %}

编辑 OVS 插件的配置文件 **/etc/quantum/plugins/openvswitch/ovs_quantum_plugin.ini** ：

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
local_ip = 10.20.20.53
enable_tunneling = True

#Firewall driver for realizing quantum security group function
[SECURITYGROUP]
firewall_driver = quantum.agent.linux.iptables_firewall.OVSHybridIptablesFirewallDriver
{% endhighlight %}

确定你 */etc/quantum/quantum.conf* 中的 RabbitMQ IP 指向控制节点，并更新认证部分：
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

重启所有服务：
{% highlight bash %}
$ service quantum-plugin-openvswitch-agent restart
{% endhighlight %}

##Nova

安装计算节点上 nova 需要的组件：
{% highlight bash %}
$ apt-get install -y nova-compute-kvm
{% endhighlight %}

修改 */etc/nova/api-paste.ini* 中的认证部分：
{% highlight bash %}
[filter:authtoken]
paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
auth_host = 10.10.10.51
auth_port = 35357
auth_protocol = http
admin_tenant_name = service
admin_user = nova
admin_password = service_pass
signing_dirname = /tmp/keystone-signing-nova
# Workaround for https://bugs.launchpad.net/nova/+bug/1154809
auth_version = v2.0
{% endhighlight %}

编辑 */etc/nova/nova-compute.conf* 文件：
{% highlight bash %}
[DEFAULT]
libvirt_type=kvm
libvirt_ovs_bridge=br-int
libvirt_vif_type=ethernet
libvirt_vif_driver=nova.virt.libvirt.vif.LibvirtHybridOVSBridgeDriver
libvirt_use_virtio_for_bridges=True
{% endhighlight %}

修改 */etc/nova/nova.conf* 如下：
{% highlight bash %}
[DEFAULT]
logdir=/var/log/nova
state_path=/var/lib/nova
lock_path=/run/lock/nova
verbose=True
api_paste_config=/etc/nova/api-paste.ini
compute_scheduler_driver=nova.scheduler.simple.SimpleScheduler
rabbit_host=10.10.10.51
nova_url=http://10.10.10.51:8774/v1.1/
sql_connection=mysql://novaUser:novaPass@10.10.10.51/nova
root_helper=sudo nova-rootwrap /etc/nova/rootwrap.conf

# Auth
use_deprecated_auth=false
auth_strategy=keystone

# Imaging service
glance_api_servers=10.10.10.51:9292
image_service=nova.image.glance.GlanceImageService

# Vnc configuration
novnc_enabled=true
novncproxy_base_url=http://192.168.100.51:6080/vnc_auto.html
novncproxy_port=6080
vncserver_proxyclient_address=10.10.10.53
vncserver_listen=0.0.0.0

# Network settings
network_api_class=nova.network.quantumv2.api.API
quantum_url=http://10.10.10.51:9696
quantum_auth_strategy=keystone
quantum_admin_tenant_name=service
quantum_admin_username=quantum
quantum_admin_password=service_pass
quantum_admin_auth_url=http://10.10.10.51:35357/v2.0
libvirt_vif_driver=nova.virt.libvirt.vif.LibvirtHybridOVSBridgeDriver
linuxnet_interface_driver=nova.network.linux_net.LinuxOVSInterfaceDriver
#If you want Quantum + Nova Security groups
firewall_driver=nova.virt.firewall.NoopFirewallDriver
security_group_api=quantum
#If you want Nova Security groups only, comment the two lines above and uncomment line -1-.
#-1-firewall_driver=nova.virt.libvirt.firewall.IptablesFirewallDriver

#Metadata
service_quantum_metadata_proxy = True
quantum_metadata_proxy_shared_secret = helloOpenStack

# Compute #
compute_driver=libvirt.LibvirtDriver

# Cinder #
volume_api_class=nova.volume.cinder.API
osapi_volume_listen_port=5900
cinder_catalog_info=volume:cinder:internalURL
{% endhighlight %}

重启所有nova服务，查看所有nova服务（确定都是笑脸符号）：
{% highlight bash %}
$ cd /etc/init.d/; for i in $( ls nova-* ); do sudo service $i restart; done
$ nova-manage service list
{% endhighlight %} 

##网络设置

因为配置好网络之后就会失去Internet连接，所以需要在网络设置之前先下载好所有用到的软件包，当上面的所有设置都完成后，就可以设置网络了：

{% highlight bash %}
# OpenStack management
auto eth0
iface eth0 inet static
address 10.10.10.53
netmask 255.255.255.0

# VM Configuration
auto eth1
iface eth1 inet static
address 10.20.20.53
netmask 255.255.255.0
{% endhighlight %}


##故障排除

1.在控制节点nova数据库中，保存了nova的日志信息。如果日志中出现错误(创建虚拟机的过程中)：
{% highlight bash %}
novalidhost
error: Failed to reconnect to the hypervisor
error: no valid connection
error: Failed to connect socket to '/usr/local/var/run/libvirt/libvirt-sock': No such file or directory
{% endhighlight %}
那么查看libvirt进程是否启动? 
{% highlight bash %}
$ ps -le | grep libvirt*
{% endhighlight %}

如果没有启动，那么上面的错误就是这个原因，现在启动libvirt进程：*libvirtd  -d*
，现在检查是否安装成功 *virsh version* ，出现版本 1.0.0 则表示安装成功。

2.如果日志中出现错误(创建虚拟机的过程中)：
{% highlight bash %}
premission denied
{% endhighlight %}

解决方法，进入计算节点，执行以下命令：
{% highlight bash %}
$ cd /var/lib/nova
$ chmod 777 -R instances/
{% endhighlight %}

##参考资料
1. Github, [OpenStack Grizzly Install Guide][install guide]

[install guide]: https://github.com/mseknibilel/OpenStack-Grizzly-Install-Guide/blob/OVS_MultiNode/OpenStack_Grizzly_Install_Guide.rst
