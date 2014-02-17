---
layout: post
title:  "OpenStack 实战 - 多节点部署案例（二）：控制节点（下）"
date:   2014-02-13 15:38:43
categories: ubuntu openstack
lan: cn
abstract: |
 本文承接上一部分，讲解控制节点的安装，主要涉及控制节点的几个核心组件的Server端，他们分别是：认证服务KeyStone；镜像服务Glance；网络服务Quantum；计算服务Nova；块存储服务Cinder；Web控制台Horizon。
---
##引言
本文承接上一部分，讲解控制节点的安装，主要涉及控制节点的几个核心组件的Server端，他们分别是：认证服务KeyStone；镜像服务Glance；网络服务Quantum；计算服务Nova；块存储服务Cinder；Web控制台Horizon。

##KeyStone
首先是安装KeyStone服务：
{% highlight bash%}
$ apt-get install -y keystone
{% endhighlight %} 

设置keystone配置信息使其指向之前为keystone准备的MySQL数据库，打开*/etc/keystone/keystone.conf*修改指定属性如下所示：
{% highlight bash %}
connection = mysql://keystoneUser:keystonePass@10.10.10.51/keystone
{% endhighlight %}

重新启动认证服务，同步数据库：
{% highlight bash %}
$ service keystone restart
$ keystone-manage db_sync
{% endhighlight %}

下载两个脚本，执行它们，使数据库被填充：
{% highlight bash %}
$ wget https://raw.github.com/mseknibilel/OpenStack-Grizzly-Install-Guide/OVS_MultiNode/KeystoneScripts/keystone_basic.sh
$ wget https://raw.github.com/mseknibilel/OpenStack-Grizzly-Install-Guide/OVS_MultiNode/KeystoneScripts/keystone_endpoints_basic.sh

$ chmod +x keystone_basic.sh
$ chmod +x keystone_endpoints_basic.sh

$ ./keystone_basic.sh
$ ./keystone_endpoints_basic.sh
{% endhighlight %}

>注意：这两个脚本都是按照之前约定好的IP地址，数据库的用户名密码而写的，所以如果你的数据库设置和网络IP地址和本案例不同，请注意修改为自己的设置。如果你一只是按照和本文相同的设置照做下来，只需执行上述代码即可。

创建一个简单的认证文件，之后访问OpenStack服务只需在命令行环境中载入这个文件就可以不用重复输入认证信息：
{% highlight bash %}
nano creds

#Paste the following:
export OS_TENANT_NAME=admin
export OS_USERNAME=admin
export OS_PASSWORD=admin_pass
export OS_AUTH_URL="http://192.168.100.51:5000/v2.0/"

# Load it:
source creds
{% endhighlight %}

记住你是在什么位置创建这个文件的，以便之后需要使用的时候能想的起来如何找到这个认证文件。为了测试这个认证文件，不妨执行一个简单的OpenStack命令看能否顺利执行：
{% highlight bash %}
$ keystone user-list
{% endhighlight %}

若是输出用户列表即表示认证成功，设置无误。

>运行OpenStack大多数命令，例如nova、glance、keystone时，都需要在终端载入认证文件，本文后面如果涉及到运行这些命令，都认为已经载入认证文件。

##Glance
现在我们开始Glance的安装：
{% highlight bash %}
$ apt-get install -y glance
{% endhighlight %}

替换 */etc/glance/glance-api-paste.ini* 对应部分为以下内容：
{% highlight bash %}
[filter:authtoken]
paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
delay_auth_decision = true
auth_host = 10.10.10.51
auth_port = 35357
auth_protocol = http
admin_tenant_name = service
admin_user = glance
admin_password = service_pass
{% endhighlight %}

替换 */etc/glance/glance-registry-paster.ini* 为以下内容：
{% highlight bash %}
[filter:authtoken]
paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
auth_host = 10.10.10.51
auth_port = 35357
auth_protocol = http
admin_tenant_name = service
admin_user = glance
admin_password = service_pass
{% endhighlight %}

