---
layout: post
title:  "[译] JavaScript 中的 Timer 是如何工作的"
date:   2014-03-10 12:54:41
categories: javascript translation
lan: cn
abstract: |
 从本质上理解 JavaScript 中的 Timer 的工作原理是十分有必要的。由于工作在单线程环境下， Timer 的实际执行结果常常与我们直觉上的执行结果并不一致。在开始正式分析之前，不妨再次审视一下我们经常用来构建并且操作 Timer 的三个函数

---
> * 原文作者： John Resig
> * 原文地址： [How JavaScript Timers Work][original]

从本质上理解 JavaScript 中 Timer 的工作原理是十分有必要的。由于工作在单线程环境下， Timer 的实际执行结果常常与我们直觉上的执行结果并不一致。在开始正式分析之前，不妨再次审视一下我们经常用来构建并且操作 Timer 的三个函数：

{% highlight javascript %}
/*
初始化一个 Timer ，这个 Timer 预期在指定的延迟（delay）后执行指定函数（fn）。
该函数执行完返回一个唯一的 ID ，通过这个 ID ，对应的 Timer 可以在之后被取消。
*/
var id = setTimeout(fn, delay); 
{% endhighlight %}
{% highlight javascript %}
/*
和函数 setTimeout 相似，但是区别是指定的函数 fn 会被持续调用
（间隔时间为设置的延迟 delay）直到该 Timer 被取消。
*/
var id = setInterval(fn, delay); 
{% endhighlight %}
{% highlight javascript %}
/*
这两个函数接受一个 ID 作为参数， ID 为前面两个函数的返回值。
作用是阻止 Timer 指定的函数（fn）执行
*/
clearInterval(id);, clearTimeout(id); 
{% endhighlight %}

为了能够理解 Timer 内部的工作原理，首先要弄明白一个重要的概念：**Timer 的延迟（delay）无法被保证**。由于在浏览器中所有的 JavaScript 代码都在一个线程中执行，事件（比如鼠标点击事件以及 Timer ）的异步回调函数只有在其余代码执行过程中出现“开口”的时候，才能被执行。这一点可以很好地被下面这张图表说明：

>译者注：所谓“开口”可以理解为上一段代码执行完毕，而下一段将要执行的代码尚未开始执行时。

![]({{ site.images }}/javascript-timer-example.png "Timer Example")

这个图表中包含很多的信息，但是完全理解这个图表将对你理解 JavaScript 异步的深层原理有十分有帮助。这个图首先是一维的：竖直方向自顶向下代表自然时间的流逝，以毫秒计。蓝色矩形块表示被执行的 JavaScript 代码块，矩形的高度代表了这段代码块执行需要的时间。举个例子，第一块 JavaScript 代码块执行需要大概 18ms 的时间，接下来那段鼠标点击的回调函数需要执行大概 11ms ，以此类推。

>译者注：这里估计的时间都是根据左边竖直方向的刻度目测得到。

由于 JavaScript 只能一个时刻执行一段代码（由于它单线程的特点），图上每一块代码的执行过程中都会阻塞其它异步事件的回调函数的执行。这意味着当有一个异步的事件发生时（鼠标点击、Timer 被激活、XMLHttpRequest 完成），它对应的回调函数会进入一个队列排队，等待被稍后执行。

>译者注：即使使用 *setTimeout（fn，0）*，似乎回调函数会立即异步执行，但事实却不是这样的，回调函数依然会进入等待队列，等待被稍后执行。如果 *setTimeout（fn，0）* 是某段代码的某一行，那么这行代码后面的一系列代码会优先执行，回调函数最快会在这段代码执行完后开始执行（如果等待队列前面没有别的等待执行的回调函数），同理，此时的延迟 0 实际上是不可靠的。这里可以得出一个结论, **当异步事件完成时，它所对应的回调函数立即执行只在一种情况下会发生，那就是此时 JavaScript 引擎没有其他代码在执行，且等待队列为空。**

至于这个排队情况究竟是怎么样的不同的浏览器有着不同的方案，在前面的叙述中我们将这一点简化了。

