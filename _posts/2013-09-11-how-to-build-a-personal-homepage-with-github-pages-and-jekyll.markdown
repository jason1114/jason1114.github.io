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
打开一个新的命令行终端,把 RVM 默认安装源从官方源替换成国内的淘宝源，国外源国内访问不稳定，至于原因，你懂的。
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
在安装 Jekyll 之前，请确认系统已经拥有 Ruby 环境，因为 Jekyll 是由 Ruby 编写的。首先还是要替换官方 gem 源为淘宝 gem 源，原因和前面一样。 gem 是 Ruby 软件管理器，目的是以统一的方式管理和发布所有用 Ruby 编写的软件。下面的命令可能要执行一分钟左右，请耐心等待。相信我，如果你使用官方源，那个速度绝对会慢得让你无法忍受。
{% highlight bash %}
$ gem source -r https://rubygems.org/
$ gem source -a http://ruby.taobao.org
{% endhighlight %}
完成之后，运行以下命令安装 Jekyll：
{% highlight bash %}
$ gem install jekyll
$ echo "source ~/.rvm/scripts/rvm">>~/.bashrc
{% endhighlight %}
准备好了吗？让我们开始第一个 Hello World 吧！
##三、Hello World,My Blog!
你会发现第一个例子竟然如此简单！打开命令行，切换路径至你想要存放你的网站的目录，输入以下命令：
{% highlight bash %}
$ jekyll new jason-blog
$ cd jason-blog
$ git init
$ jekyll server -w
{% endhighlight %}
打开浏览器， 输入 *http://localhost:4000* 

怎么样，博客的雏形出来了^_^。
也许你对这个页面还心存疑惑：“我没有写一行代码，怎么就出现这些内容了？”，“我如何去控制生成的内容呢？”。没错，一个真正的博客远不止于此，接下来，我会简单配置一下这个博客,如果你想了解更多，请参阅 [Jekyll Homepage][jekyll home] 。

刚刚创建的博客的目录结构如图所示，简要介绍一下每一部分：
![]({{ site.images }}/jason-blog-structure.png "jason blog")

1. gitignore 文件： 项目中应该被 Git 忽略的文件，本项目中应为 *\_site* 目录下的所有文件。
2. \_config.yml 文件： 整站配置文件，也可以加入用户自定义的配置。
3. index.html 文件： 在静态网站中，*index.html* 一般会被服务器当作首页。
4. \_layouts 文件夹： 默认的布局文件目录，布局网页提取所有网页中相同的部分，使用变量表示相似的部分，所有其它的网页只需要引用布局文件，并且为布局文件中定义的变量传入实际参数就可以轻松渲染出一个页面，布局也可以嵌套，从而静态页面也能达到和动态页面一样的灵活和抽象程度。
5. \_posts 文件夹： 默认存放博文的目录。
6. \_site 文件夹： 通过 Jekyll 渲染后的所有静态页面存放的目录，一般不需要去管它，默认被版本控制忽略。
7. css 文件夹： 默认存放 *css* 的文件夹。所有不以 "_" 开头的文件和文件夹及里面的内容都会经 Jekyll 渲染后直接拷贝至 *\_site* 文件夹，所以你也可以自己定义常用的网站目录例如 *js* 、 *images* 、 *flash* 等。

打开 *\_config* 文件 修改 *name* 为你的博客的名字，例如 *Jason's Blog* 。打开 *\_layouts/default.html* 文件，你会发现有下面这一行：
{% highlight html %}
<h1 class="title"><a href="/">{{ "{{ site.name " }}}}</a></h1>
{% endhighlight %}
刚才在配置文件中配置的的博客名变量，就这样被带入到页面中，你也可以在配置文件中添加自己的变量，然后在任意的页面中引用，Jekyll 使用的模板引擎是 [Liquid][liquid help],掌握 Liquid 的语法后，你能使静态页面更加灵活，更加能适应变化，而不是总是 "Copy-Paste" 。

*defualt.html* 是默认的布局，在本例中，其它模板都引用这个布局，所以只要修改这个布局，整个站点所有页面相似的部分都会随之改变。所以，在这个页面中，加入 Email 等你自己的元素吧。修改完大致类似如图所示：
![]({{ site.images }}/jason-blog-1.png "jason blog")

下面新建一篇新博文，在 *\_posts* 文件夹下新建文件 *2013-09-15-hello-world.markdown*,在文件中粘贴以下内容：
{% highlight html %}
---
layout: post
title:  "Hello World!"
date:   2013-09-15 16:51:41
categories: hello world
---

Hello World! This is my first blog!^_^
{% endhighlight %}
首先，这个文件是 [Markdown][markdown] 格式， Markdown 使用更简洁的语法来简化 HTML 的编写，但是这个文件最终会被渲染成 HTML 放入 *\_site* 文件夹。这个文件的头部包括一些元信息，使用布局为 post (位于默认的 *\_layouts/post.html* ),标题为 “Hello World!”，另外还有写作时间，所属标签。保存之后，就能看到刚刚写的这篇博客了。
![]({{ site.images }}/jason-blog-2.png "jason blog")

