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
0. 一个支持 *Hardware Virtualization* 的 CPU. 检验现有CPU是否支持的方法请看[这里][check-hv] ,一般来讲，Intel 的 i 系列开始之后的 CPU 都支持 Hardware Virtualization。
0. 至少 *4G* RAM，*100G* 硬盘空间.当然内存空间越大越好。
1. [Ubuntu Server 12.04 LTS AMD64 ISO][ubuntu server 12.04].虚拟机使用的服务器操作系统，请严格使用此版本，如果使用其他版本（例如 12.04.2,12.04.3,12.04.4 都将因为配置方法不同导致本文后面的操作失败）。
2. [Ubuntu Desktop 12.04 LTS AMD64 ISO ][ubuntu desktop 12.04].物理机的操作系统，如果没有安装这个系统，请下载镜像安装，不要在虚拟机里安装，因为本身这个操作系统还要跑虚拟机，所以为了使得性能下降得不是太严重，请正常硬盘安装此系统。
3. [Ubuntu Server 12.04 Cloud Image][ubuntu server 12.04 cloud image].云实例使用的操作系统，Ubuntu 社区改良后适宜于运行在云端的 Ubuntu 。
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
##参考资料
1. Kevin Jackson, OpenStack Cloud Computing Cookbook

[rackspace]: http://www.rackspace.com "Rackspace"
[nasa]: http://www.nasa.gov "NASA"
[check-hv]: https://help.ubuntu.com/community/KVM/Installation
[ubuntu server 12.04]: http://old-releases.ubuntu.com/releases/12.04.0/ubuntu-12.04-server-amd64.iso
[ubuntu desktop 12.04]: http://old-releases.ubuntu.com/releases/12.04.0/ubuntu-12.04-desktop-amd64.iso
[ubuntu server 12.04 cloud image]: http://cloud-images.ubuntu.com/precise/current/precise-server-cloudimg-amd64.tar.gz
[virtual box download]:https://www.virtualbox.org/wiki/Downloads
