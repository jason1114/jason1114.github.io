---
layout: post
title:  "OpenStack 实战 - 多节点部署案例（六）：运行使用"
date:    2014-02-19 14:10:39
categories: openstack ubuntu vpn
lan: cn
abstract: |
 前面的博文中已经陆续介绍了本案例中各个节点的配置要点，并根据我的实践，对可能遇到的故障给出了解决方案，如今所有的节点已经就绪了，是时候运行我们的第一个虚拟机了。同时为了方便我们创建的虚拟机更易于使用，这里介绍一种使用VPN从外网访问虚拟机的方案。
---
##摘要
前面的博文中已经陆续介绍了本案例中各个节点的配置要点，并根据我的实践，对可能遇到的故障给出了解决方案，如今所有的节点已经就绪了，是时候运行我们的第一个虚拟机了。同时为了方便我们创建的虚拟机更易于使用，这里介绍一种使用VPN从外网访问虚拟机的方案。

##VPN网关

再回过头来看最初的概述中提出的架构图：

![]({{ site.images }}/openstack-multinode-network-architecture.png "Architechture Two")

在这个图当中，还没有设置完成的就只剩下VPN网关了，设置VPN的目的，一是保护内网安全，防止外网用户直接访虚拟机，二是提供外网的可信用户能够方便地访问这些虚拟机，这个VPN网关的主要参数如下：

1. 只有一个网络接口eth0，IP地址：192.168.100.2 。
2. 对性能要求不高，所以以VM形式存在，虚拟化技术可以使用 VMWare 。

对于在Ubuntu下面设置VPN网关，之前我写过一篇博客作过详细介绍（[如何在亚马逊云（Amazon EC2）上建立一个VPN服务器 ][vpn]），由于操作系统都是 Ubuntu ，没什么好说的，这里不再赘述。

为了使外网能够访问这个VPN网关，可以在路由器上作一些配置，把 VPN 网关设成DMZ主机，或者在路由器上作端口映射，都可以，完成之后，找一台在外网上的主机，连接到VPN，SSH内网上的任意一个节点都OK。

##第一个虚拟机

这时候一切已经就绪了，你已经挂上VPN，SSH到控制节点，在终端载入*认证文件*，如果你没有载入 *认证文件* 下面的一系列操作都将失败。在开启第一个VM之前，我们需要创建一个 tenant，一个用户，以及一个内部网络。

>以下操作不能直接复制执行，命令中涉及到一些变量，要根据前面的命令的输出填上相应的值，实际执行的时候可以打开一个编辑器，记录这些命令的输出，复制到下一个命令的参数里，也可以在一个命令执行完之后，手动在终端设置这些变量的值。

创建 tenant 、用户，并且在这个tenant 里把*Member*角色赋给这个用户（Member角色的id可以通过 *keystone role-list* 获取）：
{% highlight bash %}
$ keystone tenant-create --name project_one
$ keystone user-create --name=user_one --pass=user_one --tenant-id $put_id_of_project_one --email=user_one@domain.com
$ keystone user-role-add --tenant-id $put_id_of_project_one  --user-id $put_id_of_user_one --role-id $put_id_of_member_role
{% endhighlight %}

为这个 tenant 创建一个网络，并且在这个 tenant 网络里创建一个子网：
{% highlight bash %}
$ quantum net-create --tenant-id $put_id_of_project_one net_proj_one
$ quantum subnet-create --tenant-id $put_id_of_project_one net_proj_one 50.50.1.0/24 --dns_nameservers list=true 8.8.8.7 8.8.8.8
{% endhighlight %}

为 tenant 创建一个路由器，把这个路由器加入到运行中的 I3 agent，把路由器加到之前的子网，然后重启所有 Quantum 服务：
{% highlight bash %}
$ quantum router-create --tenant-id $put_id_of_project_one router_proj_one
$ quantum agent-list (to get the l3 agent ID)
$ quantum l3-agent-router-add $l3_agent_ID router_proj_one
$ quantum router-interface-add $put_router_proj_one_id_here $put_subnet_id_here
$ cd /etc/init.d/; for i in $( ls quantum-* ); do sudo service $i restart; done
{% endhighlight %}

