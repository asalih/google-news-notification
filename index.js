var loadDate, lastDate;
var notifyUrls = [];
var notID = 0;
var editionBox;
var editionBoxValue;
var html;
var news;
var intervals = [];
var founded = [];
var queued = [];
var topics = [];
var searchMode = false;
var feedState = "on";


onload = function () {
    chrome.app.window.current().resizeTo(254, chrome.app.window.current().innerBounds.height);

    var now = new Date();
    loadDate = now.getTime() + now.getTimezoneOffset();
    lastDate = now.getTime() + now.getTimezoneOffset();
    editionBox = document.getElementById("editions");
    html = document.getElementById("html");
    news = document.getElementById("news");

    document.getElementById("newsSearch").onkeyup = function (e) {
        var news = document.getElementById("news").childNodes;
        var searchItem = document.getElementById("newsSearch").value;
        if (searchItem != "") {
            searchMode = true;
        }
        else {
            searchMode = false;
        }
        for (var i = 0; i < news.length; i++) {
            var elem = news[i];
            var noMatch = (elem.textContent || elem.innerText || '').toLowerCase().indexOf((searchItem || "").toLowerCase()) == -1;

            if (elem != undefined && elem.style != undefined) {
                if (noMatch) {
                    elem.style.display = "none";

                }
                else {
                    elem.style.display = "block";
                }
            }
        }
    }

    document.getElementById("backTo").onclick = function () {
        document.getElementById("htmlHolder").style.display = "none";
        editionBox.style.display = "block";
    }

    document.getElementById("toggleFeed").onclick = function () {
        if (feedState == "on") {
            feedState = "off";
            this.childNodes[0].src = "/images/ressgo.png";
            this.childNodes[0].setAttribute("title", "Start feeding");
            this.childNodes[0].setAttribute("alt", "Start feeding");
        }
        else {
            feedState = "on";
            this.childNodes[0].src = "/images/rssstop.png";
            this.childNodes[0].attributes["title"] = "Stop feeding";
            this.childNodes[0].attributes["alt"] = "Stop feeding";
        }
    }

    document.getElementById("closeWindow").onclick = function () {
        chrome.app.window.current().close();
    }

    document.getElementById("minimizeWindow").onclick = function () {
        chrome.app.window.current().minimize();
    }

    chrome.notifications.onClicked.addListener(function (notificationId, byUser) {
        var url = decodeHtml(notifyUrls[notificationId]);
        //chrome.app.window.create(url);
        //chrome.app.window.open(url);
        window.open(url);
    });

    getEditions("https://news.google.com");

};

function setEdition(topic, i) {
    var edUrl = "https://news.google.com/news?pz=1&cf=all&ned=" + editionBoxValue;
    if (topic != undefined) {
        edUrl += "&topic=" + topic;
    }

    var lim = 10000;
    if (i != undefined) {
        lim += i * 300;
    }
    edUrl += "&output=rss";
    var intID = setInterval(function () { if (feedState == "on") { xhr(edUrl, false, topic) } }, lim);
    intervals.push(intID);
    xhr(edUrl, true, topic);
    document.getElementsByClassName("col3")[0].style.display = "block";
    chrome.app.window.current().resizeTo(651, chrome.app.window.current().innerBounds.height);

    return intID;

}

function xhr(url, loading, topic) {
    var timeout = 2000;
    var xhr = new window.XMLHttpRequest();
    xhr.ontimeout = function () {
        console.error("The request for " + url + " timed out.");
    };
    xhr.onerror = function () {
        console.error("error: " + xhr.statusText);
    }
    xhr.onload = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var items = xhr.responseXML.getElementsByTagName("item");
                var found = false;
                for (var i = 0; i < items.length; i++) {
                    var link = items[i].getElementsByTagName("link")[0].innerHTML;
                    link = link.substring(link.indexOf("url="));
                    if (queued.indexOf(link) < 0) {
                        if (!loading) {
                            founded.push({ xml: items[i], topic: topic });
                        }
                        queued.push(link);
                        addNews(items[i], topic)
                    }
                }
            } else {
                console.error(xhr.statusText);
            }
        }
    };
    xhr.open("GET", url, true);
    xhr.timeout = timeout;
    xhr.send(null);


}

function doNotify(image, title, link, topic) {
    var spl = title.split(" - ");
    var msg = spl.length > 1 ? spl[1] : "";
    if (msg != "") {
        msg += " | " + topics[topic];
    }
    var options = {
        type: "basic",
        title: spl[0],
        message: msg,
        expandedMessage: title,
        priority: 2
    };

    if (image.indexOf("//") == 0) {
        image = "http:" + image;
    }

    loadAndNotify(image, options, link);

}

