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
##参考资料
1. Kevin Jackson, OpenStack Cloud Computing Cookbook

[rackspace]: http://www.rackspace.com "Rackspace"
[nasa]: http://www.nasa.gov "NASA"
[check-hv]: https://help.ubuntu.com/community/KVM/Installation
[ubuntu server 12.04]: http://old-releases.ubuntu.com/releases/12.04.0/ubuntu-12.04-server-amd64.iso
[ubuntu desktop 12.04]: http://old-releases.ubuntu.com/releases/12.04.0/ubuntu-12.04-desktop-amd64.iso
[ubuntu server 12.04 cloud image]: http://cloud-images.ubuntu.com/precise/current/precise-server-cloudimg-amd64.tar.gz
