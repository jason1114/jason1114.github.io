blogListURL = 
//"http://localhost/blog-editor/"
"http://bolgeditor.sturgeon.mopaas.com/"
$windowClass = $("<link/>").attr("rel","stylesheet").attr("href","/css/themes/umbra/style.css")
$windowScript = $("<script/>").attr("type","text/javascript").attr("src","/js/jWindow.js")
$("head").append($windowClass).append($windowScript)

$(function(){
	var w = $.jWindow({ 
		id: "editor_window",
		type: "iframe",
		url: blogListURL,
		title:"Draft Editor",
		width: 1030,
		height: 675,
		posy: 5,
		posx:150
	});
	w.show();
	w.update();
	//var is_editor_showed = true;
	$("body").keyup(function(event){
		if(event.which!=113){
			return
		}
		if(w.isHidden()){
			w.show()
			//is_editor_showed = false;
		}else{
			w.hide()
			//is_editor_showed = true;
		}
	})
	var onmessage = function(e) {
       var data = e.data
       $(".post").html(e.data['html'])
       $($("#intro h2")[0]).text(data['title'])
       $("title").text(data['title'])
       $("#post_date").text(data['date'])
       $("#tags").html('')
       for(var i=0;i<data['tags'].length;i++){
       		$span = $("<span/>")
       		$a = $("<a/>").attr("href","/articles/"+data['tags'][i]).text(data['tags'][i])
       		$span.append($a)
       		$("#tags").append($span)
       		$("#tags").append("\n")
       }
       $(".highlight").each(function(index,element){

       		$(this).load("http://springlin.herokuapp.com/",
       			{lang:$(this).find("pre code").attr("class"),code:$(this).find("pre code").text()},
       			function(){
       				$(this).find(".highlight").unwrap()
       			})

       })

    };
    //监听postMessage消息事件
    if (typeof window.addEventListener != 'undefined') {
      window.addEventListener('message', onmessage, false);
    } else if (typeof window.attachEvent != 'undefined') {
      window.attachEvent('onmessage', onmessage);
    }
})