我们从第一块 JavaScript 代码块开始讲解这个图：一个延迟被设置为 10ms 的 *setTimeout* 和 一个延迟被设置为 10ms 的 *setInterval* 函数被执行了。由于这两个 Timer 被设置的时间以及位置，它们实际被激活需要等到我们真正执行完第一块代码后。注意，它们不是在指定延时后立刻被执行的（由于单线程的原理，是不可能做到那种情况的），相反的，被推迟的回调函数进入等待队列以期待在下一个可能的时刻被执行。

除此以外，在第一个 JavaScript 代码块内我们看到了一次鼠标点击事件发生。与这个异步事件相关联的 JavaScript 回调函数不能够被立即执行，就像被初始化的第一个 Timer，它被移入队列等待稍后被执行。

当第一块 JavaScript 代码块执行结束的时候浏览器会询问：目前有等待执行的代码块吗？在我们这个例子中鼠标点击事件的回调函数以及 Timer 的一个回调函数正在等待。于是浏览器从队列头拿出一个（鼠标点击事件的回调函数）并立即执行。 Timer 的那个回调函数为了能被执行只好继续等待下一次合适的时刻了。

注意一点当鼠标点击的回调函数正在执行的时候，之前设置的周期为 10ms 的 interval 被第一次激活，和上一个被激活的 Timer 一样，它被移入队列等待稍后执行。但是注意一点当这个       interval 被再次激活的时候（这时候第一个 Timer 的回调函数正在执行），这次 interval 的回调函数没有进入队列，而是直接被丢弃了。设想如果你在一段非常长的代码执行期间把所有interval的回调函数移入队列等待，那么当这一大段代码结束后会立刻一个接一个地执行这些 interval 的回调函数。为了防止这一点，浏览器通常只会在等待队列当前没有 interval 的情况下往队列中添加 interval 的回调函数。

事实上，当第三次 interval 激活的时候，此时正好在执行的恰好是 interval 的回调函数，这揭示了一个重要的事实：**interval 并不关心当前执行的是什么，而总是无条件地进入等待队列，即使这么做会导致 interval 之间的设定周期被牺牲。**

>译者注：可以看到，第一次 interval 回调函数执行完后，队列中还有一个 interval 的回调函数，所以 JavaScript 引擎立即执行这个回调函数，尽管表面上我们会以为 interval 之间会有 10ms 的间隔。

最后， 在第二个 interval 的回调函数结束执行后，我们能看到已经没有没有别的等待 JavaScript 引擎执行了，这意味着浏览器目前等待新的异步事件发生，在 50ms 的地方，我们得到一个异步事件被触发，即为 interval 激活，不过这次，再也没有别的阻塞它的执行了，于是回调函数立即被执行。

让我们再来看一个例子说明 *setTimeout* 和 *setInterval* 的区别：
{% highlight javascript %}
setTimeout(function(){
   /* Some long block of code... */
   setTimeout(arguments.callee, 10);
}, 10);
 
setInterval(function(){
   /* Some long block of code... */
}, 10);
{% endhighlight %}

简单地一看，上面两小段代码似乎是在干同样的事，但是事实上却不是的。比较明显的是 *setTimeout* 那段代码里的回调函数，总是和它上一次被执行相隔至少 10ms （事实上也许更多，但是不会少于 10ms），然而 *setInterval* 那段代码每隔 10ms 就会尝试执行而不管它上一次执行是什么时候。

从前文我们已经学习到许多知识，让我们再复习一遍：

1. JavaScript 引擎只有一个线程，迫使所有异步事件在队列中等待以期被执行
2. *setTimeout* 和 *setInterval* 在它们如何执行异步代码上有着本质的区别
3. 如果 Timer 在设定的时间点被阻塞，那么它会推迟到下一个可能合适的时间点再去尝试执行（这会导致实际执行的延迟比预先设定的延迟要长得多）
4. Interval 的回调有可能中间没有延迟而是一个紧接着一个执行，只要回调函数的执行时间足够长（比设定的延迟时间长）

所有这些知识对于理解 JavaScript 引擎的工作原理十分重要， 尤其是当遇到大量的异步事件发生时。这些基本原理为构建复杂应用代码奠定了坚实的基础。

上面的文字是从我的书《Secrets of the JavaScript Ninja》中摘抄出来的一段，该书发行于2008年。

##参考资料
1. John Resig, [How JavaScript Timers Work][original]

[original]: http://ejohn.org/blog/how-javascript-timers-work/
