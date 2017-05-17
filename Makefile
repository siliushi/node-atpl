
SRC = $(shell find src -name "*.js" -type f)
UGLIFY_FLAGS = --no-mangle 

atpl.js: $(SRC)
	@node build/compile.js $^

atpl.min.js: atpl.js
	@uglifyjs $(UGLIFY_FLAGS) $< > $@ \
		&& du atpl.min.js \
		&& du atpl.js

clean:
	rm -f atpl.js
	rm -f atpl.min.js

.PHONY: test
