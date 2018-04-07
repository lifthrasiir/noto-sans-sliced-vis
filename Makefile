.PHONY: all
all: supplement.js sc.html blackhan.html

.PHONY: clean
clean:
	-rm -f notosansscsliced.css blackhansans.css sc.css sc.json sc.html blackhan.css blackhan.json blackhan.html

notosansscsliced.css:
	wget https://fonts.googleapis.com/earlyaccess/notosansscsliced.css -O $@

blackhansans.css:
	wget -U 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:60.0) Gecko/20100101 Firefox/60.0' https://fonts.googleapis.com/css?family=Black+Han+Sans:400 -O $@

Blocks.txt:
	wget http://ftp.unicode.org/Public/10.0.0/ucd/Blocks.txt -O $@

IRGN1067R2_IICore22_MappingTable.txt:
	wget http://appsrv.cse.cuhk.edu.hk/~irg/irg/IICore/IRGN1067R2_IICore22_MappingTable.txt -O $@

supplement.js: Blocks.txt IRGN1067R2_IICore22_MappingTable.txt generate.py
	python generate.py supplement $@ Blocks.txt IRGN1067R2_IICore22_MappingTable.txt

sc.css sc.json: notosansscsliced.css generate.py
	python generate.py data sc.css sc.json < $<

sc.html: sc.json sc.tmpl.html
	sed -e '/^\/\/ DATA HERE/ {' -e 'r sc.json' -e 'd;}' sc.tmpl.html > sc.html

blackhan.css blackhan.json: blackhansans.css generate.py
	python generate.py data blackhan.css blackhan.json < $<

blackhan.html: blackhan.json blackhan.tmpl.html
	sed -e '/^\/\/ DATA HERE/ {' -e 'r blackhan.json' -e 'd;}' blackhan.tmpl.html > blackhan.html

