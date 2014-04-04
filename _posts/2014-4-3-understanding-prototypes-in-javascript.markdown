---
layout: post
title:  "[译]理解 JavaScript 中的 Prototype"
date:   2014-04-03 21:34:01
categories: javascript translation
lan: cn
abstract: |
 在 JavaScript 中，对象就是由许多键值对组成的东西（在 Ruby 中，这个结构被称为 Hash ；在 Python 中，被成为 dictionary）。举个例子，如果我希望描述我的名字，我可以使用一个拥有两个键值对的对象，它们分别是“firstname”对应“Yehuda”，“lastname”对应“Katz”。键在 JavaScript 对象中是字符串类型。
---
> * 原文作者： Yehuda Katz
> * 原文地址： [Understanding Prototypes in JavaScript][original]

为了这篇文章，我将会使用 ECMAScript 5.1 中定义的语法来讲解 JavaScript 对象。这些基本的语义事实上在版本 3 的时候已经存在，但是那时那些语义并没有很好地通过语言本身暴露出来。

##一个全新的 Object

在 JavaScript 中，对象就是由许多键值对组成的东西（在 Ruby 中，这个结构被称为 Hash ；在 Python 中，被成为 dictionary）。举个例子，如果我希望描述我的名字，我可以使用一个拥有两个键值对的对象，它们分别是“firstname”对应“Yehuda”，“lastname”对应“Katz”。键在 JavaScript 对象中是字符串类型。

为了创建一个最简单的 JavaScript 对象，你可以使用 Object.create:
{% highlight javascript %}
var person = Object.create(null); // 这会创建一个空白的对象
{% endhighlight %}

你一定会问，“为什么不使用 **var person = {};** 来创建对象呢？”请听我继续说下去！为了在一个对象中根据键查找值，可以使用方括号语法。如果根据键找不到对应的值，那么 JavaScript 会返回 **undefined** 。

{% highlight javascript %}
person['name'] // undefined
{% endhighlight %}

如果键名是一个合法的标识符（注），你可以使用下面点的形式：
{% highlight javascript %}
person.name // undefined
{% endhighlight %}

>注：通常来说，标识符以 Unicode 字符、$、_ 开头，其后跟着任何起始字符或者数字。起始字符指可以作为变量名的字符串的第一个字符。一个合法的标识符不能为保留词。

##增加值
那么此时你已经拥有一个空的对象了。是不是不太有用，对吧？在我们向这个对象里面加入若干属性（在标准中被称为“命名的数据属性”）前，我们需要明白 JavaScript 中的对象是什么样子的。

显然，一个属性拥有一个名字和一个值。除此以外，一个属性可以是 *可枚举* 、 *可配置* 以及 *可写*。如果一个值可枚举，那么当在一个对象上使用 **for (prop in obj)** 时这个值将会被枚举到。如果一个属性可写，那么它的值能够被修改。如果一个属性可配置，那么你可以删除这个属性，或者更改其他的设置（修改是否可枚举、可写以及可配置）。

通常来说，当我们创建一个新的属性的时候，我们是希望它能够可枚举、可配置且可写的。事实上，在 ECMAScript5 之前，用户直接能创建的只有这种类型的属性。

我们可以通过 *Object.defineProperty* 向对象中加入新的属性。让我们把 firstname 和 lastname 加入我们的空白对象吧：

{% highlight javascript %}
var person = Object.create(null);
Object.defineProperty(person, 'firstName', {
  value: "Yehuda",
  writable: true,
  enumerable: true,
  configurable: true
});
 
Object.defineProperty(person, 'lastName', {
  value: "Katz",
  writable: true,
  enumerable: true,
  configurable: true
});
{% endhighlight %}

很明显，这看上去非常冗余，我们可以通过消除它们公共的默认部分使得看上去不那么冗余：
{% highlight javascript %}
var config = {
  writable: true,
  enumerable: true,
  configurable: true
};
 
var defineProperty = function(obj, name, value) {
  config.value = value;
  Object.defineProperty(obj, name, config);
}
 
var person = Object.create(null);
defineProperty(person, 'firstName', "Yehuda");
defineProperty(person, 'lastName',   "Katz");
{% endhighlight %}

这看上去仍然比较丑陋，我们仅仅只是新建几个属性而已。在我们得到一个更加优雅的解决方案之前，我们需要向我们 JavaScript 兵器库中加入另外一件武器。

##Prototypes

到目前为止，我们讨论的是仅包含简单的键值对的对象。事实上，JavaScript 对象还拥有另外一个性质，一个指向其他对象的指针，我们说这个指针指向这个对象的原型（即 Prototype）。如果你尝试在一个对象上根据键查找值并且没找到，JavaScript会在它的原型上接着找。这会导致查找会沿着原型链依次查找直到某个原型为null。在这种情况下，程序返回 *undefined* 。

