# Peast 1.17.6 (BSD-3-Clause)

Unmodified runtime `lib/` and LICENSE from the official v1.17.6 tag:
https://github.com/mck89/peast/tree/v1.17.6

Archive: https://codeload.github.com/mck89/peast/tar.gz/refs/tags/v1.17.6
SHA256: `929afed833ef606714dcd3a82aaf29cc333421005ca4b4967451019ba0daab78`

Only `autoload.php` is project-authored. No Composer executable is needed on MODX.
The component already requires mbstring. Used only for administrative builds:
ES2020 parser -> AST -> Compact renderer -> parse validation. No renaming,
transpilation or regex minification. The Node/esbuild release builder is retained.
