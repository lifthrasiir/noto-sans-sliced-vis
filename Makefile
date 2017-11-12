.PHONY: all
all: supplement.js sc.html

.PHONY: clean
clean:
	@rm -f notosansscsliced.css sc.css sc.json sc.html

notosansscsliced.css:
	wget https://fonts.googleapis.com/earlyaccess/notosansscsliced.css -O $@

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

