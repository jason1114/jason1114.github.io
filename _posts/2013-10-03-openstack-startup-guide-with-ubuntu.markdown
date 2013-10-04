---
layout: post
title:  "OpenStack 入门指南：Ubuntu 下 All-In-One 搭建范例"
date:   2013-10-03 09:55:09
categories: ubuntu openstack
lan: cn
abstract: |
 OpenStack 是由 Rackspace 和 NASA 共同主持下开展起来的一个开源项目，目的是为实际需求中公有云以及私有云的部署提供一个可靠而优秀的开源解决方案，经过几年的发展， OpenStack的社区算是同类型的几个开源社区中最活跃的。但是 OpenStack 一直有一个很多人诟病的问题，那就是部署过程比较复杂，容易出错。
---
##引言
OpenStack 是由 [Rackspace][rackspace] 和 [NASA][nasa] 共同主持下开展起来的一个开源项目，目的是为实际需求中公有云以及私有云的部署提供一个可靠而优秀的开源解决方案，经过几年的发展， OpenStack的社区算是同类型的几个开源社区中最活跃的。但是 OpenStack 一直有一个很多人诟病的问题，那就是部署过程比较复杂，容易出错。我实际使用的感受也是如此，并且错误信息提示也不够明确，更加增加了系统工程师的负担，恐怕只有非常熟悉这个项目的人才能够很好地去使用以及部署。

![]({{ site.images }}/openstack-logo.jpg "openstack logo")

本文案例选自 Kevin Jackson 的《OpenStack Cloud Computing Cookbook》一书，经过我反复实践，总结出了正确部署第一个 OpenStack 私有云的方法。对于第一个例子，为确保足够简单，没有主机集群，使用一台物理主机创建一个虚拟机运行所有服务。最终的预期目标是在私有云上运行出一个 Ubuntu 实例。
##准备工作
1. 一个支持 *Hardware Virtualization* 的 CPU. 检验现有CPU是否支持的方法请看[这里][check-hv] ,一般来讲，Intel 的 i 系列开始之后的 CPU 都支持 Hardware Virtualization。
2. 至少 *4G* RAM，*100G* 硬盘空间.当然内存空间越大越好。
3. [Ubuntu Server 12.04 LTS AMD64 ISO][ubuntu server 12.04].虚拟机使用的服务器操作系统，请严格使用此版本，如果使用其他版本（例如 12.04.2,12.04.3,12.04.4 都将因为配置方法不同导致本文后面的操作失败）。
4. [Ubuntu Desktop 12.04 LTS AMD64 ISO ][ubuntu desktop 12.04].物理机的操作系统，如果没有安装这个系统，请下载镜像安装，不要在虚拟机里安装，因为本身这个操作系统还要跑虚拟机，所以为了使得性能下降得不是太严重，请正常硬盘安装此系统。
5. [Ubuntu Server 12.04 Cloud Image][ubuntu server 12.04 cloud image].云实例使用的操作系统，Ubuntu 社区改良后适宜于运行在云端的 Ubuntu 。
##物理主机(Ubuntu Desktop 12.04.0)配置

>提示：在执行所有操作之前，请更换一个速度更快的更新源。

首先下载一个最新的虚拟机软件 [Virtual Box][virtual box download] ，选择适合的版本（Ubuntu 12.04,AMD64）,这样就得到了所需的 DEB 安装包，在安装之前，确保 Virtual Box 用来编译内核的环境已经存在。
{% highlight bash%}
sudo apt-get -y install gcc g++ make
{% endhighlight %}
完成之后，安装此软件包。请不要尝试从 APT 安装 Virtual Box，该版本的 Ubuntu 更新源中的 Virtual Box 存在缺陷。

接下来，需要为即将创建的虚拟机提供配置参数。
{% highlight bash %}
# Public Network vboxnet0 (172.16.0.0/16)
VBoxManage hostonlyif create
VBoxManage hostonlyif ipconfig vboxnet0 --ip 172.16.0.254 --netmask 255.255.0.0
# Private Network vboxnet1 (10.0.0.0/8)
VBoxManage hostonlyif create
VBoxManage hostonlyif ipconfig vboxnet1 --ip 10.0.0.254 --netmask 255.0.0.0

# Create VirtualBox Machine
VBoxManage createvm --name openstack1 --ostype Ubuntu_64 --register
VBoxManage modifyvm openstack1 --memory 2048 --nic1 nat --nic2 hostonly --hostonlyadapter2 vboxnet0 --nic3 hostonly --hostonlyadapter3 vboxnet1