你可能会回想到我们创建新对象的方法是调用 **Object.create(null)** 。这里的参数其实是告诉 JavaScript 它应该为这个新对象设置谁为原型对象。你可以通过 **Object.getPrototype** 查找一个对象的原型：

{% highlight javascript %}
var man = Object.create(null);
defineProperty(man, 'sex', "male");
 
var yehuda = Object.create(man);
defineProperty(yehuda, 'firstName', "Yehuda");
defineProperty(yehuda, 'lastName', "Katz");
 
yehuda.sex       // "male"
yehuda.firstName // "Yehuda"
yehuda.lastName  // "Katz"
 
Object.getPrototypeOf(yehuda) // 返回 man 对象
{% endhighlight %}

通过这一点，我们可以编写在多个对象中共享的函数：
{% highlight javascript %}
var person = Object.create(null);
defineProperty(person, 'fullName', function() {
  return this.firstName + ' ' + this.lastName;
});
 
// 这次我们使 person 成为 man 的原型
// 那么所有的 man 对象都共享这个 fullName 函数
var man = Object.create(person);
defineProperty(man, 'sex', "male");
 
var yehuda = Object.create(man);
defineProperty(yehuda, 'firstName', "Yehuda");
defineProperty(yehuda, 'lastName', "Katz");
 
yehuda.sex        // "male"
yehuda.fullName() // "Yehuda Katz"
{% endhighlight %}

##设置属性
由于创建了一个新的具有可写、可配置、可枚举性质的属性太常见了，JavaScript 通过简化的赋值语法使这件事变得更加简单。让我们使用赋值语法更新先前使用 *defineProperty* 的例子：
{% highlight javascript %}
var person = Object.create(null);

// 我们直接赋值而不是使用 defineProperty 声明可写
// 可配置以及可枚举，JavaScript 会替你把剩下的工作都完成
person['fullName'] = function() {
  return this.firstName + ' ' + this.lastName;
};

//这次我们把 man 的原型设置为 person，这样
//所有的 man 都能共享 fullName 函数了
var man = Object.create(person);
man['sex'] = "male";
 
var yehuda = Object.create(man);
yehuda['firstName'] = "Yehuda";
yehuda['lastName'] = "Katz";
 
yehuda.sex        // "male"
yehuda.fullName() // "Yehuda Katz"
{% endhighlight %}

就像查找属性一样，如果属性名符合标识符的规范，你可以使用点语法代替方括号语法。举个例子，你可以在上面的例子使用 **man.sex = 'male'** 。

##字面对象

到目前为止，如果有任务要让我们依次去设置一系列的属性，这还是会让我们很恼火。别担心，JavaScript 提供了一种创建对象并同时一次性为它设置所有属性的字面语法。
{% highlight javascript %}
var person = { firstName: "Paul", lastName: "Irish" }
{% endhighlight %}

而这种语法事实上只是下面这些语句的语法糖：
{% highlight javascript %}
var person = Object.create(Object.prototype);
person.firstName = "Paul";
person.lastName  = "Irish";
{% endhighlight %}
上面这种扩展形式中最重要的一点就是,新创建的对象的原型总是被设置为 *Object.prototype* 。从内部来看，字面对象应该是下面这个样子的：

![]({{ site.images }}/prototype-chain.png )

这个默认的 Object.prototype 自带许多我们期望任何对象所应该有的方法，通过这具有魔力的原型链，所有通过字面对象这种方法创建的新对象共享所有这些属性。当然，对象也很乐意通过用户在对象上直接定义同名属性来覆盖这些属性。最常见的情况是，开发者会覆盖 *toString* 这个方法。

{% highlight javascript %}
var alex = { firstName: "Alex", lastName: "Russell" };
 
alex.toString() // "[object Object]"
 
var brendan = {
  firstName: "Brendan",
  lastName: "Eich",
  toString: function() { return "Brendan Eich"; }
};
 
brendan.toString() // "Brendan Eich"
{% endhighlight %}

这一点非常有用，因为许多系统内部操作都要求对象提供一个 toString 方法。

不幸的是，这种字面语法只能工作在我们希望新创建的对象的原型为 Object.prototype 的情况下。这使我们失去了先前使用 prototype 共享属性的好处。在很多情况下，字面对象的语法的简洁带来的好处抵消了这个缺陷。但是在其他情形下，你会希望一种简单的方法来创建对象同时也能指定新对象的原型对象。我接下来就说明这种情形：

{% highlight javascript %}
var fromPrototype = function(prototype, object) {
  var newObject = Object.create(prototype);
 
  for (var prop in object) {
    if (object.hasOwnProperty(prop)) {
      newObject[prop] = object[prop];      
    }
  }
 
  return newObject;
};
 
var person = {
  toString: function() {
    return this.firstName + ' ' + this.lastName;
  }
};
 
var man = fromPrototype(person, {
  sex: "male"
});
 
