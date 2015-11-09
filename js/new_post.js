editor_list = {
  'localhost': 'http://localhost/blog-editor/',
  'clever-lin.tk': 'http://bolgeditor.sturgeon.mopaas.com/'
}
var blogListURL = ""
for( var i in editor_list ){
  if(window.location.host.indexOf(i) === -1){
    continue
  }
  blogListURL = editor_list[i]
}
if (!blogListURL) {
    blogListURL = editor_list['clever-lin.tk']
}
//"http://localhost/blog-editor/"
//"http://bolgeditor.sturgeon.mopaas.com/"
$windowClass = $("<link/>").attr("rel","stylesheet").attr("href",root+"/css/themes/umbra/style.css")
$windowScript = $("<script/>").attr("type","text/javascript").attr("src",root+"/js/jWindow.js")
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
  $(document).keydown(function(event) {
      if (event.ctrlKey && event.which == 13){
        res_min()
        event.preventDefault();
        return false;
      }
  });
  var max_min_state = "res";
  function res_min(){
    if(max_min_state==="res"){
      w.minimise()
      max_min_state = "min";
    }else{
      w.restore()
      max_min_state = "res";
    }
  }
	var onmessage = function(e) {
       if(e.data['cmd']==="res-min"){
          res_min()
          return
       }
       var data = e.data
       $(".post").html(e.data['html'])
       $("#intro h1").text(data['title'])
       $("title").text(data['title'])
       $("#post_date").text(data['date'])
       $("#tags").html('')
       for(var i=0;data['tags'] && i<data['tags'].length;i++){
       		$span = $("<span/>")
       		$a = $("<a/>").attr("href","/articles/"+data['tags'][i]).text(data['tags'][i])
       		$span.append($a)
       		$("#tags").append($span)
       		$("#tags").append("\n")
       }
       load_sidenav()
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