# Create CD-Drive and Attach ISO
VBoxManage storagectl openstack1 --name "IDE Controller" --add ide --controller PIIX4 --hostiocache on --bootable on
VBoxManage storageattach openstack1 --storagectl "IDE Controller" --type dvddrive --port 0 --device 0 --medium ~/Downloads/ubuntu-12.04-server-amd64.iso

# Create and attach SATA Interface and Hard Drive
VBoxManage storagectl openstack1 --name "SATA Controller" --add sata --controller IntelAHCI --hostiocache on --bootable on
VBoxManage createhd --filename openstack1.vdi --size 81920
VBoxManage storageattach openstack1 --storagectl "SATA Controller" --port 0 --device 0 --type hdd --medium openstack1.vdi

# Start the VM
VBoxManage startvm openstack1 --type gui
{% endhighlight %}
上面这段代码，请保存成为可执行的 .sh 文件，并且修改代码中 Ubuntu 镜像的路径，然后在终端中执行。这段代码作用如下：


1. 创建虚拟网络 *vboxnet0* (172.16.0.0/16) ，物理主机加入此虚拟网络并设定固定 IP。
2. 创建虚拟网络 *vboxnet1* (10.0.0.0/8) ，物理主机加入此虚拟网络并设定固定 IP。
3. 创建 Ubuntu 虚拟机，该虚拟机分配 *2G* 内存，并依次加入3个虚拟网络（拥有3个虚拟网卡）：物理主机和虚拟主机之间 NAT 网络（用于上网），vboxnet0 和 vboxnet1。
4. 为虚拟机创建虚拟光驱，并且把 Ubuntu 镜像挂载到此虚拟光驱上，便于首次启动时安装操作系统
5. 为此虚拟机创建一块 *40G* 的虚拟 SATA 硬盘，当然如果更大那更加好。
6. 启动此虚拟机。

这个时候，在 Virtual Box 虚拟机窗口应该就会出现 Ubuntu Server 基于字符界面的安装向导了，为了后面操作的方便，安装的时候需要注意：
1. 语言选择英文
2. *Locale* 选择 *HongKong*
3. *Primary network interface* 选择 *eth0*
4. 创建的用户名和密码均为 *openstack*
5. *Partitioning method* 选择 *Guided - use entire disk and set up LVM*
6. 更新选项选择 *No automatic updates*
7. 选择预装的软件的时候使用空格键选择 *OpenSSH server*

安装完成之后，虚拟机就会自动重启，很快你就能看到基于字符的登录界面了，用户名密码均为 *openstack* ，接下来将进入虚拟机配置环节。

##虚拟主机(Ubuntu Server 12.04.0)配置

>提示：在执行所有操作之前，请更换一个速度更快的更新源。

>执行本节操作之前，请确认虚拟主机操作系统严格为 Ubuntu Server 12.04.0 AMD64

在前面的配置中，虚拟主机拥有三块虚拟网卡，分别加入了三个虚拟网络，在这里我们要对这三个网络进行具体的配置：
{% highlight bash %}
# The loopback network interface
auto lo
iface lo inet loopback

# The primary network interface
auto eth0
iface eth0 inet dhcp

# Public Interface
auto eth1
iface eth1 inet static
  address 172.16.0.1
  netmask 255.255.0.0
  network 172.16.0.0
  broadcast 172.16.255.255

# Private Interface
auto eth2
iface eth2 inet manual
  up ifconfig eth2 up
{% endhighlight %}
备份 */etc/network/interfaces* 文件，然后用上面的代码替换之。

在终端中运行下面的命令使配置生效：
{% highlight bash %}
$ sudo ifup eth1
$ sudo ifup eth2
{% endhighlight %}
这个时候，可以把虚拟机的窗口最小化了，我们可以通过 SSH 从物理主机登录到虚拟机进行剩下来的操作。这么做主要是因为虚拟机里的操作系统是完全字符界面的，如果一行的输出过多，可能需要借用 *more* 或者 *less* 命令才能看到完整输出。从物理机打开图形的命令行终端 SSH 登录虚拟机则好用得多，而且还方便粘贴命令,下面的命令就可以从物理机登录到虚拟机 SHELL。接下来我们所有的操作都可以通过这个 SHELL 来完成，而不再需要在那个虚拟机窗口的字符界面，当然两者的效果实际上是一样的。
{% highlight bash %}
$ ssh openstack@172.16.0.1
{% endhighlight %}