替换数据库连接为之前配置好的MySQL数据库，编辑文件*/etc/glance/glance-api.conf* ：
{% highlight bash %}
sql_connection = mysql://glanceUser:glancePass@10.10.10.51/glance

[paste_deploy]
flavor = keystone
{% endhighlight %}

更新 */etc/glance/glance-registry* :
{% highlight bash %}
sql_connection = mysql://glanceUser:glancePass@10.10.10.51/glance

[paste_deploy]
flavor = keystone
{% endhighlight %}

重启glance服务并同步数据库：
{% highlight bash %}
$ service glance-api restart; service glance-registry restart
$ glance-manage db_sync
{% endhighlight %}

为了测试glance服务是否正确配置，我们上传一个镜像：
{% highlight bash %}
$ glance image-create --name myFirstImage --is-public true --container-format bare --disk-format qcow2 --location http://download.cirros-cloud.net/0.3.1/cirros-0.3.1-x86_64-disk.img
$ glance image-list
{% endhighlight %}

如果命令列出了刚刚上传的镜像，则表示glance服务配置成功。

>上面上传的这个镜像 cirros 也是一个 linux 发行版，主要用于测试云端环境是否正常运行，它的体积非常小，默认root密码为  *cubswin* 。

##Quantum
安装Quantum服务器端以及OpenVSwitch工具包：
{% highlight bash %}
$ apt-get install -y quantum-server
{% endhighlight %}
编辑文件 **/etc/quantum/plugins/openvswitch/ovs_quantum_plugin.ini** 配置 OpenVSwitch ：

{% highlight bash %}
#Under the database section
[DATABASE]
sql_connection = mysql://quantumUser:quantumPass@10.10.10.51/quantum

#Under the OVS section
[OVS]
tenant_network_type = gre
tunnel_id_ranges = 1:1000
enable_tunneling = True

#Firewall driver for realizing quantum security group function
[SECURITYGROUP]
firewall_driver = quantum.agent.linux.iptables_firewall.OVSHybridIptablesFirewallDriver
{% endhighlight %}

编辑 */etc/quantum/api-paste.ini* ：
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

更新文件*/etc/quantum/quantum.conf*：

{% highlight bash %}
[keystone_authtoken]
auth_host = 10.10.10.51
auth_port = 35357
auth_protocol = http
admin_tenant_name = service
admin_user = quantum
admin_password = service_pass
signing_dir = /var/lib/quantum/keystone-signing
{% endhighlight %}

重启Quantum服务：
{% highlight bash %}
$ service quantum-server restart
{% endhighlight %}

##Nova
安装一系列Nova组件：
{% highlight bash %}
$ apt-get install -y nova-api nova-cert novnc nova-consoleauth nova-scheduler nova-novncproxy nova-doc nova-conductor
{% endhighlight %}

修改 */etc/nova/api-paste.ini* 中有关认证的部分：
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

替换 */etc/nova/nova.conf* 文件为以下内容：
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
vncserver_proxyclient_address=10.10.10.51
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
{% endhighlight %}

接下来，同步数据库，重启nova组件下的所有服务。
{% highlight bash %}
$ nova-manage db sync
$ cd /etc/init.d/; for i in $( ls nova-* ); do sudo service $i restart; done
{% endhighlight %}

运行以下命令检查所有nova服务是否正确启动，查看每个nova服务是不是有一个笑脸符号<:)>，如果有笑脸符号表示服务正确启动，否则需要查看系统日志排查。
{% highlight bash %}
$ nova-manage service list
{% endhighlight %}

##Cinder
安装相关软件包：
{% highlight bash %}
$ apt-get install -y cinder-api cinder-scheduler cinder-volume iscsitarget open-iscsi iscsitarget-dkms
{% endhighlight %}

