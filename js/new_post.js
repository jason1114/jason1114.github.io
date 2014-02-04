blogListURL = "http://bolgeditor.sturgeon.mopaas.com/"
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
})