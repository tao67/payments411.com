/*! webmention.js

Simple thing for embedding webmentions from webmention.io into a page, client-side.

(c)2018 fluffy (http://beesbuzz.biz)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

GitHub repo (for latest released versions, issue tracking, etc.):

	http://github.com/PlaidWeb/webmention.js

*/


(function() {
	var refurl = document.currentScript.getAttribute('data-page-url') || window.location.href.replace(/#.*$/,'');
	var containerID = document.currentScript.getAttribute('data-id') || "webmentions";
	var textMaxWords = document.currentScript.getAttribute('data-wordcount');

	var reactTitle = {
		'in-reply-to': 'replied',
		'like-of': 'liked',
		'repost-of': 'reposted',
		'bookmark-of': 'bookmarked',
		'mention-of': 'mentioned',
		'rsvp': 'RSVPed',
		'follow-of': 'followed',
	};

	var reactEmoji = {
		'in-reply-to': '💬',
		'like-of': '❤️',
		'repost-of': '🔄',
		'bookmark-of': '⭐️',
		'mention-of': '💬',
		'rsvp': '📅',
		'follow-of': '🐜',
	};

	var rsvpEmoji = {
		'yes': '✅',
		'no': '❌',
		'interested': '💡',
		'maybe': '💭'
	};

	function authorImage(r) {
		var who = (r.author && r.author.name ? r.author.name : r.url.split('/')[2]);
		var response = reactTitle[r['wm-property']] || 'reacted';
		var html = '<div class="p-author h-card">';

		//var html = '<a class="reaction" rel="nofollow" title="' + who + ' ' + response + '" href="' + r.url + '">';
		if (r.author && r.author.photo) {
			html += '<div class="img"><img src="' + r.author.photo + '" />';
		} else {
			html += '<div class="img"><img src="/img/no-avatar.png" />';
		}
		html += '<span class="emoji">' + (reactEmoji[r['wm-property']] || '💥') + '</span></div>';
		html += '<a class="p-name p-url" href="' + r.url + '">' + who + '</a>';
		if (r.author.url) {
			html += ' <a class="author_url" href="' + r.author.url + '">' + r.author.url.split('/')[2] + '</a>';
		}
		if (r.rsvp && rsvpEmoji[r.rsvp]) {
			//html += '<sub>' + rsvpEmoji[r.rsvp] + '</sub>';
		}
		html += '</div>';

		return html;
	}

	function reactImage(r) {
		var who = (r.author && r.author.name ? r.author.name : r.url.split('/')[2]);
		var response = reactTitle[r['wm-property']] || 'reacted';
		var html = '<div class="p-author h-card">';
		if (r.author && r.author.photo) {
			html += '<div class="img"><a rel="nofollow" title="' + who + ' ' + response + '" class="p-url" href="' + r.url + '"><img src="' + r.author.photo + '" />';
		} else {
			html += '<div class="img"><a rel="nofollow" title="' + who + ' ' + response + '" class="p-url" href="' + r.url + '"><img src="/img/no-avatar.png" />';
		}
		html += '<span class="emoji">' + (reactEmoji[r['wm-property']] || '💥') + '</span></a></div>';
		html += '</div>';
		return html;
	}

	// strip the protocol off a URL
	function stripurl(url) {
		return url.substr(url.indexOf('//'));
	}

	// Deduplicate multiple mentions from the same source URL
	function dedupe(mentions) {
		var filtered = [];
		var seen = {};

		mentions.forEach(function(r) {
			// Strip off the protocol (i.e. treat http and https the same)
			var source = stripurl(r.url);
			if (!seen[source]) {
				filtered.push(r);
				seen[source] = true;
			}
		});

		return filtered;
	}

	function formatComments(comments) {
		var html = '<h3>' + comments.length + ' Response' + (comments.length > 1 ? 's' : '') +
			'</h3><ul class="comments">';
		comments.forEach(function(c) {
			html += '<li>';
			html += authorImage(c);
			var linkclass, linktext;
			if (c.name) {
				linkclass = "name";
				linktext = c.name;
			} else if (c.content && c.content.text) {
				var words = c.content.text;
				if (textMaxWords) {
					var words = c.content.text.replace(/\s+/g,' ').split(' ', textMaxWords + 1);
					if (words.length > textMaxWords) {
						words[textMaxWords - 1] += '&hellip;';
						words = words.slice(0, textMaxWords);
					}
					words = words.join(' ');
				}

				linkclass = "text";
				linktext = words;
			} else {
				linkclass = "name";
				linktext = "(mention)";
			}

			html += '<div class="e-content p-name ' + linkclass + '">' + linktext + '</div>';
			html += '<div class="metaline"><a href="' + c.url + '" class="u-url"><time class="dt-published">' + c['wm-received'] + '</time></a></div>';
			html += '</li>';
		});
		html += '</ul>';

		return html;
	}

	function formatReactions(reacts) {
		var html = '<h3>' + reacts.length + ' Reaction' + (reacts.length > 1 ? 's' : '') +
			'</h3><ul class="reacts">';

		reacts.forEach(function(r) {
			html += '<li>' + reactImage(r) + '</li>';
		})
		html += '</ul>';
		return html;
	}

	function getData(url, callback) {
		if (fetch) {
			fetch(url).then(function(response) {
				if (response.status >= 200 && response.status < 300) {
					return Promise.resolve(response);
				} else {
					return Promise.reject(new Error(response.statusText));
				}
			}).then(function(response) {
				return response.json();
			}).then(callback).catch(function(error) {
				console.error("Request failed", error);
			});
		} else {
			var oReq = new XMLHttpRequest();
			oReq.onload = function(data) {
				callback(JSON.parse(data));
			}
			oReq.onerror = function(error) {
				console.error("Request failed", error);
			}
		}
	}

	window.addEventListener("load", function() {
		var container = document.getElementById(containerID);
		if (!container) {
			// no container, so do nothing
			return;
		}

		var pageurl = stripurl(refurl);

		var apiURL = 'https://webmention.io/api/mentions.jf2?per-page=100&target[]=' +
			encodeURIComponent('http:' + pageurl) +
			'&target[]=' + encodeURIComponent('https:' + pageurl);

		getData(apiURL, function(json) {
			html = '';

			var comments = [];
			var collects = [];

			var mapping = {
				"in-reply-to": comments,
				"like-of": collects,
				"repost-of": collects,
				"bookmark-of": collects,
				"mention-of": comments,
				"rsvp": comments
			};

			json.children.forEach(function(c) {
				var store = mapping[c['wm-property']];
				if (store) store.push(c);
			});

			// format the comment-type things
			if (comments.length > 0) {
				html += formatComments(dedupe(comments));
			}

			// format the other reactions
			if (collects.length > 0) {
				html += formatReactions(dedupe(collects));
			}

			container.innerHTML = html;
		});
	});

})();