配置 iscsi 服务：
{% highlight bash %}
$ sed -i 's/false/true/g' /etc/default/iscsitarget
{% endhighlight %}

重启所有服务：
{% highlight bash %}
$ service iscsitarget start
$ service open-iscsi start
{% endhighlight %}

按照以下内容配置 */etc/cinder/api-paste.ini* ：
{% highlight bash %}
[filter:authtoken]
paste.filter_factory = keystoneclient.middleware.auth_token:filter_factory
service_protocol = http
service_host = 192.168.100.51
service_port = 5000
auth_host = 10.10.10.51
auth_port = 35357
auth_protocol = http
admin_tenant_name = service
admin_user = cinder
admin_password = service_pass
signing_dir = /var/lib/cinder
{% endhighlight %}

编辑文件 */etc/cinder/cinder.conf* 为：
{% highlight bash %}
[DEFAULT]
rootwrap_config=/etc/cinder/rootwrap.conf
sql_connection = mysql://cinderUser:cinderPass@10.10.10.51/cinder
api_paste_config = /etc/cinder/api-paste.ini
iscsi_helper=ietadm
volume_name_template = volume-%s
volume_group = cinder-volumes
verbose = True
auth_strategy = keystone
iscsi_ip_address=10.10.10.51
{% endhighlight %}

同步数据库，创建一个名为 *cinder-volumes* 的 volumegroup，注意你此时的工作路径，以下命令创建产生的卷会存在当前的工作路径下。
{% highlight bash %}
$ cinder-manage db sync
$ dd if=/dev/zero of=cinder-volumes bs=1 count=0 seek=2G
$ losetup /dev/loop2 cinder-volumes
$ fdisk /dev/loop2
#依次在键盘上敲击以下按键
n
p
1
ENTER
ENTER
t
8e
w
{% endhighlight %}

继续创建物理卷：
{% highlight bash %}
$ pvcreate /dev/loop2
$ vgcreate cinder-volumes /dev/loop2
{% endhighlight %}

值得注意一点，volume-group的设置会在你系统重启后消失，为了防止这一点，介绍一种方法，如果你希望了解更多，请参阅末尾的参考资料。编辑文件*/etc/rc.local*，在*before the exit 0 line* 之前加入下面这一句：
{% highlight bash %}
losetup /dev/loop2 %Your_path_to_cinder_volumes%
{% endhighlight %}
**%Your_path_to_cinder_volumes%** 这一句当然要替换成前面提到过的你创建 volume-group 的路径。

最后，重启所有 cinder 服务，查看cinder服务是否正常运行：
{% highlight bash %}
$ cd /etc/init.d/; for i in $( ls cinder-* ); do sudo service $i restart; done
$ cd /etc/init.d/; for i in $( ls cinder-* ); do sudo service $i status; done
{% endhighlight %}

##Horizon
安装软件包，重启http服务：
{% highlight bash %}
$ apt-get install -y openstack-dashboard memcached
$ service apache2 restart; service memcached restart
{% endhighlight %}
这时候，你就可以从Web界面访问OpenStack的各项服务了，当然，控制节点上是没有图形界面的，所以你得从有图形界面的地方访问，如果是在安装三台虚拟的宿主机上（Redhat的桌面环境）访问，输入 *http://192.168.100.51/horizon* 即可，如果是 Internet 上的其他机器，首先需要连接后面会提到的VPN，然后再通过上述链接访问。

##参考资料

1. Github, [OpenStack Grizzly Install Guide][install guide]
2.  mseknibilel, [How to load a volume group after a system reboot][volume-group]

[install guide]: https://github.com/mseknibilel/OpenStack-Grizzly-Install-Guide/blob/OVS_MultiNode/OpenStack_Grizzly_Install_Guide.rst
[volume-group]: https://github.com/mseknibilel/OpenStack-Folsom-Install-guide/blob/master/Tricks%26Ideas/load_volume_group_after_system_reboot.rst