安装 OpenStack 环境：
{% highlight bash %}
sudo apt-get update
sudo apt-get -y install rabbitmq-server nova-api nova-objectstore nova-scheduler nova-network nova-compute nova-cert glance qemu unzip ntp
{% endhighlight %}
接下来，配置 NTP ，NTP 是 UNIX 世界里多台主机之间用来进行时间的同步的工具，打开 */etc/ntp.conf*,找到下面这一行：
{% highlight bash %}
server ntp.ubuntu.com
{% endhighlight %}
在这一行下面增加2行：
{% highlight bash %}
server 127.127.1.0
fudge 127.127.1.0 stratum 10
{% endhighlight %}
重新启动 NTP：
{% highlight bash %}
$ sudo service ntp restart
{% endhighlight %}
*nova* 就是 OpenStack 中负责建立虚拟机实例的组件， nova 的数据可以保存在 *MySQL* 数据库中，所以要为 nova 安装配置 MySQL。
{% highlight bash%}
$ sudo su
$ cat <<MYSQL_PRESEED | debconf-set-selections
mysql-server-5.1 mysql-server/root_password password openstack
mysql-server-5.1 mysql-server/root_password_again password openstack
mysql-server-5.1 mysql-server/start_on_boot boolean true
MYSQL_PRESEED
$ exit
$ sudo apt-get -y install mysql-server
$ sudo sed -i 's/127.0.0.1/0.0.0.0/g' /etc/mysql/my.cnf
$ sudo service mysql restart

$ MYSQL_PASS=openstack
$ mysql -uroot -p$MYSQL_PASS -e 'CREATE DATABASE nova;'
$ mysql -uroot -p$MYSQL_PASS -e "GRANT ALL PRIVILEGES ON nova.* TO 'nova'@'%'"
$ mysql -uroot -p$MYSQL_PASS -e "SET PASSWORD FOR 'nova'@'%' = PASSWORD('$MYSQL_PASS');"
{% endhighlight %}
上面的一系列命令的意思为，为 MySQL 数据库的 ROOT 用户设定密码为 openstack,同时为名为 nova 的用户足够的权利访问名为 nova 的数据库（当然前提是先创建好 nova 数据库）。

通过 APT 安装的 nova 还需要进行一定的设置，配置文件位于 */etc/nova/nova.conf* ,请复制下面的配置信息覆盖原来的配置文件。
{% highlight bash %}
--dhcpbridge_flagfile=/etc/nova/nova.conf
--dhcpbridge=/usr/bin/nova-dhcpbridge
--logdir=/var/log/nova
--state_path=/var/lib/nova
--lock_path=/var/lock/nova
--force_dhcp_release
--iscsi_helper=tgtadm
--libvirt_use_virtio_for_bridges
--connection_type=libvirt
--root_helper=sudo nova-rootwrap
--ec2_private_dns_show_ip
--sql_connection=mysql://nova:openstack@172.16.0.1/nova
--use_deprecated_auth
--s3_host=172.16.0.1
--rabbit_host=172.16.0.1
--ec2_host=172.16.0.1
--ec2_dmz_host=172.16.0.1
--public_interface=eth1
--image_service=nova.image.glance.GlanceImageService
--glance_api_servers=172.16.0.1:9292
--auto_assign_floating_ip=true
--scheduler_default_filters=AllHostsFilter
{% endhighlight %}

另外还有一个需要增加的配置文件，打开 */etc/nova/nova-compute.conf* 文件，把下面这行内容替换原文件内容。
{% highlight bash %}
--libvirt_type=qemu
{% endhighlight %}

接下来，在修改完 nova 配置之后，要使数据库和 nova 同步，还要为 nova 之后生成的实例分配 ip 。
{% highlight bash %}
$ sudo nova-manage db sync
$ sudo nova-manage network create vmnet --fixed_range_v4=10.0.0.0/8 --network_size=64 --bridge_interface=eth2
$ sudo nova-manage floating create --ip_range=172.16.1.0/24
{% endhighlight %}

重启 OpenStack 服务。
{% highlight bash %}
$ sudo stop nova-compute
$ sudo stop nova-network
$ sudo stop nova-api
$ sudo stop nova-scheduler
$ sudo stop nova-objectstore
$ sudo stop nova-cert

$ sudo stop libvirt-bin
$ sudo stop glance-registry
$ sudo stop glance-api

$ sudo start nova-compute
$ sudo start nova-network
$ sudo start nova-api
$ sudo start nova-scheduler
$ sudo start nova-objectstore
$ sudo start nova-cert

$ sudo start libvirt-bin
$ sudo start glance-registry
$ sudo start glance-api
{% endhighlight %}

接下来，需要为访问 nova 服务建立个帐号。

{% highlight bash %}
sudo nova-manage user admin openstack
sudo nova-manage role add openstack cloudadmin
sudo nova-manage project create cookbook openstack
sudo nova-manage project zipfile cookbook openstack
{% endhighlight %}

