---
layout: post
title:  "OpenStack 实战 - 多节点部署案例（二）：控制节点（上）"
date:   2014-02-11 10:19:49
categories: ubuntu openstack
lan: cn
abstract: |
 接着上一篇博文，如果你已经在所有机器上准备好正确的操作系统（每个节点都是 Ubuntu Server 13.04 ），网络设置正确，那么就可以开始部署OpenStack环境了，本文从控制节点的部署开始讲解，在控制节点的部署之前会插入一小段说明上一篇的准备工作中提到的路由器的配置，以及VMWare在配置多个以太网接口时需要注意的一些小问题。
---
##引言

接着上一篇博文，如果你已经在所有机器上准备好正确的操作系统（每个节点都是 Ubuntu Server 13.04 ），网络设置正确，那么就可以开始部署OpenStack环境了，本文从控制节点的部署开始讲解，在控制节点的部署之前会插入一小段说明上一篇的准备工作中提到的路由器的配置，宿主机的网络设置以及VMWare在配置多个以太网接口时需要注意的一些小问题。

##路由器设置

上一篇博文最后给出了一张最后部署结构图，如下所示：

![]({{ site.images }}/openstack-multinode-network-architecture.png "Architechture Two")

图中的路由器是需要拥有Internet访问能力的，外网IP设置为正常能上网的IP，ADSL，固定IP，或者DHCP，为了后文描述方便，本文连接方式为固定IP，IP地址为：*204.232.175.78*，所在内网为*192.168.100.0/24*,路由器内网IP：*192.168.100.1* 。

##宿主机的网络设置
宿主机上的VMWare平台下安装了网络节点，控制节点以及VPN网关，宿主机有两个实际物理网口，eth0连接交换机，不作任何配置；eth1连接路由器内网，IP设置为 *192.168.100.50*。

##VMWare多网络接口注意问题
网络节点的eth2是虚拟网桥占用的接口，需要这个接口工作在*网卡的混杂模式*下，笔者实验的时候，三个虚拟节点所用的虚拟化技术是VMWare，在VMWare下创建的虚拟机内部的网卡即使配置为混杂模式，依然不能监听数据包，所以需要额外配置。

>网卡的混杂模式：工作在这个模式下的网卡会捕获当前以太网上的所有数据包，不论该数据包是否是发给自己的，通常用于网络监听。

本文介绍一种最简单的配置方法，详细了解这一过程请参阅参考资料。注意一点，这里的配置是对VMWare进行配置，所以这些操作都在网络节点这个虚拟机所在的宿主机上配置，前文提到过，笔者使用的宿主机操作系统为 *Redhat* 。

首先，赋予所有用户可以使虚拟网卡工作在混杂模式下的权限。
{% highlight bash %}
$ su
$ chmod a+rw /dev/vmnet* 
{% endhighlight %}

执行完这个命令之后，重启VMWare即可生效，但是这个方法只会在本次有效，当重启操作系统的时候就失效了，要使这项权限再重启后依然保留，需要在 */etc/init.d/vmware* 这个文件的 *vmwareStartVmnet* 方法中加入:
{% highlight bash %}
chmod a+rw /dev/vmnet*
{% endhighlight %}

变成：
{% highlight bash %}
vmwareStartVmnet() {
  vmwareLoadModule $vnet
  "$BINDIR"/vmware-networks --start >> $VNETLIB_LOG 2>&1
  chmod a+rw /dev/vmnet*
}
{% endhighlight %}

##准备Ubuntu
这一节包括后面的小节，所有命令都是在root权限下执行的，为了避免每次运行sudo，切换终端用户至root。
{% highlight bash %}
$ sudo su
{% endhighlight %}

使操作系统，和软件包列表都更新至最新。
{% highlight bash %}
$ apt-get update -y
$ apt-get upgrade -y
$ apt-get dist-upgrade -y
{% endhighlight %}

