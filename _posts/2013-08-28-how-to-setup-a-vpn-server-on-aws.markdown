---
layout: post
title:  "如何在亚马逊云（Amazon EC2）上建立一个VPN服务器"
date:   2013-08-28 17:20:10
categories: vpn aws
lan: cn
abstract: |
 搭建一个VPN服务器也是个很棒的选择，至于为什么要这么做，大家都懂吧，国内互联网的现状让我们上个Facebook什么的都很麻烦，有VPN就不一样了，AWS的服务器在北美，在VPN网关开启ipv4数据包转发后，那么我们可以想象自己就位于北美的某个局域网内，自然所有的国外网站都能访问了^_^。
---
##引言
自从亚马逊推出云计算服务（Amazon Webservice.以下简称AWS）以来，收到不少好评。亚马逊云优点很多，在国内访问速度快、性能稳定，而且同国内的不少VPS提供商相比价格也很便宜。还有很重要的一点就是AWS对于新注册用户，提供一年时间的最小额度免费试用。这个最小额度大概是一个双核CPU，613MB内存，30GB硬盘存储。具体配额请看 [这里][free tier] 。

这样的一个环境很适合跑一个博客或者其他程序什么的了，当然搭建一个VPN服务器也是个很棒的选择，至于为什么要这么做，大家都懂吧，国内互联网的现状让我们上个Facebook什么的都很麻烦，有VPN就不一样了，AWS的服务器在北美，在VPN网关开启ipv4数据包转发后，那么我们可以想象自己就位于北美的某个局域网内，自然所有的国外网站都能访问了^_^。
![](http://carpenter.qiniudn.com/amazon-vpn-principle.png "vpn principle")

VPN技术目前比较成熟，也有不同的实现方案，有PPTP，L2TP，也有基于IPSec的，大致看来L2TP和IPSec安全性较高，但是配置起来较为繁琐，而PPTP安全性较以上两者较差，但是由于其配置简单，目前也有十分广泛的应用，本文基于PPTP的配置，位于亚马逊云上EC2服务器的操作系统为Ubuntu 13.04,客户端也以Ubuntu 13.04和Android 2.3为例子，Windows下支持PPTP的VPN客户端软件很多，不过方法也和本文介绍大同小异。

##服务器端（Ubuntu 13.04）配置
如果你还没有一个亚马逊云主机，我提供给你一个[申请教程][sign up for aws]，随着时间的推移，实际申请界面会有些许变化，但是大致是相同的，为了配合后面的步骤，请在安装操作系统的时候选择 Ubuntu 13.04,请你在你能够以SSH方式登录云端操作系统（Windows用户可以使用Putty）之后再回来看本文后面的内容。

首先以SSH方式登录EC2主机，看到欢迎信息后确认主机还有足够的空间，使用apt包管理程序安装PPTP服务器，在ssh提供的命令行界面输入以下指令。
{% highlight bash %}
sudo apt-get install pptpd
{% endhighlight %}
安装完成之后需要对PPTP服务器进行配置，可以使用任何一款文本编辑器，以VI为例：
{% highlight bash %}
sudo vi /etc/pptpd.conf
{% endhighlight %}
在文件的底部加上以下两行。其中 *localip* 指的是当VPN网关工作起来后自身在这个虚拟网络中的IP地址，  *remoteip* 值的是外部主机加入这个虚拟私有网后分配给它们的ip地址，这是一个地址范围，当地址分配完毕的时候就不再允许别的主机加入。
{% highlight bash %}
localip 192.168.240.1       # <1>
remoteip 192.168.240.2-9    # <2>
{% endhighlight %}
接下去要为这个虚拟私有网设置DNS服务器，谷歌的DNS是个很不错的选择，编辑以下文件：
{% highlight bash %}
sudo vi /etc/ppp/pptpd-options
{% endhighlight %}
在文件末尾处加上以下两行。
{% highlight bash %}
ms-dns 8.8.8.8
ms-dns 8.8.4.4
{% endhighlight %}
先不要退出这个配置文件，继续在文件查找一下行，如果找到，请将这一行注释（行首加上"#"）。
{% highlight bash %}
require-mppe-128
{% endhighlight %}
上面这一句的意思是使用MPPE 128位加密，实际上PC端是能做到的，但是低版本的Android并不支持，本面后来要配置Android连接VPN，所以这里去掉这个配置项。

如何连接到这个网络呢，这涉及到认证，说白了就是用户名密码，运行以下命令，注意把其中的 *USERNAME* 和 *PASSWORD* 设置成自己喜欢的用户名密码，星号表示不限制客户机机来源。这个命令的作用就是把客户机连接时的用户名密码写入指定的配置文件。
{% highlight bash %}
echo "USERNAME pptpd PASSWORD *" | sudo tee -a /etc/ppp/chap-secrets
{% endhighlight %}
输入以下命令重启PPTP服务器，刚才的设置就会生效了，生效之后理论上讲客户端就能够凭借刚才的用户名密码连接到VPN网关了。
{% highlight bash %}
sudo /etc/init.d/pptpd restart
{% endhighlight %}
但是此时虽然可以连上VPN网关但是你会发现连上后反而上不了网了，这是因为服务器尚未打开IPV4数据包转发。编辑配置文件：
{% highlight bash %}
sudo vi /etc/sysctl.conf
{% endhighlight %}
在这个文件中找到下面这被注释的一行，把该行的注释去掉（删除行前的井号），令这一行配置生效。
{% highlight bash %}
net.ipv4.ip_forward=1
{% endhighlight %}
为了检测刚才修改的配置是否被重新加载，运行以下指令，如果输出刚才修改的配置项则说明修改成功，否则请重新修改、保存。
{% highlight bash %}
sudo sysctl -p
{% endhighlight %}
配置过路由器的人都知道，如果局域网外部的主机需要主动访问局域网内的某台主机，那么需要在局域网网关上配置NAT进行地址转换，这里我们也需要使用iptables配置NAT，在Ubuntu操作系统里，这个互联网接口通常是eth0（如果你的亚马逊云主机没有特别的网络配置，那么在这里也是eth0），编辑配置文件：
{% highlight bash %}
sudo vi /etc/rc.local
{% endhighlight %}
在文件最后的 *exit 0* 之前加入这一行。
{% highlight bash %}
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
{% endhighlight %}
这一步也可以直接运行上面这条命令，但之所以把这条命令加入那个配置文件是为了保证服务器重启之后该命令自动执行，依然生效，这样就不用每次在服务器重启后每次手动运行该指令了。如果在这一步发现找不到   *iptables* 命令，那么说明你的 *iptables* 尚未安装（在AWS的Unbuntu13.04下，默认并未安装），运行以下命令安装。
{% highlight bash %}
sudo apt-get install iptables
{% endhighlight %}
在上述所有配置完成之后，并且每一步的操作都正常未报错的情况下，VPN网关就配置完成了，接下来将要配置客户端连接到这个VPN网关。不过在此之前还有一步，登录你的 [Amazon Management Console][aws console] 找到你的主机所在的 *Security Group* (在亚马逊云上安装操作系统时你一定经历了这个步骤，配置防火墙)，打开1723端口，这个端口就是PPTP服务器工作的端口。

还有一点值得注意，按照免费协议，亚马逊服务器一个月只有15G的流量，所以如果你手机和电脑同时用的话会比较费流量，要是一不小心超了，你注册的邮箱可能就会接到亚马逊的账单了，所以，自己注意上国外网站尽量多几种手段。

##客户端（Ubuntu 13.04）配置
打开 Ubuntu 右上角的网络连接，选择新增一个VPN连接，在下拉选项中选择 *Point-to-Point Tunneling Protocol(PPTP)* 。具体每个选项卡的配置请看下图，请保证你的配置和下图一致。

General选项卡的配置。
![](http://carpenter.qiniudn.com/amazon-vpn-general.png "vpn principle")

VPN选项卡的配置。在这里你需要在Gateway处填入你的VPN网关地址，这个网关地址可以在你的 [Amazon Management Console][aws console] 中的EC2主机对应的 *Public DNS* 找到。注意：如果你重启EC2主机，这个Public DNS就会改变，为了解决这个问题，最简单的方法就是不要重启远程主机，Linux正常跑个一年不怎么会崩溃需要重启。如果你确实需要经常重启EC2主机，建议你使用DDNS服务，讨论DDNS超出本文范畴，如果感兴趣请自行查找相关文档。至于用户名密码，那就是你在服务器端刚刚配置的用户名和密码了。
![](http://carpenter.qiniudn.com/amazon-vpn-gateway.png "vpn principle")

VPN选项卡中的Advanced选项配置。这里注意一点， *Use Point-to-Point encryption(MPPE)* 是关闭的，这和刚才在服务器端配置的时候保持了一致（服务器端也关闭了MPPE），如果刚才你在服务器端没有关闭MPPE，那么这里需要勾选这个选项。
![](http://carpenter.qiniudn.com/amazon-vpn-advanced.png "vpn principle")

IPv4选项卡的配置。
![](http://carpenter.qiniudn.com/amazon-vpn-ipv4.png "vpn principle")

配置完成之后保存，然后在桌面右上角点击连接到刚才创建的VPN就可以成功连接上了。^_^

##客户端（Android 2.3）配置
请按以下步骤进入VPN设置界面：“设置”-“无线和网络”-“虚拟专用网设置”-“添加虚拟专用网”-“添加VPN‘PPTP’”。具体设置项如下：

1.*虚拟专用网名称*：设置一个合适的名称，例如“Amazon VPN”。
2.*设置虚拟专用网服务器*：和前面“客户端(Ubuntu 13.04)配置”中 “VPN” 选项卡中的 “Gateway”一样
3.*启用加密*：把这个选项的勾去掉，原因是 Android 2.3 不支持128位MPPE加密，之前的“服务器端(Ubuntu 13.04)配置”和“客户端(Ubuntu 13.04)配置”里都去掉了MPPE加密，所以这里和前面保持一致，如果高版本的Android现在支持了MPPE，那么你可以启用这一项，同时，前面服务器的配置和PC客户端的配置也要相应改过来。
4.*DNS搜索范围*：可以空置，也可以填写谷歌的DNS。

设置完成之后，保存，然后点击刚才添加的这个VPN就会提示输入用户名和密码，就是最初在服务器端设置的用户名密码，登录之后就可以自由地在互联网上冲浪了。^_^

##参考文档
1.rschapman, [Amazon VPN Instructions](https://github.com/jason1114/amazon-vpn-instructions/blob/master/Amazon%20VPN.md)
2.yowachen, [Amazon Ubuntu PPTP VPN](http://yowachen.blogspot.com/2011/07/amazon-ec2-ubuntuvpn-pptp.html)


[sign up for aws]: http://www.freehao123.com/amazon-aws/ "sign up for aws"
[aws console]: https://console.aws.amazon.com/ "aws console"
[free tier]: http://aws.amazon.com/free/ "free tier"