博客简单的设置到此为止，使用 Git 保存工作进度：
{% highlight bash %}
$ git add .
$ git commit -m "jason blog init"
{% endhighlight %}
博客在本地测试一切OK，准备上传至 Github 。

##四、配置 Github SSH 密钥
>请确保你操作这一步之前已经[注册][github]了一个 Github 帐号
> 
>如果你之前已经已经配置好和 Github 的基于密钥对的 SSH 连接，请跳过这一小节
###step1:
 首先，请确定你的Ubuntu上是否已经存在一对密钥。
{% highlight bash %}
$ cd ~/.ssh
$ ls
{% endhighlight %}
如果输出中包括 *id_rsa.pub* 或 *id_dsa.pub* 文件，那么说明你的系统之前已经存在一对密钥了，你可以继续利用这对密钥，并跳至 step3 。否则，你就需要手动生成一对密钥，请跳至 step2 。
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
##五、上传博客
在第三节的时候，我们已经拥有一个可以使用的博客站点了，是时候将这个站点发布到 Github 上去了，第四节“配置 Github SSH 密钥就是为这一步做好准备工作。登录 [Github Homepage][github] ,登录你的帐号，然后点击 *New repository* ,为这个项目起一个名字例如 *jason-blog* ,添加项目描述，选择 *Public* 之后点击 *Create repository* ，至此项目创建完毕，在项目创建成功的页面会显示该项目的 SSH 连接地址，形如 *git@github.com:xxxxx/jason-blog.git*， 复制这个地址。

打开一个命令行，切换工作路径至第三节博客所在目录，依次输入以下指令(其中，替换下面的链接地址为你刚才复制的地址)：
{% highlight bash %}
$ git checkout -b gh-pages
$ git remote add origin git@github.com:xxxxxx/jason-blog.git
$ git push -u origin gh-pages
{% endhighlight%}
这里涉及到两个规则：
>1. 只有这个项目的 *gh-pages* 分支上的内容才会被 Github Pages 当成网站内容。
>2. Github Pages 支持 Jekyll ，所以可以直接上传整个 Jekyll 项目。

赶紧打开浏览器，查看你的网站吧！ *http://xxxx.github.io/jason-blog*，替换 xxxx 为你的 Github 用户名。
![]({{ site.images }}/jason-blog-3.png "jason blog")

你的博客成功上传了，但是你会发现网站的样式丢失了，仔细查看 *\_layouts/default.html* 会发现下面这几行：
{% highlight html %}
<!-- syntax highlighting CSS -->
<link rel="stylesheet" href="/css/syntax.css">

<!-- Custom CSS -->
<link rel="stylesheet" href="/css/main.css">
{% endhighlight %}
原来是这样，本地调试的时候，*localhost* 相当于一个顶级域名，而 Github 为网站提供的不是一个顶级域名，于是这个网站就出现了本地调试和上传后 css 实际引用路径不一致的问题。解决方案有许多，其中之一就是为这个博客绑定一个域名，这在随后的第六小节中会介绍。

至此，博客搭建顺利完成，就从这个 Hello World 开始慢慢丰富你的站点内容吧！ Have Fun!
##六、其它
###1.域名绑定
Github Pages 目前支持绑定自定义域名，你可以购买收费域名，或者使用免费域名，本站使用免费的 [TK][tk] 域名。绑定域名的方法请参阅参考资料。
###2.添加评论
因为全站静态，为了给博客添加评论，所以只能使用基于 JS 的第三方评论服务。国外比较流行的有 [Disqus][disqus] ，国内比较流行的有 [多说][duoshuo] 、 [友言][youyan] 等，本站使用多说，评论托管对我来说为我节省了很多精力，而且使用简单，何乐而不为？^0^
##参考资料
1. Ruby-China Wiki,[Install Ruby](http://ruby-china.org/wiki/install_ruby_guide)
2. 阮一峰,[搭建一个免费的，无限流量的Blog----github Pages和Jekyll入门](http://www.ruanyifeng.com/blog/2012/08/blogging_with_jekyll.html)
3. [Jekyll Documentation](http://jekyllrb.com/docs/home/)
4. Github Help,[Generating SSH Keys](https://help.github.com/articles/generating-ssh-keys)
5. [Liquid for Designers](https://github.com/Shopify/liquid/wiki/Liquid-for-Designers)
6. Daring Fireball,[Markdown][markdown]
7. Github Help,[Setting up a custom domain with pages][github pages domain]

[rvm]: http://rvm.io "rvm homepage"
[jekyll home]: http://jekyllrb.com/ "jekyll homepage"
[github]: http://github.com "github"
[ssh key setting]: https://github.com/settings/ssh "ssh key setting"
[liquid help]: https://github.com/Shopify/liquid/wiki/Liquid-for-Designers "liquid help"
[markdown]: daringfireball.net/projects/markdown/‎ "markdown"
[github pages domain]: https://help.github.com/articles/setting-up-a-custom-domain-with-pages "custom domain"
[tk]: http://www.dot.tk "tk"
[disqus]: http://disqus.com/‎ "disqus"
[duoshuo]: http://duoshuo.com/‎ "duoshuo"
[youyan]: http://www.jiathis.com/ "youyan"