##网络设置
编辑 */etc/networking/interfaces* 为以下内容：
{% highlight bash %}
#For Exposing OpenStack API over the internet
auto eth1
iface eth1 inet static
address 192.168.100.51
netmask 255.255.255.0
gateway 192.168.100.1
dns-nameservers 8.8.8.8

#Not internet connected(used for OpenStack management)
auto eth0
iface eth0 inet static
address 10.10.10.51
netmask 255.255.255.0
{% endhighlight %}

控制节点接入两个网路：

1. eth0-管理网络（10.10.10.0/24），无Internet访问权限，IP（*10.10.10.51*）；
2. eth1-路由器内网（192.168.100.0/24），Internet访问权限，IP（*192.168.100.51*）。

重启服务以生效：
{% highlight bash %}
$ service networking restart
{% endhighlight %}

##MySQL 和 RabbitMQ
安装 *MySQL* ：
{% highlight bash %}
$ apt-get install -y mysql-server python-mysqldb
{% endhighlight %}
这个过程中会询问设置MySQL的root密码，设置好，并且记住这个密码，要是忘了root密码可是很麻烦的。

配置MySQL允许除自己外来自别的IP的请求：
{% highlight bash %}
$ sed -i 's/127.0.0.1/0.0.0.0/g' /etc/mysql/my.cnf
$ service mysql restart
{% endhighlight %}

##RabbitMQ
RabbitMQ 是个高性能消息队列，NTP提供Unix环境下的时间同步问题，首先是安装他们俩：
{% highlight bash %}
$ apt-get install -y rabbitmq-server
$ apt-get install -y ntp
{% endhighlight %}

我们目标要把OpenStack所有组件的配置、状态保存在MySQL中，所以要为它们创建各自的数据库：
{% highlight bash %}
$ mysql -u root -p

#Keystone
CREATE DATABASE keystone;
GRANT ALL ON keystone.* TO 'keystoneUser'@'%' IDENTIFIED BY 'keystonePass';

#Glance
CREATE DATABASE glance;
GRANT ALL ON glance.* TO 'glanceUser'@'%' IDENTIFIED BY 'glancePass';

#Quantum
CREATE DATABASE quantum;
GRANT ALL ON quantum.* TO 'quantumUser'@'%' IDENTIFIED BY 'quantumPass';

#Nova
CREATE DATABASE nova;
GRANT ALL ON nova.* TO 'novaUser'@'%' IDENTIFIED BY 'novaPass';

#Cinder
CREATE DATABASE cinder;
GRANT ALL ON cinder.* TO 'cinderUser'@'%' IDENTIFIED BY 'cinderPass';

quit;
{% endhighlight %}

这里的配置有一定规律，比如 *keystone* 这个组件，创建的数据库名称就是 keystone ，用户名是 keystoneUser ，密码是 keystonePass ，其他组件也一样，如果你要在这里修改成自己想使用的用户名密码，不要忘记在后面其他需要使用到这些用户名密码的地方也同样改成自定义的用户名密码。这个系列的博客就使用默认的用户名密码。
##其他
安装一些其他软件，同时启用IP转发：
{% highlight bash %}
$ apt-get install -y vlan bridge-utils
$ sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
# To save you from rebooting, perform the following
$ sysctl net.ipv4.ip_forward=1
{% endhighlight %}

这些都是一些准备工作，接下来的博客将涉及控制节点真正核心组件的安装配置。

##参考资料

1. Github, [OpenStack Grizzly Install Guide][install guide]
2. Dan Nanni, [How to use virtual Ethernet adapters in promiscuous mode on VMware][promiscuous]

[install guide]: https://github.com/mseknibilel/OpenStack-Grizzly-Install-Guide/blob/OVS_MultiNode/OpenStack_Grizzly_Install_Guide.rst
[promiscuous]: http://xmodulo.com/2013/05/how-to-use-virtual-ethernet-adapters-in-promiscuous-mode-on-vmware.html
