---
layout: post
title:  "如何利用 Github Pages 和 Jekyll 建立一个免费个人博客"
date:   2013-09-11 21:59:10
categories: github jekyll
lan: cn
abstract: |
 在网络上，很多人都有浏览网络日志的习惯，也有很多人自己就拥有个人站点，在自己的站点里写博客。不光是文化界，科技界也十分盛行网络日志，我的 Feedly 订阅中就包含了许多科技名人和技术高手的博客站点。在国外，技术博客之风更为盛行，最近几年博客程序 Wordpress 在圈子里很流行，它的界面友好，操作简单，易于扩展，功能强大且主题丰富。
---
##引言
在网络上，很多人都有浏览网络日志的习惯，也有很多人自己就拥有个人站点，在自己的站点里写博客。不光是文化界，科技界也十分盛行网络日志，我的 Feedly 订阅中就包含了许多科技名人和技术高手的博客站点。在国外，技术博客之风更为盛行，最近几年博客程序 Wordpress 在圈子里很流行，它的界面友好，操作简单，易于扩展，功能强大且主题丰富，没有任何编程基础的人甚至都能轻松搭建起一个个人博客。
![]({{ site.images }}/github-pages-blog.jpg "personal blog")

最近，国外出现有许多精英程序员和 Hacker 开始利用 Github Pages 搭建自己的博客。 Github 是国外非常流行的基于版本控制系统 Git 的项目托管网站，有“程序员的 Facebook ”之称， Github Pages 是 Github 推出的一项静态网页托管服务，旨在为 Github 上的项目提供一个免费的、无限流量的静态项目主页。利用这一项服务，我们可以使用一些静态网页生成工具，例如 Jekyll ，在 Github 上搭建一个自己的免费个人博客。与 Wordpress 相比，这类博客有以下优点：

>1. 非常安全。整站静态，不会有任何漏洞（除非漏洞位于更底层），当然也没有SQL注入.
>4. 博文内容不会丢失。所有文章均置于分布式版本控制系统 Git 管理之下.
>2. 完全免费。不再需要租用一个收费的 PHP 空间或者虚拟主机，而且无限流量.
>5. 网站速度更快。借助 Github 强大的服务器和 CDN 加速，甚至比单独购买 CDN 服务更快.
>3. 便于搜索引擎收录。不再需要做额外的静态化，对搜索引擎 ( 例如 Google ) 更加友好.

但是尽管如此，我并不看好短期内它会变成非常主流的博客程序，因为要想用好这项服务也有一定的技术门槛：

>1. 使用者必须掌握 Git 的使用
>2. 使用者需要有前端基础，会自己使用 HTML/CSS/JS 编写网页，而不再有大量现成的主题
>3. 动态内容（例如 评论、留言）需要借助第三方服务(例如 Disqus)，不过这点从另一方面看也可以认为是一个优点

本站也是基于 Github Pages 和 Jekyll 构建，虽然搭建过程比 Wordpress 麻烦许多，但是我可以完全自己定义整站的外观，而不再需要受各种主题的限制，充分发挥了自己的想象力，这也是一件让人乐在其中的事情^_^。如果你已经掌握 Git 基础并且正在使用 Ubuntu 操作系统(配置好 Git user.name 和 user.email)，请继续往下阅读。

##一、配置 Ruby 环境
>如果你已经拥有 Ruby 开发环境，请跳过这一小节
首先安装 [RVM][rvm] , RVM 是 Ruby 的版本管理器，方便在一个系统上管理多个版本的 Ruby ,近年来已经几乎成为 Ruby 开发者的标配。
{% highlight bash %}
$ sudo apt-get install curl    #if you already installed curl,skip this step
$ curl -L https://get.rvm.io | bash -s stable
{% endhighlight %}
打开一个新的命令行终端,把 RVM 默认安装源从官方源替换成国内的淘宝源，国外源国内访问不稳定，至于原因，你懂得。
{% highlight bash %}
$ source ~/.rvm/scripts/rvm  #load variables about rvm
$ sed -i 's!ftp.ruby-lang.org/pub/ruby!ruby.taobao.org/mirrors/ruby!' $rvm_path/config/db
{% endhighlight %}
开始安装 Ruby 吧(执行下面的命令会要求输入 Root 密码)！^_^
{% highlight bash %}
$ rvm install ruby
{% endhighlight %}
静静地等待吧，首先会下载一些依赖，然后安装最新版本的 Ruby ,安装完成后运行 *ruby -v* ，如果输出版本号，那么恭喜你，证明安装成功了！
##二、安装静态网站生成器 Jekyll
在安装 Jekyll 之前，请确认系统已经拥有 Ruby 环境，因为 Jekyll 是由 Ruby 编写的。接下来又要替换官方 gem 源为淘宝 gem 源，原因和前面一样。 gem 是 Ruby 软件管理器，目的是以统一的方式管理和发布所有用 Ruby 编写的软件。下面的命令可能要执行一分钟左右，请耐心等待。相信我，如果你使用官方源，那个速度绝对会慢得让你无法忍受。
{% highlight bash %}
$ gem source -r https://rubygems.org/
$ gem source -a http://ruby.taobao.org
{% endhighlight %}
完成之后，运行以下命令安装 Jekyll：
{% highlight bash %}
$ gem install jekyll
{% endhighlight %}
准备好了吗？让我们开始第一个 Hello World 吧！
##三、Hello World,My Blog!
你会发现第一个例子竟然如此简单！打开命令行，切换路径至你想要存放你的网站的目录，输入以下命令：
{% highlight bash %}
$ jekyll new jason-blog
$ cd jason-blog
$ jekyll server -w
{% endhighlight %}
打开浏览器， 输入 *http://localhost:4000* 