function decodeHtml(html) {
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

function loadAndNotify(url, opt, link) {

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.onload = function (e) {
        opt.iconUrl = window.URL.createObjectURL(this.response);
        var notid = "id" + notID++;
        chrome.notifications.create(notid, opt, creationCallback);
        notifyUrls[notid] = link;
    };

    xhr.send();
}

function creationCallback(notID) {

    setTimeout(function () {
        chrome.notifications.clear(notID, function (wasCleared) {

        });
    }, 6500);

}

function getEditions(url) {
    var pattern = /(<div)\s+(?:[^>]*?\s+)?(id="appbar")(\s+(?:[^>]*?\s+)?)(.*)/g;
    var editions = /(<div)\s+(?:[^>]*?\s+)?(class="goog-menuitem\s+nedid-(.*?)">(.*?)(<\/div>))/g;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = function (e) {

        var appBar = pattern.exec(this.response);

        var option = document.createElement("h5");
        option.innerHTML = "Select edition";
        var img = document.createElement("img");
        img.src = "/images/right-arrow8.png";
        img.id = "goForward";
        img.onclick = function () {
            editionBox.style.display = "none";
            document.getElementById("htmlHolder").style.display = "block";
        }
        option.appendChild(img);

        editionBox.appendChild(option);
        do {
            var result = editions.exec(appBar[0]);
            if (result != null) {
                var option = document.createElement("a");
                option.href = "#";
                option.setAttribute("data-opt", result[3]);
                option.onclick = function () {
                    editionBoxValue = this.attributes["data-opt"].value;
                    getTopics(editionBoxValue);
                }
                option.innerHTML = result[4];

                var div = document.createElement("div");
                div.appendChild(option);

                editionBox.appendChild(div);

            }

        } while (result != null);
    };

    xhr.send();
}

function getTopics(w) {
    for (var i = 0; i < intervals.length; i++) {
        window.clearInterval(intervals[i]);
    }
    intervals = [];
    topics = [];

    var sections = /(<li)\s+(?:[^>]*?\s+)?(class="nav-item\s+nv-(.*?):(.*?)">(.*?)(<\/li>))/g;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', "https://news.google.com/news?pz=1&cf=all&ned=" + w);
    xhr.onload = function (e) {
        html.innerHTML = "";
        news.innerHTML = "";
        founded = [];
        queued = [];
        
        document.getElementById("toggleHolder").style.display = "block";

        //var navBar = sPattern.exec(this.response);
        var added = [];
        do {
            var result = sections.exec(this.response);
            if (result != null) {
                var holdH = result[5];
                var hrefRes = /<(a)\s+(?:[^>]*?\s+)?(href)=('|\"|)(.*?topic=(.*?))('|\"| )/g.exec(holdH);
                if (hrefRes != null && added.indexOf(hrefRes[4]) < 0) {
                    var chb = document.createElement("input");
                    var div = document.createElement("div");
                    var label = document.createElement("label");

                    var top = hrefRes[5];
                    var topText = /(>)(.*?)(<\/a)/g.exec(holdH)[2];

                    chb.type = "checkbox";
                    chb.id = "chb_" + top;
                    added.push(hrefRes[4]);
                    chb.setAttribute("data-url", hrefRes[4]);
                    chb.setAttribute("data-topic", top)
                    chb.checked = true;
                    chb.className = "sections checkLabelBox";
                    chb.onchange = toggleTrack;

                    label.setAttribute("for", "chb_" + top)

                    label.appendChild(document.createTextNode(topText));
                    label.className = "checkLabel";

                    div.appendChild(chb);
                    div.appendChild(label);
                    html.appendChild(div);

                    topics[top] = topText;
                }
            }

        } while (result != null);

        var inputs = document.getElementsByClassName("sections");
        editions.style.display = "none";
        document.getElementById("htmlHolder").style.display = "block";
        document.getElementById("goForward").style.display = "inline-block";

        for (var i = 0; i < inputs.length; i++) {
            var intID = setEdition(inputs[i].attributes["data-topic"].value, i);
            inputs[i].setAttribute("data-interval", intID);
            inputs[i].setAttribute("data-i", i);
        }


        setInterval(function () {
            for (var i = 0; i < founded.length; i++) {
                var xml = founded[i].xml;
                var html = decodeHtml(xml.getElementsByTagName("description")[0].innerHTML);
                var patt = /(img)( src| src )=(\"|')(?!java|data|<%)(.*?)(\"|'|,)/g
                var src = patt.exec(html);
                if (src != null) {
                    doNotify(src[4], xml.getElementsByTagName("title")[0].innerHTML, xml.getElementsByTagName("link")[0].innerHTML, founded[i].topic);
                }
            }
            founded = [];
        }, 130)
    };

    xhr.send();
}

function toggleTrack() {
    if (!this.checked) {
        var intID = this.attributes["data-interval"].value;
        var index = intervals.indexOf(parseInt(intID));
        if (index > -1) {
            clearInterval(intID);
            intervals.splice(index, 1);
        }
    }
    else {
        var intId = setEdition(this.attributes["data-topic"].value, parseInt(this.attributes["data-i"].value));
        this.attributes["data-interval"].value = intId;
    }
}

function addNews(node, topic) {
    var html = decodeHtml(node.getElementsByTagName("description")[0].innerHTML);
    var patt = /(img)( src| src )=(\"|')(?!java|data|<%)(.*?)(\"|'|,)/g
    var src = patt.exec(html);
    if (src != null) {
        //doNotify(src[4], , xml.getElementsByTagName("link")[0].innerHTML, founded[i].topic);
        var title = node.getElementsByTagName("title")[0].innerHTML;
        var spl = title.split(" - ");
        var msg = spl.length > 1 ? spl[1] : "";
        if (msg != "") {
            msg += " | " + topics[topic];
        }
        var options = {
            type: "basic",
            title: spl[0],
            message: msg,
            expandedMessage: title,
            priority: 2
        };

        var image = src[4];
        if (image.indexOf("//") == 0) {
            image = "http:" + image;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', image);
        xhr.responseType = 'blob';
        xhr.onload = function (e) {
            var imgs = window.URL.createObjectURL(this.response);
            var anchor = document.createElement("a");
            anchor.innerHTML = "<div><div style='width:80px;float:left;'><img src='" + imgs + "' style='width:80px;' /></div><div><p>" + spl[0] + "</p><span>" + msg + "</span></div></div><div class='clearfix'></div>";
            anchor.href = decodeHtml(node.getElementsByTagName("link")[0].innerHTML);
            anchor.target = "_blank;"
            if (searchMode) {
                anchor.style.display = "none";
            }
            news.insertBefore(anchor, news.childNodes[0]);
        };

        xhr.send();


    }


}