新建的帐号 openstack 属于管理员用户组，并且为这个帐号创建了一个 project 客户端可以通过这个 project 完成身份认证，进而访问 nova 服务，执行完上面的指令后会在当前的工作路径生成一个 *nova.zip* ,这个即为 project ，随后物理机的客户端会下载这个 project ，并且通过它访问 nova 服务。

##冒险开始！

至此，虚拟机上的 OpenStack 服务搭建完毕，客户端已经可以访问 nova 的服务了，这里选择物理机上的 Ubuntu 作为客户端（以下的命令都是在物理机上运行的），不过在此之前，客户端还是需要安装访问 nova 需要的客户端工具。
{% highlight bash %}
$ sudo apt-get install euca2ools python-novaclient unzip cloud-utils
{% endhighlight %}

通过 SSH 下载虚拟机上的 nova.zip 文件,并解压。
{% highlight bash %}
$ cd
$ mkdir openstack
$ cd openstack
$ scp openstack@172.16.0.1:nova.zip . 
$ unzip nova.zip
$ . novarc
$ nova keypair-add openstack > openstack.pem
$ sudo chmod 0600 *.pem
{% endhighlight %}
最后3行有必要解释一下。 *novarc* 是通过 nova.zip 解压得到，包含了访问 nova 服务的必要信息，其中也包括帐号信息， *. novarc* 是把这些信息加载到环境变量，以便客户端工具能够访问这些信息并获取访问 nova 服务的权限。随后生成一对非对称密钥 *openstack* ,并且赋予适当的访问权限。

还记得前面提到的 [Ubuntu Server 12.04 Cloud Image][ubuntu server 12.04 cloud image] 吗，这个镜像里的操作系统就是云实例的操作系统。在运行第一个实例之前要先把这个镜像上传到 nova (注意镜像的路径)。
{% highlight bash %}
$ cloud-publish-tarball ubuntu-12.04-server-cloudimg-i386.tar.gz images i386
{% endhighlight %}
上传成功后可以通过 *nova image-list* 命令来查看已经上传的镜像。如下图所示
![]({{ site.images }}/openstack-nova-image-list.png "nova image list")

到这里距离真正跑一个实例还剩最后一步：设置 *security group* ,通常意义上也可以认为是防火墙。

{% highlight bash %}
$ nova secgroup-add-rule default tcp 22 22 0.0.0.0/0
$ nova secgroup-add-rule default icmp -1 -1 0.0.0.0/0
{% endhighlight %}
这里设置的是一个默认的 default 如果新建一个实例的时候没有指定特定的 *security group* ，那么则默认为 default 。这两行是为实例开放了 SSH 端口访问和 PING 端口访问。

启动吧，第一个例子！
{% highlight bash %}
$ nova boot myInstance --image d8cd517a-2a6d-4462-9db2-b107886c3279 --flavor 2 --key_name openstack
{% endhighlight %}
*myInstance* 是实例的名称，*--image* 后面的一串数字是上传镜像后镜像对应的 ID ，而 *--keyname* 则是之前生成的那对非对称密钥的路径，*--flavor* 可以认为是为实例分配计算配额（CPU、RAM）的级别。

使用命令 *nova-list* 可以查看所有实例的运行状态，当刚刚运行的实例状态从 *BUILD* 变成 *ACTIVE* 时，就可以通过 SSH 登录这个云端实例了！

> 这一步如果实例的状态为 ERROR,请尝试之前重启所有 OpenStack 服务的步骤。

{% highlight bash %}
$ ssh -i openstack.pem ubuntu@172.16.1.1
{% endhighlight %}

同样，*openstack.pem* 属于之前生成的那对非对称密钥，注意具体引用路径。

云实例就和普通的操作系统一样，你可以在上面干绝大多数事情，比如部署你的应用，部署数据库服务器等。

但是云主机还有一个好处，那就是虚拟机可以随时收回重新分配。当你玩得差不多了，只需要一个命令，刚刚创建的那个实例可以立刻消失。
{% highlight bash %}
$ nova delete myInstance
{% endhighlight %}

##参考资料
1. Kevin Jackson, 《OpenStack Cloud Computing Cookbook》

[rackspace]: http://www.rackspace.com "Rackspace"
[nasa]: http://www.nasa.gov "NASA"
[check-hv]: https://help.ubuntu.com/community/KVM/Installation
[ubuntu server 12.04]: http://old-releases.ubuntu.com/releases/12.04.0/ubuntu-12.04-server-amd64.iso
[ubuntu desktop 12.04]: http://old-releases.ubuntu.com/releases/12.04.0/ubuntu-12.04-desktop-amd64.iso
[ubuntu server 12.04 cloud image]: http://cloud-images.ubuntu.com/precise/current/precise-server-cloudimg-amd64.tar.gz
[virtual box download]:https://www.virtualbox.org/wiki/Downloads