怎么样，博客的雏形出来了^_^。
也许你对这个页面还心存疑惑：“我没有写一行代码，怎么就出现这些内容了？”，“我如何去控制生成的内容呢？”。没错，一个真正的博客远不止于此，接下来，我会简单配置一下这个博客,如果你想了解更多，请参阅 [Jekyll Homepage][jekyll home] 。

##四、配置 Github SSH 密钥
>请确保你操作这一步之前已经[注册][github sign up]了一个 Github 帐号
>如果你之前已经已经配置好和 Github 的基于密钥对的 SSH 连接，请跳过这一小节
###step1:
 首先，请确定你的Ubuntu上是否已经存在一对密钥。
{% highlight bash %}
$ cd ~/.ssh
$ ls
{% endhighlight %}
如果输出中包括 *id_rsa.pub* 或 *id_dsa.pub* 文件，那么说明你的系统之前已经存在一对密钥了，你可以利用这对密钥，直接跳至 step3 。否则，你就需要手动生成一对密钥，请跳至 step2 。
###step2:
生成 RSA 密钥对：
{% highlight bash %}
$ ssh-keygen -t rsa -C "your_email@example.com"
{% endhighlight %}
在这过程中，程序会询问你密钥放置路径和为这对密钥再设置一个密码（如果设置了密码，那么以后即使使用这对密钥仍然会要求输入该密码）。为了使我们的例子尽可能简单，请直接按回车键，这意味着生成的密钥将直接存放至当前工作目录，同时放弃为这对密钥设置密码。
###step3:
无论你是之前已经拥有的密钥或是刚刚生成的密钥，这个密钥其实是一对，分为公钥与私钥。自己保留私钥，把公钥交给 Github ,以便完成本机和 Github 服务器之间项目更新时的加密的 SSH 连接。于是这里涉及到一个操作就是把公钥告知 Github。我们需要安装一个辅助程序 *xclip*：
{% highlight bash %}
$ sudo apt-get install xclip # Downloads and installs xclip. If you don't have `apt-get`, you might need to use another installer (like `yum`)
$ xclip -sel clip < ~/.ssh/id_rsa.pub # Copies the contents of the id_rsa.pub file to your clipboard
{% endhighlight %}
然后进入 Github 的 [SSH Keys Setting][ssh key setting]，点击 *Add SSH key*,在 *Title* 里为这个 Key 起一个名字，然后在 *Key* 框里粘贴。（到这里也许你明白了，*xclip* 的作用其实就是把一个文件的内容粘贴到剪切版，同时避免了引入不必要的换行等其它空白符）。完成之后，点击 *Add key* 就完成了对公钥的添加。让我们测试一下连接：
{% highlight bash %}
$ ssh -T git@github.com
{% endhighlight %}
如果显示 “Hi xxxxxx! You've successfully authenticated, but GitHub does not provide shell access.” 那么说明配置成功，否则请按照上述步骤重新配置。
##五、在 Github 上新建项目

##六、上传博客

##七、其它

##参考资料
1.Ruby-China Wiki,[Install Ruby](http://ruby-china.org/wiki/install_ruby_guide)
2.阮一峰,[搭建一个免费的，无限流量的Blog----github Pages和Jekyll入门](http://www.ruanyifeng.com/blog/2012/08/blogging_with_jekyll.html)
3.[Jekyll Documentation](http://jekyllrb.com/docs/home/)
4.Github Help,[Generating SSH Keys](https://help.github.com/articles/generating-ssh-keys)

[rvm]: http://rvm.io "rvm homepage"
[jekyll home]: http://jekyllrb.com/ "jekyll homepage"
[github sign up]: http://github.com "github"
[ssh key setting]: https://github.com/settings/ssh "ssh key setting"