var jeremy = fromPrototype(man, {
  firstName: "Jeremy",
  lastName:  "Ashkenas"
});
 
jeremy.sex        // "male"
jeremy.toString() // "Jeremy Ashkenas"
{% endhighlight %}

首先来解释一下 *fromPrototype* 这个方法。这个方法的目标就是创建一个具有一系列属性的新对象，同时也能指定新对象的原型。首先我们使用 **Object.create()** 创建一个新的空对象，并且指定我们需要的原型。接下来，我们遍历我们提供的对象里的所有属性并且把他们复制到新的对象里。

记住这一点：当你创建字面对象的时候，比如我们以参数传入 *fromPrototype* 函数的那个，字面对象总是以 Object.prototype 为它的原型。默认情况下， Object.prototype 里面的属性都是不可枚举的，所以我们无需担心像 *valueOf* 那样的属性会在我们遍历属性的循环中出现。但是，由于 Object.prototype 只是一个和其他所有对象地位相等的对象，任何人都可以在它上面定义新的属性，而新的属性当然可以设置为可枚举的。

我们希望的结果是，当我们遍历我们传进去的那个对象的所有属性的时候，那些属性仅限于这个对象本身的属性，而不会遍历到在这个对象的原型上的属性。在 JavaScript 语言里 Object.prototype 里有一个 hasOwnProperty 方法用来检查一个属性是否定义在某个对象本身上。由于对象字面量总是以 Object.prototype 为它的原型，所以这里你可以使用这个方法来达到我们希望的效果。

在上面那个例子里我们创建的对象看上去是这样的：

![]({{ site.images }}/prototype-chain-2.png )

##原生的面向对象

这时候，我们应该已经知道一个明显的事实，那就是，原型可以被用来实现继承机制，就像传统的面向对象语言那样。为了能够以这种方式写 JavaScript ，JavaScript 提供了一个 *new* 操作符。

为了实践面向对象编程， JavaScript 允许你使用一个函数对象和与之相关联的原型，它们会被新对象以及它的构造函数所使用到：

{% highlight javascript %}
var Person = function(firstName, lastName) {
  this.firstName = firstName;
  this.lastName = lastName;
}
 
Person.prototype = {
  toString: function() { return this.firstName + ' ' + this.lastName; }
}
{% endhighlight %}

这里我们定义了一个函数对象，它既是一个构造函数，而且同时也是一个新对象会把它当作原型的对象。这里暂停一下，让我们先实现一个函数，这个函数可以从 Person 对象创建新的实例（以Person 为原型）。

{% highlight javascript %}
function newObject(func) {
  // 获取除了第一个参数以外的所有参数数组
  var args = Array.prototype.slice.call(arguments, 1);
 
  // 创建一个原型为 fuc.prototype 的新对象
  var object = Object.create(func.prototype);
 
  // 调用构造函数，传递新对象，这个新对象在构造函数里以‘this’的形式被引用
  // 构造函数的参数为上面除去第一个参数后的所有剩余参数
  func.apply(object, args);
 
  // 返回新对象
  return object;
}
 
var brendan = newObject(Person, "Brendan", "Eich");
brendan.toString() // "Brendan Eich"
{% endhighlight %}

而上面这些代码事实上就是 *new* 操作符内在的工作原理，它提供了类似面向对象语言那种熟知且传统的语法：

{% highlight javascript %}
var mark = new Person("Mark", "Miller");
mark.toString() // "Mark Miller"
{% endhighlight %}

在本质上，JavaScript 中的 “类” 仅仅只是一个函数对象而已，而它仅仅只是被当成了一个构造函数外加原型对象。我在前面已经提到过，在较早版本的 JavaScript 中是没有 Object.create 的。但是这个函数太有用了，于是人们通过 new 操作符，来模拟出类似的效果：

{% highlight javascript %}
var createObject = function (o) {
  // 我们只关心 new 产生的行为中设置原型的那部分
  // 所以我们这里使用空的构造函数
  function F() {}
 
  // 把函数的原型这一属性设置成我们希望新对象继承的原型对象
  F.prototype = o;
 
  // 使用 new 操作符我们就能得到以 o 为原型对象的
  // 新对象了，同时也会调用这个空的构造函数，
  // 当然这个构造函数什么也没做
  return new F();
};
{% endhighlight %}

我太喜欢这些特性了， ECMAScript 5 以及更新的版本开始暴露原先已有实现的内部细节的 API ，比如允许你直接定义不可枚举的属性，或者直接根据已有原型链定义对象等等。

##参考资料
1. Yehuda Katz, [Understanding Prototypes in JavaScript][original]
2. Jhon Resig, [ECMAScript5 Objects and Properties][ECMAScript5 Objects and Properties]

[original]: http://yehudakatz.com/2011/08/12/understanding-prototypes-in-javascript/
[ECMAScript5 Objects and Properties]: http://ejohn.org/blog/ecmascript-5-objects-and-properties/