创建一个外部网络，这个外部网络属于 *admin* 这个 tenant，*admin* 的 tenant id 可以通过命令 *keystone tenant-list* 获取，创建一个产生浮动IP的内网，最后把之前路由器网关设置到这个外部网络：

{% highlight bash %}
$ quantum net-create --tenant-id $put_id_of_admin_tenant ext_net --router:external=True
$ quantum subnet-create --tenant-id $put_id_of_admin_tenant --allocation-pool start=192.168.100.102,end=192.168.100.126 --gateway 192.168.100.1 ext_net 192.168.100.100/24 --enable_dhcp=False
$ quantum router-gateway-set $put_router_proj_one_id_here $put_id_of_ext_net_here
{% endhighlight %}

到这里你要明白，你使用你刚刚创建的名叫 project_one 的 tenant，创建出来的虚拟机，首先会被分配一个内网IP，这个内网就是子网 *50.50.1.0/24*。你无法通过这个IP从外部访问虚拟机，这些IP被NAT转化后，你要访问他们是通过浮动IP，浮动IP的范围是 *192.168.100.102* - *192.168.100.126* ，通过浮动IP访问虚拟机的时候，会在之前创建的虚拟路由器上做一个映射，也就是说，需要为一个虚拟机的内网IP映射一个可被访问的浮动IP。

把之前创建的 tenant 保存成认证文件，并且载入这个认证文件，然后为这个 tenant 下的虚拟机设置默认的防火墙规则，这里仅允许，icmp（PING 命令）和 SSH 的端口：

{% highlight bash %}
$ nano creds_proj_one

#Paste the following:
export OS_TENANT_NAME=project_one
export OS_USERNAME=user_one
export OS_PASSWORD=user_one
export OS_AUTH_URL="http://192.168.100.51:5000/v2.0/"

$ source creds_proj_one
$ nova --no-cache secgroup-add-rule default icmp -1 -1 0.0.0.0/0
$ nova --no-cache secgroup-add-rule default tcp 22 22 0.0.0.0/0
{% endhighlight %}

分配一个浮动IP，以某个镜像（可以是*cirros* ，或者是 *Ubuntu Cloud Image* ）启动一个新的虚拟机，列出刚刚生成的虚拟机的网络接口，把浮动IP与网络接口相连接：

{% highlight bash %}
$ quantum floatingip-create ext_net
$ nova --no-cache boot --image $id_myFirstImage --flavor 1 my_first_vm
$ quantum port-list
$ quantum floatingip-associate $put_id_floating_ip $put_id_vm_port
{% endhighlight %}

这就完成了，使用浮动IP去 Ping 刚刚生成的虚拟机吧，也可以使用 SSH 上去做任何你想做的事情。另外除了这种命令行的方法还可以使用图形界面的方法，还记得控制节点的 Horizon 服务吗？使用 user_one/user_one 登陆 *192.168.100.51/horizon* 也可以以图形的方式执行上面一系列的操作并创建虚拟机，很简单。不过命令行有着图形界面难以超越的优点：非常容易自动化。只要你编写适合你的业务的脚本，一切工作都是自动化的。到这里，OpenStack 多节点部署案例暂时告一段落，我对这方面的工作也已经搁置。不知道今后还会不会再接触这方面的工作。


##参考资料
1. Github, [OpenStack Grizzly Install Guide][install guide]
2. [如何在亚马逊云（Amazon EC2）上建立一个VPN服务器 ][vpn]

[install guide]: https://github.com/mseknibilel/OpenStack-Grizzly-Install-Guide/blob/OVS_MultiNode/OpenStack_Grizzly_Install_Guide.rst
[vpn]: http://clever-lin.tk/articles/2013/08/28/how-to-setup-a-vpn-server-on-aws.html
