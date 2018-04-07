;(function() {
	function decompress(groups) {
		groups = window.atob(groups);
		var data = [], last = -1;
		for (var i = 0; i < groups.length; ++i) {
			var c = groups.charCodeAt(i);
			if (c < 128) {
				data.push(last = c);
			} else {
				for (var count = c - 126; count > 0; --count) {
					data.push(last);
				}
			}
		}
		return data;
	}

	function decompress_hybrid_delta(delta) {
		var last = 0;
		var ret = {};
		for (var i = 0; i < delta.length; ++i) {
			var d = delta[i];
			if (typeof d === 'string') {
				d = decompress(d);
				for (var j = 0; j < d.length; ++j) ret[last += d[j]] = true;
			} else {
				ret[last += d] = true;
			}
		}
		return ret;
	}

	function isideograph(c) {
		return (0x3400 <= c && c < 0x4dc0) || (0x4e00 <= c && c < 0xa000) || (0x20000 <= c && c < 0x30000);
	}

	function ishangul(c) {
		return (0x1100 <= c && c < 0x1200) || (0x3130 <= c && c < 0x3190) || (0xa960 <= c && c < 0xa980) || (0xac00 <= c && c < 0xd800);
	}

	function fromcharcode(c) {
		if (c < 0x10000) return String.fromCharCode(c);
		c -= 0x10000;
		return String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 1023));
	}

	function uplus(c) {
		var s = c.toString(16).toUpperCase();
		while (s.length < 4) s = '0' + s;
		return 'U+' + s;
	}

	function uniblockidx(c) {
		var lo = 0, hi = uniblocks.length;
		while (lo < hi) {
			// split [lo, hi] into two ranges [lo, mid - 1] and [mid, hi].
			// when hi + 1 = lo, mid = hi and two ranges degenerate into [lo, lo] and [hi, hi].
			var mid = hi - ((hi - lo) >>> 1);
			if (c < uniblocks[mid][0]) {
				hi = mid - 1;
			} else {
				lo = mid;
			}
		}
		return lo;
	}

	function parse() {
		var data = JSON.parse(document.querySelector('script[type="application/json"]').textContent);

		var families = [];
		var familyseen = {};
		var teststrings = {};
		var codepoints = [];
		for (var i = 0; data.ranges[i]; ++i) {
			var start = data.ranges[i].start;
			var end = data.ranges[i].end;
			var groups = decompress(data.ranges[i].groups);
			for (var j = start; j <= end; ++j) {
				var g = groups[j-start];
				if (!familyseen[g]) {
					familyseen[g] = true;
					families.push(data.name + ' g' + g + ':n3,n5');
				}
				teststrings[data.name + ' g' + g] += fromcharcode(j);
				codepoints.push({c: j, g: g});
			}
		}

		var iicore = decompress_hybrid_delta(iicoredelta);
		var ksx1001 = decompress_hybrid_delta(ksx1001delta);

		return {
			name: data.name,
			csspath: data.csspath,
			ngroups: data.ngroups,
			families: families,
			teststrings: teststrings,
			codepoints: codepoints,
			iicore: iicore,
			ksx1001: ksx1001
		};
	}

	function generatecss(name, ngroups) {
		var convertedname = name.replace(/[ _]/g, '').toLowerCase();
		var style = [], hstyle = [];
		for (var i = 0; i < ngroups; ++i) {
			var hue = (i / ngroups * 360).toFixed(2);
			hstyle.push('table.g' + i + ' td.g' + i);
			style.push('td.g' + i + '{font-family:"' + name + ' g' + i + '",X;background-color:hsl(' + hue + ',40%,50%,0.1)}');
			style.push('td.g' + i + ':hover{box-shadow:0 0 5px hsl(' + hue + ',20%,30%)}');
			style.push('table.locked.g' + i + ' td.g' + i + '{background-color:hsl(' + hue + ',40%,50%);color:white!important}');
			style.push('table.locked.g' + i + ' td.g' + i + ':hover{box-shadow:inset 0 0 5px white!important}');
			style.push('html.wf-' + convertedname + 'g' + i + '-n3-active body:not(.g' + i + ') td.g' + i + ',html.wf-' + convertedname + 'g' + i + '-n5-active body.g' + i + ' td.g' + i + '{color:hsl(' + hue + ',40%,50%);background-image:none}');
		}
		return style.join('') + hstyle.join(',') + '{font-weight:500}';
	}

	// filter: function(codepoint, group) => boolean
	// group: function(codepoint, group) => primary group value
	// title: function(group value) => title
	function rebuildrows(table, filter, group, title, colsperrow) {
		table.innerHTML = '';

		var filtered = [];
		for (var i = 0; i < parsed.codepoints.length; ++i) {
			var cp = parsed.codepoints[i];
			cp.k = group(cp.c, cp.g);
			if (filter(cp.c, cp.g)) filtered.push(cp);
		}
		var filteredlen = filtered.length;
		filtered.sort(function(a, b) { return a.k < b.k ? -1 : a.k > b.k ? 1 : a.c - b.c; });
		for (var i = 0; i < parsed.codepoints.length; ++i) {
			var cp = parsed.codepoints[i];
			if (!filter(cp.c, cp.g)) filtered.push(cp);
		}
		parsed.codepoints = filtered;

		function titleandcount(k, count) {
			return title(k) + ' (' + count.toLocaleString() + ')';
		}

		var rows = [];
		var lastk = null;
		var lasttitle = null;
		var lastcount = 0;
		for (var i = 0, j; i < filteredlen; ) {
			var curk = filtered[i].k;
			for (j = 1; j < colsperrow && i + j < filteredlen; ++j) {
				if (filtered[i + j].k !== curk) break;
			}

			// append a title row if needed
			if (lastk !== curk) {
				if (lasttitle) lasttitle.childNodes[0].textContent = titleandcount(lastk, lastcount);
				lastk = curk;
				lastcount = 0;

				var row = document.createElement('tr');
				row.className = 'title';
				row.innerHTML = '<td colspan=' + colsperrow + '></td>';
				rows.push({e: row, fixed: true, k: curk});
				table.appendChild(row);
				lasttitle = row;
			}

			var row = document.createElement('tr');
			row.className = 'virtual';
			row.innerHTML = '<td colspan=' + colsperrow + '></td>';
			rows.push({e: row, fixed: false, lo: i, hi: i + j});
			table.appendChild(row);

			i += j;
			lastcount += j;
		}

		if (lasttitle) lasttitle.childNodes[0].textContent = titleandcount(lastk, lastcount);
		return rows;
	}

	// finds a row index lo <= i <= hi that row[i].offsetTop <= y < row[i].offsetBottom.
	// returns lo or hi instead when it goes beyond the entire table.
	function searchrow(rows, y, lo, hi) {
		while (lo < hi) {
			// split [lo, hi] into two ranges [lo, mid - 1] and [mid, hi].
			// when hi + 1 = lo, mid = hi and two ranges degenerate into [lo, lo] and [hi, hi].
			var mid = hi - ((hi - lo) >>> 1);
			if (y < rows[mid].e.offsetTop) {
				hi = mid - 1;
			} else {
				lo = mid;
			}
		}
		return lo;
	}

	function populaterow(row) {
		if (row.fixed) return;
		var html = [];
		for (var i = row.lo; i < row.hi; ++i) {
			var cp = parsed.codepoints[i];
			html.push('<td class=g' + cp.g + ' title="' + uplus(cp.c) + ' (group ' + cp.g +')">' + fromcharcode(cp.c) + '</td>');
		}
		row.e.innerHTML = html.join('');
		row.e.className = '';
	}

	function flushrow(row) {
		if (row.fixed) return;
		row.e.innerHTML = '<td colspan=' + (row.hi - row.lo) + '></td>';
		row.e.className = 'virtual';
	}

	// assumes no position: fixed
	function globaloffsettop(e) {
		var y = e.offsetTop;
		while (e = e.offsetParent) y += e.offsetTop;
		return y;
	}

	function refreshvisibility(rows, prev) {
		prev = prev || {lo: 0, hi: -1}; // i.e. empty area

		var tabletop = globaloffsettop(table);
		var scrolltop = window.pageYOffset;
		var scrollbottom = scrolltop + document.documentElement.clientHeight;
		var buffer = Math.max(document.documentElement.clientHeight, 400);

		var lo = searchrow(rows, scrolltop - tabletop - buffer, 0, rows.length - 1);
		var hi = searchrow(rows, scrollbottom - tabletop + buffer, lo, rows.length - 1);

		if (prev.lo !== lo || prev.hi !== hi) {
			// calculate intersection
			for (var i = prev.lo; i <= prev.hi; ++i) {
				if (i < lo || hi < i) flushrow(rows[i]);
			}
			for (var i = lo; i <= hi; ++i) {
				if (i < prev.lo || prev.hi < i) populaterow(rows[i]);
			}
			return {lo: lo, hi: hi};
		} else {
			return prev;
		}
	}

	var parsed = parse();

	// initialize webfontloader
	window.WebFontConfig = {
		// hack to use early access fonts
		custom: { families: parsed.families, testStrings: parsed.teststrings, urls: [parsed.csspath] },
		timeout: 3600000 // it takes a lot of time to load all the fonts, so allow for a lot of time
	};
	var wf = document.createElement('script'), s = document.scripts[0];
	wf.src = 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js';
	wf.async = true;
	s.parentNode.insertBefore(wf, s);

	document.write('<style>' + generatecss(parsed.name, parsed.ngroups) + '</style>');

	var filters = {
		all: function() { return true; },
		ideograph: function(c) { return isideograph(c); },
		iicore: function(c) { return parsed.iicore[c]; },
		hangul: function(c) { return ishangul(c); },
		ksx1001: function(c) { return parsed.ksx1001[c]; }
	};
	var sortgroups = {
		codepoint: {
			index: function(c) { return uniblockidx(c); },
			name: function(k) { return uniblocks[k][1] || 'Unassigned'; }
		},
		group: {
			index: function(c, g) { return g; },
			name: function(k) { return 'Font subset group #' + k; }
		}
	};

	var filterselect = document.getElementById('filter');
	var sortgroupselect = document.getElementById('sortgroup');

	var table = document.createElement('table');
	document.body.appendChild(table);

	var filter;
	var sortgroup;
	var rows;
	var prev;
	var highlighted = '';
	var locked = false;

	function updaterows() {
		if (filter === filterselect.value && sortgroup === sortgroupselect.value) return;
		filter = filterselect.value;
		sortgroup = sortgroupselect.value;
		var sg = sortgroups[sortgroup];
		rows = rebuildrows(table, filters[filter], sg.index, sg.name, 32);
		prev = refreshvisibility(rows, null);
	}

	function scrolltocurrentgroup() {
		if (!highlighted) return;
		var k = +highlighted.substr(1); // className g3 -> group value 3
		for (var i = 0; rows[i]; ++i) {
			if (rows[i].k === k) {
				window.scrollTo(0, globaloffsettop(table) + rows[i].e.offsetTop - 48);
				break;
			}
		}
	}

	updaterows();
	filterselect.onchange = sortgroupselect.onchange = function() {
		var prevsortgroup = sortgroup;
		updaterows();
		if (prevsortgroup !== sortgroup && sortgroup === 'group' && locked) {
			scrolltocurrentgroup();
		}
	};

	// wrap around requestAnimationFrame as onscroll can be called multiple times per frame
	var raffired = false;
	(window.onscroll = window.onresize = function() {
		if (raffired) return;
		raffired = true;
		window.requestAnimationFrame(function() {
			raffired = false;
			prev = refreshvisibility(rows, prev);
		});
	})();

	table.onclick = function(e) {
		var target = e.target;
		if (!target || target.tagName !== 'TD' || target.className[0] !== 'g') return;
		if (highlighted === target.className) {
			locked = !locked;
		} else {
			highlighted = target.className;
		}
		table.className = highlighted + (locked ? ' locked' : '');
	};
	table.ondblclick = function(e) {
		var target = e.target;
		if (!target || target.tagName !== 'TD' || target.className[0] !== 'g') return;
		// force update the rows and change the selection
		sortgroupselect.value = 'group';
		highlighted = target.className;
		table.className = highlighted + (locked ? ' locked' : '');
		updaterows();
		scrolltocurrentgroup();
	};
	table.onmouseover = function(e) {
		if (locked) return;
		var target = e.target;
		if (!target || target.tagName !== 'TD') return;
		if (highlighted !== target.className) {
			highlighted = (target.className[0] === 'g' ? target.className : '');
			table.className = highlighted + (locked ? ' locked' : '');
		}
	};
	table.onmouseleave = function(e) {
		if (!locked && highlighted) {
			highlighted = '';
			table.className = '';
		}
	};
})()
