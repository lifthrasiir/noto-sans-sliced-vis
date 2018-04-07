# Sliced Webfont Visualization

* [Noto Sans SC Sliced Visualization][vis-sc]
* [Black Han Sans Visualization][vis-blackhan] (Updated 2018-04-07)

This is a visualization of the [Noto Sans SC Sliced] and [Black Han Sans] subset font families.

Google has experimented with experimental Simplified Chinese and Korean font family; it is identical to the original fonts, but it has been divided into about 100 subsets to avoid loading tons of unused glyphs not present in a given web page.

*Hmm, that sounds interesting.* The [author] thought. *So what's in those subsets?* This visualization is the answer.

[vis-sc]: https://lifthrasiir.github.io/noto-sans-sliced-vis/sc
[vis-blackhan]: https://lifthrasiir.github.io/noto-sans-sliced-vis/blackhan
[Noto Sans SC Sliced]: https://fonts.google.com/earlyaccess#Noto+Sans+SC+Sliced
[Black Han Sans]: https://fonts.google.com/specimen/Black+Han+Sans
[author]: https://github.com/lifthrasiir/

## How to use

Please note that the entire page loads lots of font files (~200 in total, as we use two weights) and it is probably not wise to load the page from the capped connection. It does work (somehow) in mobile browsers, as long as you have enough memory. It even works in MSIE (tested with 11), but it sometimes breaks Uniscribe and the entire desktop is left with broken font cache... You have been warned.

The hue indicates the subset group, #<!-- -->0 through the last group. The most important groups are either first groups or last groups; they contain almost 2&ndash;3,000 characters in daily use.

Hover over any character to highlight (i.e. embolden) its subset group. Click any character to lock or unlock the highlight. Double click any character to switch to the group view.

The navigation has two controls for filtering and sorting characters. The first, filtering control has three options:

* All characters
* *Simplified Chinese only:*
	* CJKV ideographs only (default)
	* [IICore] v2.2 subset only (a useful subset of CJKV ideographs for limited applications)
* *Korean only:*
	* Hangul jamos and syllables only (default)
	* [KS X 1001] Hangul syllables only (a more frequently used subset of Hangul syllables)

While IICore is now a bit dated (roughly based on Unicode 4.0 I think?), it shows the full variety of characters one can actually encounter from time to time.

The second, sorting control has two options:

* Sort by codepoints (and group by Unicode 10.0 blocks)
* Sort by font subset groups

[IICore]: https://en.wikipedia.org/wiki/International_Ideographs_Core
[KS X 1001]: https://en.wikipedia.org/wiki/KS_X_1001

## Technical notes

`make` to regenerate any data file. You will require `wget` and Python 2 (yes, I just wanted to get things done). It seems that the sliced webfonts are only available for particular agents and `Makefile` reflects that.

The JavaScript code is a good chunk of mess. As always I avoided using any library (and I ended up with two versions of binary search in a single file), though I did resort to [Web Font Loader] for loading webfonts. Have I said that I hate writing virtual scroll code?

The repository contains a dummy font called "X" which contains the X mark for every single character. The font was made from scratch, though I've consulted [tofudetector] to make sure that the format 13 `cmap` table is supported. `x.ttx.bz2` contains the original [TTX][fonttools] file used to generate the final font (and I sincerely hope an optimized TTX format for format 13 table).

You should reconsider your decision if you want to make use of this repository, but in any case, every non-generated file in this repository is put in the public domain (or [CC0] if the public domain is sadly not a thing in your country).

[Web Font Loader]: https://github.com/typekit/webfontloader/
[tofudetector]: https://github.com/santhoshtr/tofudetector/
[fonttools]: https://github.com/behdad/fonttools/
[CC0]: LICENSE.txt

